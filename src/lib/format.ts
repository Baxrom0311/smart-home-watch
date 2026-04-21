// Formatting helpers for Uzbek-friendly UI.

const UZ_MONTHS = [
  "yanv",
  "fev",
  "mar",
  "apr",
  "may",
  "iyun",
  "iyul",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function remapLegacyDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const original = typeof value === "string" ? new Date(value) : new Date(value);
  if (isNaN(original.getTime())) return null;

  const now = new Date();
  if (original.getFullYear() >= now.getFullYear() - 1) {
    return original;
  }

  const currentYearCandidate = new Date(original);
  currentYearCandidate.setFullYear(now.getFullYear());

  if (currentYearCandidate.getTime() <= now.getTime()) {
    return currentYearCandidate;
  }

  const previousYearCandidate = new Date(original);
  previousYearCandidate.setFullYear(now.getFullYear() - 1);
  return previousYearCandidate;
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = remapLegacyDate(value);
  if (!d) return "—";
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatShortDateTime(value?: string | Date | null): string {
  const d = remapLegacyDate(value);
  if (!d) return "—";
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()}/${d.getMonth() + 1} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = remapLegacyDate(value);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatNumber(value?: number | null, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatInt(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}
