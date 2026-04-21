import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, AlertTriangle, Database, Gauge, Loader2, PlayCircle, Sparkles, TrendingUp } from "lucide-react";
import { api, getApiErrorMessage } from "@/services/api";
import type { ModelStatus } from "@/services/types";
import { StatCard } from "@/components/shared/StatCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TimeSeriesChart } from "@/components/charts/Charts";
import { formatBytes, formatDateTime, formatInt, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type DemoStep =
  | { kind: "idle" }
  | { kind: "import" }
  | { kind: "train"; progress: number; epoch?: number | null; total?: number | null }
  | { kind: "detect" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Dashboard() {
  const qc = useQueryClient();

  const summary = useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard() });
  const samples = useQuery({ queryKey: ["samples"], queryFn: () => api.listSamples() });
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api.sources() });

  // Pick first source for charts
  const firstSource = sources.data?.[0];
  const chartQuery = useQuery({
    queryKey: ["dashboard-chart", firstSource?.source_file, firstSource?.sensor_type],
    queryFn: () =>
      api.listData({
        source_file: firstSource!.source_file,
        sensor_type: firstSource!.sensor_type,
        limit: 500,
      }),
    enabled: !!firstSource,
  });

  const recentAnoms = useQuery({
    queryKey: ["recent-anomalies", firstSource?.source_file, firstSource?.sensor_type],
    queryFn: () =>
      api.results({
        source_file: firstSource!.source_file,
        sensor_type: firstSource!.sensor_type,
        limit: 500,
      }),
    enabled: !!firstSource,
  });

  const [selectedSample, setSelectedSample] = useState<string | undefined>();
  useEffect(() => {
    if (!selectedSample && samples.data && samples.data.length > 0) {
      setSelectedSample(samples.data[0].file_name);
    }
  }, [samples.data, selectedSample]);

  const [demo, setDemo] = useState<DemoStep>({ kind: "idle" });

  async function pollUntilDone(): Promise<ModelStatus> {
    return new Promise((resolve, reject) => {
      const tick = async () => {
        try {
          const s = await api.status();
          setDemo({ kind: "train", progress: s.progress ?? 0, epoch: s.current_epoch, total: s.total_epochs });
          if (s.state === "completed") return resolve(s);
          if (s.state === "failed") return reject(new Error(s.message ?? "Model o'qitishda xatolik"));
          setTimeout(tick, 2000);
        } catch (e) {
          reject(e);
        }
      };
      tick();
    });
  }

  const runDemo = useMutation({
    mutationFn: async () => {
      if (!selectedSample) throw new Error("Sample tanlanmagan");
      const sample = samples.data?.find((s) => s.file_name === selectedSample);
      if (!sample) throw new Error("Sample topilmadi");

      setDemo({ kind: "import" });
      const imported = await api.importSample({ file_name: sample.file_name, sensor_type: sample.sensor_type });

      setDemo({ kind: "train", progress: 0 });
      await api.train({
        sensor_type: imported.sensor_type,
        source_file: imported.source_file,
        epochs: 20,
      });
      await pollUntilDone();

      setDemo({ kind: "detect" });
      await api.detect({ sensor_type: imported.sensor_type, source_file: imported.source_file });

      setDemo({ kind: "done" });
      return imported;
    },
    onSuccess: () => {
      toast.success("Demo yakunlandi");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["dashboard-chart"] });
      qc.invalidateQueries({ queryKey: ["recent-anomalies"] });
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err);
      setDemo({ kind: "error", message: msg });
      toast.error(msg);
    },
  });

  const chartData = useMemo(() => {
    const items = chartQuery.data?.items ?? [];
    const anomalyMap = new Map<number, boolean>();
    (recentAnoms.data?.items ?? []).forEach((a) => anomalyMap.set(a.sensor_data_id, a.is_anomaly));
    return [...items]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((d) => ({ ts: d.timestamp, value: d.value, isAnomaly: anomalyMap.get(d.id) ?? false }));
  }, [chartQuery.data, recentAnoms.data]);

  const recentTrueAnomalies = useMemo(
    () => (recentAnoms.data?.items ?? []).filter((item) => item.is_anomaly).slice(0, 8),
    [recentAnoms.data],
  );

  const s = summary.data;

  return (
    <div className="space-y-6 lg:space-y-8 max-w-[1400px] mx-auto w-full">
      {/* Hero */}
      <section className="surface-card overflow-hidden gradient-hero relative">
        <div className="absolute inset-0 opacity-50 pointer-events-none [mask-image:radial-gradient(circle_at_70%_20%,black,transparent_70%)] bg-[radial-gradient(circle_at_30%_30%,hsl(14_60%_60%/.18),transparent_50%)]" />
        <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col lg:flex-row gap-6 lg:items-center">
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="mb-3 bg-background/70 backdrop-blur text-foreground/80 border border-border/60">
              <Sparkles className="h-3 w-3 mr-1" /> Diplom loyihasi
            </Badge>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-balance">
              Aqlli uy sensorlarida <span className="text-clay">anomaliyalarni</span> real vaqtda aniqlash
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl">
              LSTM Autoencoder yordamida temperatura, namlik va energiya iste'moli kabi vaqt qatorlaridagi
              g'ayritabiiy holatlarni avtomatik aniqlaymiz.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:w-[280px]">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">So'nggi anomaliya</div>
            <div className="font-display text-lg font-semibold">
              {summary.isLoading ? <Skeleton className="h-6 w-40" /> : formatDateTime(s?.latest_anomaly)}
            </div>
            <div className="text-xs text-muted-foreground">
              Sensor turlari: {s?.sensor_types?.length ? s.sensor_types.join(", ") : "—"}
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Jami ma'lumotlar"
          value={formatInt(s?.total_sensor_data)}
          icon={<Database className="h-4 w-4" />}
          tone="teal"
          loading={summary.isLoading}
        />
        <StatCard
          label="Anomaliyalar"
          value={formatInt(s?.total_anomalies)}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="danger"
          loading={summary.isLoading}
        />
        <StatCard
          label="Anomaliya foizi"
          value={s ? formatPercent(s.anomaly_percentage, 2) : "—"}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="amber"
          loading={summary.isLoading}
        />
        <StatCard
          label="So'nggi model · F1"
          value={s?.latest_model ? formatNumber(s.latest_model.f1, 3) : "—"}
          hint={s?.latest_model ? s.latest_model.name : "Model hali o'qitilmagan"}
          icon={<Gauge className="h-4 w-4" />}
          tone="primary"
          loading={summary.isLoading}
        />
      </div>

      {/* Quick demo */}
      <SectionCard
        title="Tezkor demo"
        description="Bitta tugma bilan: sample yuklash → model o'qitish → anomaliya aniqlash."
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedSample} onValueChange={setSelectedSample} disabled={runDemo.isPending || samples.isLoading}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Sample tanlang" />
              </SelectTrigger>
              <SelectContent>
                {(samples.data ?? []).map((s) => (
                  <SelectItem key={s.file_name} value={s.file_name}>
                    <span className="font-medium">{s.file_name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {s.sensor_type} · {formatBytes(s.size_bytes)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => runDemo.mutate()} disabled={!selectedSample || runDemo.isPending}>
              {runDemo.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Demoni ishga tushirish
            </Button>
          </div>
        }
      >
        <DemoProgress step={demo} />
      </SectionCard>

      {/* Time series + Recent anomalies */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <SectionCard
          className="xl:col-span-2"
          title="Sensor qiymatlari va anomaliyalar"
          description={
            firstSource
              ? `${firstSource.source_file} · ${firstSource.sensor_type}`
              : "Birinchi mavjud datasetdan namuna"
          }
        >
          {chartQuery.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState
              title="Ma'lumot yo'q"
              description="Tezkor demoni ishga tushiring yoki Ma'lumotlar sahifasida CSV yuklang."
              icon={<Database className="h-5 w-5" />}
            />
          ) : (
            <TimeSeriesChart data={chartData} showAnomalies />
          )}
        </SectionCard>

        <SectionCard title="So'nggi anomaliyalar" description="Eng yangi 8 ta anomaly yozuvi">
          {recentAnoms.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentTrueAnomalies.length === 0 ? (
            <EmptyState
              title="Anomaliya topilmadi"
              description="Aniqlashni Tahlil sahifasida ishga tushiring."
              icon={<Activity className="h-5 w-5" />}
            />
          ) : (
            <ul className="divide-y divide-border/60 -mx-2">
              {recentTrueAnomalies.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.sensor_type}</div>
                    <div className="text-[11px] text-muted-foreground">{formatDateTime(a.timestamp)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs tabular-nums">{formatNumber(a.value, 3)}</div>
                    <Badge
                      variant="destructive"
                      className={cn(
                        "mt-0.5 text-[10px] px-1.5 py-0",
                        "bg-destructive-soft text-destructive border-destructive/30 hover:bg-destructive-soft"
                      )}
                    >
                      Anomaliya
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function DemoProgress({ step }: { step: DemoStep }) {
  if (step.kind === "idle") {
    return (
      <p className="text-sm text-muted-foreground">
        Demo to'liq oqimni ko'rsatadi: sample import, LSTM Autoencoder o'qitish va anomaliya aniqlash.
      </p>
    );
  }
  if (step.kind === "error") {
    return <div className="text-sm text-destructive">{step.message}</div>;
  }
  const stages = [
    { id: "import", label: "Dataset import qilinmoqda" },
    { id: "train", label: "Model o'qitilmoqda" },
    { id: "detect", label: "Anomaliya aniqlanmoqda" },
    { id: "done", label: "Demo yakunlandi" },
  ];
  const currentIdx = stages.findIndex((s) => s.id === step.kind);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {stages.map((s, i) => {
          const active = i === currentIdx;
          const done = i < currentIdx || step.kind === "done";
          return (
            <div
              key={s.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors",
                done && "bg-accent text-accent-foreground border-sage/30",
                active && "bg-primary-soft text-primary border-primary/30",
                !active && !done && "bg-muted text-muted-foreground border-border"
              )}
            >
              <div className="flex items-center gap-2">
                {active && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {step.kind === "train" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Epoch {step.epoch ?? 0}
              {step.total ? ` / ${step.total}` : ""}
            </span>
            <span className="tabular-nums">{Math.min(100, Math.max(0, step.progress))}%</span>
          </div>
          <Progress value={Math.min(100, Math.max(0, step.progress))} />
        </div>
      )}
    </div>
  );
}
