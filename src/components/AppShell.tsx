import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FileText, ReceiptText, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-aurora">
      <header className="sticky top-0 z-40 border-b border-border/60 surface-glass backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:h-16 sm:gap-6">
          <Link
            to="/dashboard"
            className="shrink-0 font-display text-lg font-semibold tracking-tight"
          >
            Atelier<span className="text-primary">.</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            >
              <LayoutDashboard className="size-4" /> Tableau de bord
            </Link>
            <Link
              to="/devis/$id"
              params={{ id: "nouveau" }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <FileText className="size-4" /> Nouveau devis
            </Link>
            <Link
              to="/factures"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            >
              <ReceiptText className="size-4" /> Factures
            </Link>
          </nav>
          <div className="ml-auto shrink-0">
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Déconnexion">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:py-8 sm:pb-8">{children}</main>

      {/* Navigation mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 surface-glass backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 px-2 pb-[env(safe-area-inset-bottom)]">
          <Link
            to="/dashboard"
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors [&.active]:text-foreground"
          >
            <LayoutDashboard className="size-5" />
            Tableau de bord
          </Link>
          <Link
            to="/devis/$id"
            params={{ id: "nouveau" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors [&.active]:text-foreground"
          >
            <FileText className="size-5" />
            Nouveau devis
          </Link>
          <Link
            to="/factures"
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors [&.active]:text-foreground"
          >
            <ReceiptText className="size-5" />
            Factures
          </Link>
        </div>
      </nav>
    </div>
  );
}
