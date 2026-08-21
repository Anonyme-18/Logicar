import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FileText, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-aurora">
      <header className="sticky top-0 z-40 border-b border-border/60 surface-glass backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
          <Link to="/dashboard" className="font-display text-lg font-semibold tracking-tight">
            Atelier<span className="text-primary">.</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
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
          </nav>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
