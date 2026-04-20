import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateTime, formatNumber } from "@/lib/format";

const grid = "hsl(30 18% 86%)";
const axis = "hsl(222 12% 42%)";

const tooltipStyle = {
  background: "hsl(40 40% 99%)",
  border: "1px solid hsl(30 18% 86%)",
  borderRadius: "10px",
  fontSize: "12px",
  padding: "8px 10px",
  boxShadow: "0 8px 24px -8px hsl(30 30% 20% / 0.15)",
};

interface SeriesPoint {
  ts: string | number;
  value: number;
  recon?: number | null;
  isAnomaly?: boolean;
  error?: number;
  threshold?: number;
}

function tickDate(v: any) {
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(v);
  }
}

interface TimeSeriesProps {
  data: SeriesPoint[];
  height?: number;
  withBrush?: boolean;
  showRecon?: boolean;
  showAnomalies?: boolean;
}

export function TimeSeriesChart({ data, height = 280, withBrush = true, showRecon = false, showAnomalies = false }: TimeSeriesProps) {
  const anomalyPoints = showAnomalies ? data.filter((d) => d.isAnomaly) : [];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: withBrush ? 24 : 8 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="ts" tick={{ fontSize: 11, fill: axis }} tickFormatter={tickDate} stroke={grid} minTickGap={32} />
        <YAxis tick={{ fontSize: 11, fill: axis }} stroke={grid} width={48} tickFormatter={(v) => formatNumber(Number(v), 2)} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => formatDateTime(l as string)}
          formatter={(v: any, name) => [formatNumber(Number(v), 4), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Line
          name="Sensor qiymati"
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--chart-value))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {showRecon && (
          <Line
            name="Qayta tiklangan"
            type="monotone"
            dataKey="recon"
            stroke="hsl(var(--chart-recon))"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        )}
        {showAnomalies && anomalyPoints.length > 0 && (
          <Scatter
            name="Anomaliya"
            data={anomalyPoints}
            fill="hsl(var(--chart-anomaly))"
            shape="circle"
            line={false}
          />
        )}
        {withBrush && data.length > 30 && (
          <Brush
            dataKey="ts"
            height={22}
            stroke="hsl(var(--primary))"
            travellerWidth={8}
            tickFormatter={tickDate}
            y={height - 26}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface ErrorChartProps {
  data: SeriesPoint[];
  threshold?: number;
  height?: number;
  withBrush?: boolean;
}

export function ErrorAreaChart({ data, threshold, height = 240, withBrush = true }: ErrorChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: withBrush ? 24 : 8 }}>
        <defs>
          <linearGradient id="errorFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-error))" stopOpacity={0.5} />
            <stop offset="100%" stopColor="hsl(var(--chart-error))" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="ts" tick={{ fontSize: 11, fill: axis }} tickFormatter={tickDate} stroke={grid} minTickGap={32} />
        <YAxis tick={{ fontSize: 11, fill: axis }} stroke={grid} width={48} tickFormatter={(v) => formatNumber(Number(v), 3)} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => formatDateTime(l as string)}
          formatter={(v: any) => [formatNumber(Number(v), 5), "Xatolik"]}
        />
        <Area
          type="monotone"
          dataKey="error"
          stroke="hsl(var(--chart-error))"
          fill="url(#errorFill)"
          strokeWidth={1.6}
          isAnimationActive={false}
        />
        {threshold !== undefined && (
          <ReferenceLine
            y={threshold}
            stroke="hsl(var(--chart-threshold))"
            strokeDasharray="6 4"
            label={{ value: `Chegara: ${formatNumber(threshold, 4)}`, position: "insideTopRight", fontSize: 11, fill: axis }}
          />
        )}
        {withBrush && data.length > 30 && (
          <Brush dataKey="ts" height={22} stroke="hsl(var(--primary))" travellerWidth={8} tickFormatter={tickDate} y={height - 26} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface LossChartProps {
  loss: number[];
  valLoss?: number[];
  height?: number;
}

export function LossChart({ loss, valLoss, height = 240 }: LossChartProps) {
  const data = loss.map((v, i) => ({ epoch: i + 1, loss: v, val_loss: valLoss?.[i] ?? null }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="epoch"
          tick={{ fontSize: 11, fill: axis }}
          stroke={grid}
          label={{ value: "Epoch", position: "insideBottom", offset: -2, fontSize: 11, fill: axis }}
        />
        <YAxis tick={{ fontSize: 11, fill: axis }} stroke={grid} width={48} tickFormatter={(v) => formatNumber(Number(v), 4)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n) => [formatNumber(Number(v), 6), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Line name="Train loss" type="monotone" dataKey="loss" stroke="hsl(var(--chart-value))" strokeWidth={2} dot={false} isAnimationActive={false} />
        {valLoss && valLoss.length > 0 && (
          <Line
            name="Val loss"
            type="monotone"
            dataKey="val_loss"
            stroke="hsl(var(--chart-recon))"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
