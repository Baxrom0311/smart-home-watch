import axios, { AxiosError } from "axios";
import type {
  Anomaly,
  AnomalyDetectionRequest,
  AnomalyDetectionResponse,
  AnomalyListResponse,
  AnomalyStats,
  DashboardSummary,
  DataListResponse,
  DataSource,
  DataStats,
  ModelStatus,
  SampleDataset,
  SampleImportRequest,
  SensorData,
  TrainingRequest,
  TrainingResponse,
  UploadResponse,
} from "./types";

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

// The configured base may end with /api or be a host root. We normalize so we can call /api/* and /health uniformly.
const root = baseURL.replace(/\/api\/?$/, "").replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: root || "",
  timeout: 60000,
});

export function getApiErrorMessage(err: unknown, fallback = "Noma'lum xatolik yuz berdi"): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<any>;
    const detail = ax.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "string") return first;
      if (first?.msg) return String(first.msg);
    }
    if (ax.message) return ax.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

async function downloadBlob(url: string, params: Record<string, unknown>, fallbackName: string) {
  const res = await apiClient.get(url, { params, responseType: "blob" });
  const cd = res.headers["content-disposition"] as string | undefined;
  let filename = fallbackName;
  if (cd) {
    const m = /filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i.exec(cd);
    if (m?.[1]) filename = decodeURIComponent(m[1]);
  }
  const blob = new Blob([res.data], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Defensive helpers — backend may occasionally return wrapped or unexpected shapes.
function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

function toListResponse<T>(data: unknown): { total: number; items: T[] } {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const items = toArray<T>(obj.items ?? data);
    const total = typeof obj.total === "number" ? obj.total : items.length;
    return { total, items };
  }
  const items = toArray<T>(data);
  return { total: items.length, items };
}

function normalizeStatus(data: any): ModelStatus {
  return {
    state: data?.state ?? "idle",
    sensor_type: data?.sensor_type ?? null,
    source_file: data?.source_file ?? null,
    message: data?.message ?? null,
    started_at: data?.started_at ?? null,
    finished_at: data?.finished_at ?? null,
    training_id: data?.training_id ?? null,
    progress: typeof data?.progress === "number" ? data.progress : 0,
    current_epoch: data?.current_epoch ?? null,
    total_epochs: data?.total_epochs ?? null,
    train_loss: data?.train_loss ?? null,
    val_loss: data?.val_loss ?? null,
    loss_history: Array.isArray(data?.loss_history) ? data.loss_history : [],
    val_loss_history: Array.isArray(data?.val_loss_history) ? data.val_loss_history : [],
  };
}

export const api = {
  // Health
  health: () => apiClient.get<{ status?: string }>("/health").then((r) => r.data),

  // Data
  listSamples: () =>
    apiClient.get("/api/data/samples").then((r) => toArray<SampleDataset>(r.data)),
  importSample: (body: SampleImportRequest) =>
    apiClient.post<UploadResponse>("/api/data/import-sample", body).then((r) => r.data),
  uploadCsv: (file: File, sensor_type?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (sensor_type) fd.append("sensor_type", sensor_type);
    return apiClient
      .post<UploadResponse>("/api/data/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
  listData: (params: { sensor_type?: string; source_file?: string; limit?: number; offset?: number } = {}) =>
    apiClient.get("/api/data/list", { params }).then((r) => toListResponse<SensorData>(r.data)),
  stats: (params: { sensor_type?: string; source_file?: string } = {}) =>
    apiClient.get<DataStats>("/api/data/stats", { params }).then((r) => r.data),
  sources: (sensor_type?: string) =>
    apiClient
      .get("/api/data/sources", { params: sensor_type ? { sensor_type } : {} })
      .then((r) => toArray<DataSource>(r.data)),
  sensors: () => apiClient.get("/api/data/sensors").then((r) => toArray<string>(r.data)),
  deleteSource: (source_file: string) =>
    apiClient.delete(`/api/data/source/${encodeURIComponent(source_file)}`).then((r) => r.data),
  deleteSensor: (sensor_type: string) =>
    apiClient.delete(`/api/data/${encodeURIComponent(sensor_type)}`).then((r) => r.data),
  exportData: (params: { sensor_type?: string; source_file?: string } = {}) =>
    downloadBlob("/api/data/export", params, "sensor_data.csv"),

  // Model
  train: (body: TrainingRequest) =>
    apiClient.post<ModelStatus>("/api/model/train", body).then((r) => normalizeStatus(r.data)),
  status: () => apiClient.get<ModelStatus>("/api/model/status").then((r) => normalizeStatus(r.data)),
  history: () =>
    apiClient.get("/api/model/history").then((r) => toArray<TrainingResponse>(r.data)),
  historyDetail: (id: number) =>
    apiClient.get<TrainingResponse>(`/api/model/history/${id}`).then((r) => r.data),

  // Anomaly
  detect: (body: AnomalyDetectionRequest) =>
    apiClient.post<AnomalyDetectionResponse>("/api/anomaly/detect", body).then((r) => r.data),
  results: (params: { sensor_type?: string; source_file?: string; limit?: number; offset?: number } = {}) =>
    apiClient.get("/api/anomaly/results", { params }).then((r) => toListResponse<Anomaly>(r.data)),
  resultDetail: (id: number) => apiClient.get<Anomaly>(`/api/anomaly/results/${id}`).then((r) => r.data),
  anomalyStats: () => apiClient.get<AnomalyStats>("/api/anomaly/stats").then((r) => r.data),
  exportAnomalies: (params: { sensor_type?: string; source_file?: string; anomaly_only?: boolean } = {}) =>
    downloadBlob("/api/anomaly/export", params, "anomalies.csv"),

  // Dashboard
  dashboard: () => apiClient.get<DashboardSummary>("/api/dashboard/summary").then((r) => r.data),

  // Re-exports for convenience
  _types: null as unknown as { SensorData: SensorData },
};

export type Api = typeof api;
