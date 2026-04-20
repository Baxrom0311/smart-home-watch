import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Download, Loader2, PlayCircle } from "lucide-react";
import { api, getApiErrorMessage } from "@/services/api";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorAreaChart, TimeSeriesChart } from "@/components/charts/Charts";
import { formatDateTime, formatInt, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const AUTO = "__auto__";

export default function AnalysisPage() {
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api.sources() });
  const history = useQuery({ queryKey: ["history"], queryFn: () => api.history() });

  const [sourceFile, setSourceFile] = useState<string>("");
  const [trainingId, setTrainingId] = useState<string>(AUTO);

  useEffect(() => {
    if (!sourceFile && sources.data && sources.data.length > 0) {
      setSourceFile(sources.data[0].source_file);
    }
  }, [sources.data, sourceFile]);

  const selectedSource = sources.data?.find((s) => s.source_file === sourceFile);

  // Filter compatible models
  const compatibleModels = useMemo(() => {
    if (!history.data) return [];
    if (!selectedSource) return history.data;
    return history.data.filter((h) => h.sensor_type === selectedSource.sensor_type);
  }, [history.data, selectedSource]);

  const results = useQuery({
    queryKey: ["anomaly-results", selectedSource?.sensor_type, sourceFile],
    queryFn: () =>
      api.results({
        sensor_type: selectedSource!.sensor_type,
        source_file: sourceFile,
        limit: 1000,
      }),
    enabled: !!selectedSource && !!sourceFile,
  });

  const detect = useMutation({
    mutationFn: () => {
      if (!selectedSource) throw new Error("Datasetni tanlang");
      return api.detect({
        sensor_type: selectedSource.sensor_type,
        source_file: selectedSource.source_file,
        training_id: trainingId === AUTO ? null : Number(trainingId),
      });
    },
    onSuccess: (r) => {
      toast.success(`Aniqlash tugadi · ${r.anomalies_detected} ta anomaliya`);
      qc.invalidateQueries({ queryKey: ["anomaly-results"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const items = results.data?.items ?? [];
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [items]
  );

  const chartData = useMemo(
    () =>
      sorted.map((a) => ({
        ts: a.timestamp,
        value: a.value,
        recon: a.reconstructed_value ?? null,
        isAnomaly: a.is_anomaly,
        error: a.anomaly_score,
        threshold: a.threshold,
      })),
    [sorted]
  );

  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const anomalies = items.filter((a) => a.is_anomaly).length;
    return {
      total: items.length,
      anomalies,
      threshold: items[0].threshold,
      sensor: items[0].sensor_type,
    };
  }, [items]);

  const [exporting, setExporting] = useState(false);
  async function onExport(anomalyOnly = false) {
    if (!selectedSource) return;
    try {
      setExporting(true);
      await api.exportAnomalies({
        sensor_type: selectedSource.sensor_type,
        source_file: sourceFile,
        anomaly_only: anomalyOnly,
      });
      toast.success("CSV yuklab olindi");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  const noSources = (sources.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Anomaliyalar tahlili</h1>
        <p className="text-sm text-muted-foreground">Tanlangan dataset va model bo'yicha aniqlash va natijalarni vizualizatsiya.</p>
      </header>

      {/* Controls */}
      <SectionCard>
        {noSources ? (
          <EmptyState
            title="Dataset mavjud emas"
            description="Tahlilni boshlash uchun Ma'lumotlar sahifasida CSV yuklang yoki sample import qiling."
            icon={<Activity className="h-5 w-5" />}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr,1fr,auto] md:items-end">
            <div>
              <Label className="text-xs">Dataset</Label>
              <Select
                value={sourceFile}
                onValueChange={(v) => {
                  setSourceFile(v);
                  setTrainingId(AUTO);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {sources.data!.map((s) => (
                    <SelectItem key={s.source_file} value={s.source_file}>
                      {s.source_file}
                      <span className="text-muted-foreground text-xs ml-1">
                        · {s.sensor_type} · {formatInt(s.rows_count)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Model (ixtiyoriy)</Label>
              <Select value={trainingId} onValueChange={setTrainingId} disabled={history.isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO}>Avtomatik (eng so'nggi)</SelectItem>
                  {compatibleModels.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.model_name}
                      <span className="text-muted-foreground text-xs ml-1">
                        · F1 {formatNumber(m.f1, 3)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => detect.mutate()} disabled={detect.isPending || !sourceFile}>
              {detect.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Aniqlashni boshlash
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Jami oynalar" value={formatInt(summary.total)} tone="teal" />
          <StatCard label="Anomaliyalar" value={formatInt(summary.anomalies)} tone="danger" />
          <StatCard label="Chegara (threshold)" value={formatNumber(summary.threshold, 5)} tone="amber" />
          <StatCard label="Sensor" value={summary.sensor} tone="primary" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:gap-6">
        <SectionCard
          title="Sensor qiymati va qayta tiklangan signal"
          description="Anomaliyalar qizil nuqtalar bilan ajratilgan."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onExport(false)} disabled={exporting || items.length === 0}>
                {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                Barchasi
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport(true)} disabled={exporting || items.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Faqat anomaliyalar
              </Button>
            </div>
          }
        >
          {results.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState title="Natija yo'q" description="Yuqorida aniqlashni ishga tushiring." icon={<Activity className="h-5 w-5" />} />
          ) : (
            <TimeSeriesChart data={chartData} showRecon showAnomalies />
          )}
        </SectionCard>

        <SectionCard title="Qayta tiklash xatoligi" description="Vaqt bo'yicha xatolik va threshold chizig'i.">
          {results.isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState title="Ma'lumot yo'q" />
          ) : (
            <ErrorAreaChart data={chartData} threshold={summary?.threshold} />
          )}
        </SectionCard>
      </div>

      {/* Results table */}
      <SectionCard title="Natijalar jadvali" description={items.length > 0 ? `Jami ${formatInt(items.length)} yozuv` : ""} bodyClassName="p-0">
        {results.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Natija yo'q" description="Aniqlashni ishga tushiring va natijalar shu yerda paydo bo'ladi." />
        ) : (
          <div className="overflow-x-auto max-h-[520px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Vaqt</TableHead>
                  <TableHead className="text-right">Qiymat</TableHead>
                  <TableHead className="text-right">Qayta tiklangan</TableHead>
                  <TableHead className="text-right">Xatolik</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead>Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((a) => (
                  <TableRow
                    key={a.id}
                    className={cn(a.is_anomaly && "bg-destructive-soft/60 hover:bg-destructive-soft")}
                  >
                    <TableCell className="whitespace-nowrap">{formatDateTime(a.timestamp)}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{formatNumber(a.value, 4)}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {formatNumber(a.reconstructed_value, 4)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{formatNumber(a.anomaly_score, 5)}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{formatNumber(a.threshold, 5)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={a.is_anomaly ? "destructive" : "secondary"}
                        className={cn(
                          "text-[10px]",
                          a.is_anomaly && "bg-destructive text-destructive-foreground hover:bg-destructive"
                        )}
                      >
                        {a.is_anomaly ? "Anomaliya" : "Normal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
