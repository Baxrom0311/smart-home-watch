import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cpu, Loader2, PlayCircle, History } from "lucide-react";
import { api, getApiErrorMessage } from "@/services/api";
import type { ModelStatus, TrainingResponse } from "@/services/types";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LossChart } from "@/components/charts/Charts";
import { formatDateTime, formatInt, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Form {
  source_file: string;
  epochs: number;
  batch_size: number;
  window_size: number;
  learning_rate: number;
}

const DEFAULTS: Form = { source_file: "", epochs: 30, batch_size: 32, window_size: 30, learning_rate: 0.001 };

export default function TrainingPage() {
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ["sources"], queryFn: () => api.sources() });
  const history = useQuery({ queryKey: ["history"], queryFn: () => api.history() });

  const [form, setForm] = useState<Form>(DEFAULTS);

  const selectedSource = useMemo(
    () => sources.data?.find((s) => s.source_file === form.source_file),
    [sources.data, form.source_file]
  );

  useEffect(() => {
    if (!form.source_file && sources.data && sources.data.length > 0) {
      setForm((f) => ({ ...f, source_file: sources.data![0].source_file }));
    }
  }, [sources.data, form.source_file]);

  // Status polling
  const status = useQuery<ModelStatus>({
    queryKey: ["model-status"],
    queryFn: () => api.status(),
    refetchInterval: (q) => (q.state.data?.state === "running" ? 2000 : false),
  });

  const isRunning = status.data?.state === "running";

  const train = useMutation({
    mutationFn: () => {
      if (!selectedSource) throw new Error("Datasetni tanlang");
      return api.train({
        sensor_type: selectedSource.sensor_type,
        source_file: selectedSource.source_file,
        epochs: form.epochs,
        batch_size: form.batch_size,
        learning_rate: form.learning_rate,
        window_size: form.window_size,
      });
    },
    onSuccess: () => {
      toast.success("Model o'qitish boshlandi");
      qc.invalidateQueries({ queryKey: ["model-status"] });
    },
    onError: (e: any) => {
      const msg = getApiErrorMessage(e);
      if (e?.response?.status === 409) {
        toast.error("Boshqa o'qitish jarayoni davom etmoqda. Iltimos, kuting.");
      } else {
        toast.error(msg);
      }
    },
  });

  // When training completes, refresh history
  useEffect(() => {
    if (status.data?.state === "completed" || status.data?.state === "failed") {
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }, [status.data?.state, qc]);

  const [detail, setDetail] = useState<TrainingResponse | null>(null);
  const detailQ = useQuery({
    queryKey: ["history-detail", detail?.id],
    queryFn: () => api.historyDetail(detail!.id),
    enabled: !!detail,
  });

  const noSources = (sources.data?.length ?? 0) === 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Model o'qitish</h1>
        <p className="text-sm text-muted-foreground">LSTM Autoencoder uchun parametrlarni tanlang va o'qitishni boshlang.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-4 lg:gap-6">
        {/* Form */}
        <SectionCard title="O'qitish parametrlari">
          {sources.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : noSources ? (
            <EmptyState
              title="Dataset mavjud emas"
              description="Avval Ma'lumotlar sahifasida CSV yuklang yoki sample import qiling."
              icon={<Cpu className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Dataset</Label>
                <Select value={form.source_file} onValueChange={(v) => setForm({ ...form, source_file: v })}>
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
                {selectedSource && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Sensor turi: <span className="font-medium text-foreground">{selectedSource.sensor_type}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Epochs</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.epochs}
                    onChange={(e) => setForm({ ...form, epochs: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Batch size</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4096}
                    value={form.batch_size}
                    onChange={(e) => setForm({ ...form, batch_size: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Window size</Label>
                  <Input
                    type="number"
                    min={5}
                    max={512}
                    value={form.window_size}
                    onChange={(e) => setForm({ ...form, window_size: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Learning rate</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min={0.00001}
                    max={1}
                    value={form.learning_rate}
                    onChange={(e) => setForm({ ...form, learning_rate: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => train.mutate()}
                disabled={!form.source_file || train.isPending || isRunning}
              >
                {train.isPending || isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                {isRunning ? "O'qitilmoqda..." : "O'qitishni boshlash"}
              </Button>
            </div>
          )}
        </SectionCard>

        {/* Live status */}
        <SectionCard title="Joriy holat" description={status.data?.message ?? "O'qitish jarayoni va loss grafigi"}>
          {!status.data || status.data.state === "idle" ? (
            <EmptyState
              title="Hech narsa o'qitilmayapti"
              description="Chap tomonda parametrlarni belgilang va o'qitishni boshlang."
              icon={<Cpu className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label="Holat"
                  value={
                    <span
                      className={cn(
                        "capitalize",
                        status.data.state === "completed" && "text-sage",
                        status.data.state === "failed" && "text-destructive",
                        status.data.state === "running" && "text-primary"
                      )}
                    >
                      {status.data.state}
                    </span>
                  }
                  tone="primary"
                />
                <StatCard
                  label="Epoch"
                  value={`${status.data.current_epoch ?? 0}${status.data.total_epochs ? ` / ${status.data.total_epochs}` : ""}`}
                />
                <StatCard label="Train loss" value={formatNumber(status.data.train_loss, 6)} tone="teal" />
                <StatCard label="Val loss" value={formatNumber(status.data.val_loss, 6)} tone="sage" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{status.data.sensor_type ?? "—"} · {status.data.source_file ?? "—"}</span>
                  <span className="tabular-nums">{Math.min(100, Math.max(0, status.data.progress ?? 0))}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, status.data.progress ?? 0))} />
              </div>

              {(status.data.loss_history?.length ?? 0) > 0 ? (
                <div className="pt-2">
                  <LossChart loss={status.data.loss_history ?? []} valLoss={status.data.val_loss_history} />
                </div>
              ) : (
                <Skeleton className="h-[240px] w-full" />
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* History */}
      <SectionCard
        title="O'qitish tarixi"
        description="Qatorga bosing — batafsil ko'rish."
        actions={<History className="h-4 w-4 text-muted-foreground" />}
        bodyClassName="p-0"
      >
        {history.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (history.data?.length ?? 0) === 0 ? (
          <EmptyState title="Tarix bo'sh" description="Birinchi modelni o'qitganingizdan so'ng bu yerda ko'rinadi." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Sensor</TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead className="text-right">Epochs</TableHead>
                  <TableHead className="text-right">Train loss</TableHead>
                  <TableHead className="text-right">Val loss</TableHead>
                  <TableHead className="text-right">F1</TableHead>
                  <TableHead>Sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data!.map((h) => (
                  <TableRow key={h.id} onClick={() => setDetail(h)} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-medium">{h.model_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{h.sensor_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">{h.source_file ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{h.epochs}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{formatNumber(h.train_loss, 6)}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{formatNumber(h.val_loss, 6)}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{formatNumber(h.f1, 3)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{detail?.model_name}</DialogTitle>
            <DialogDescription>O'qitish tafsilotlari va metrikalar</DialogDescription>
          </DialogHeader>
          {detailQ.isLoading || !detailQ.data ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <DetailContent t={detailQ.data} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailContent({ t }: { t: TrainingResponse }) {
  const rows: [string, React.ReactNode][] = [
    ["Sensor turi", t.sensor_type],
    ["Dataset", t.source_file ?? "—"],
    ["Status", <Badge key="s" variant="secondary">{t.status}</Badge>],
    ["Epochs", t.epochs],
    ["Batch size", t.batch_size],
    ["Window size", t.window_size],
    ["Learning rate", formatNumber(t.learning_rate, 6)],
    ["Train loss", formatNumber(t.train_loss, 6)],
    ["Val loss", formatNumber(t.val_loss, 6)],
    ["Threshold", formatNumber(t.threshold, 6)],
    ["Accuracy", formatNumber(t.accuracy, 4)],
    ["Precision", formatNumber(t.precision_score, 4)],
    ["Recall", formatNumber(t.recall_score, 4)],
    ["F1", formatNumber(t.f1, 4)],
    ["Model path", <span key="mp" className="font-mono text-xs break-all">{t.model_path ?? "—"}</span>],
    ["Scaler path", <span key="sp" className="font-mono text-xs break-all">{t.scaler_path ?? "—"}</span>],
    ["Yaratilgan", formatDateTime(t.created_at)],
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm max-h-[60vh] overflow-y-auto pr-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-border/40 pb-1.5">
          <span className="text-muted-foreground text-xs">{k}</span>
          <span className="text-right font-medium">{v}</span>
        </div>
      ))}
    </div>
  );
}
