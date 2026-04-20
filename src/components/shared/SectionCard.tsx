import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({ title, description, actions, children, className, bodyClassName }: SectionCardProps) {
  return (
    <section className={cn("surface-card overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-border/60">
          <div className="min-w-0 flex-1">
            {title && <h2 className="font-display text-base sm:text-lg font-semibold leading-tight">{title}</h2>}
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}
