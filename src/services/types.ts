// Types mirroring the FastAPI OpenAPI schema.

export interface SampleDataset {
  file_name: string;
  sensor_type: string;
  size_bytes: number;
}

export interface SampleImportRequest {
  file_name: string;
  sensor_type?: string | null;
}

export interface UploadResponse {
  message: string;
  sensor_type: string;
  source_file: string;
  rows_inserted: number;
}

export interface SensorData {
  id: number;
  timestamp: string;
  value: number;
  sensor_type: string;
  source_file: string;
  created_at: string;
}

export interface DataListResponse {
  total: number;
  items: SensorData[];
}

export interface DataSource {
  source_file: string;
  sensor_type: string;
  rows_count: number;
}

export interface DataStats {
  count: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
}

export interface TrainingRequest {
  sensor_type: string;
  source_file?: string | null;
  epochs?: number;
  batch_size?: number;
  learning_rate?: number;
  window_size?: number;
}

export interface TrainingResponse {
  id: number;
  model_name: string;
  sensor_type: string;
  source_file: string | null;
  status: string;
  epochs: number;
  batch_size: number;
  learning_rate: number;
  window_size: number;
  train_loss: number;
  val_loss: number | null;
  loss_history?: number[];
  val_loss_history?: number[];
  threshold: number;
  accuracy: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1: number | null;
  model_path: string | null;
  scaler_path: string | null;
  created_at: string;
}

export interface ModelStatus {
  state: string; // idle | running | completed | failed
  sensor_type?: string | null;
  source_file?: string | null;
  message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  training_id?: number | null;
  progress: number;
  current_epoch?: number | null;
  total_epochs?: number | null;
  train_loss?: number | null;
  val_loss?: number | null;
  loss_history: number[];
  val_loss_history: number[];
}

export interface AnomalyDetectionRequest {
  sensor_type: string;
  source_file?: string | null;
  training_id?: number | null;
}

export interface AnomalyDetectionResponse {
  sensor_type: string;
  source_file?: string | null;
  training_id: number;
  threshold: number;
  total_windows: number;
  anomalies_detected: number;
}

export interface Anomaly {
  id: number;
  sensor_data_id: number;
  training_history_id: number | null;
  anomaly_score: number;
  reconstructed_value: number | null;
  is_anomaly: boolean;
  threshold: number;
  detected_at: string;
  timestamp: string;
  value: number;
  sensor_type: string;
  source_file: string;
}

export interface AnomalyListResponse {
  total: number;
  items: Anomaly[];
}

export interface AnomalyStats {
  total_records: number;
  total_anomalies: number;
  anomaly_rate: number;
  by_sensor: Record<string, number>;
}

export interface LatestModelSummary {
  id: number;
  name: string;
  accuracy: number | null;
  f1: number | null;
  created_at: string;
}

export interface DashboardSummary {
  total_sensor_data: number;
  total_anomalies: number;
  anomaly_percentage: number;
  sensor_types: string[];
  latest_anomaly: string | null;
  latest_model: LatestModelSummary | null;
}
