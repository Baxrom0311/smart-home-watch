import { useState, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { HealthBadge } from "./HealthBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-[260px] shrink-0">
        <div className="fixed inset-y-0 left-0 w-[260px]">
          <AppSidebar />
        </div>
      </div>

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar">
          <AppSidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/80 bg-background/95 border-b border-border">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-1"
              onClick={() => setOpen(true)}
              aria-label="Menyu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display font-semibold text-base sm:text-lg leading-tight truncate">
                Smart Home Anomaliya Aniqlash
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                LSTM Autoencoder asosida sensor ma'lumotlari monitoring tizimi
              </p>
            </div>
            <div className="ml-auto">
              <HealthBadge />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 page-fade">{children}</main>

        <footer className="px-4 sm:px-6 lg:px-8 py-4 text-[11px] text-muted-foreground border-t border-border/60">
          © {new Date().getFullYear()} Smart Home AI · LSTM Autoencoder asosida ishlab chiqildi
        </footer>
      </div>
    </div>
  );
}
