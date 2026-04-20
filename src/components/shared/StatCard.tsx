import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "teal" | "sage" | "amber" | "danger";
  loading?: boolean;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  teal: "bg-secondary text-secondary-foreground",
  sage: "bg-accent text-accent-foreground",
  amber: "bg-amber/15 text-amber-foreground",
  danger: "bg-destructive-soft text-destructive",
};

export function StatCard({ label, value, hint, icon, tone = "default", loading }: StatCardProps) {
  return (
    <div className="surface-card surface-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon && (
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", toneStyles[tone])}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 font-display text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
        {loading ? <Skeleton className="h-8 w-24" /> : value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
