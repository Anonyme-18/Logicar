"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Menu, ShoppingCart } from "lucide-react";

const LINKS = [
  { label: "Accueil", dot: true },
  { label: "Fonctions" },
  { label: "Tarifs" },
  { label: "Ressources", accent: true },
];

function Logo() {
  const petals = Array.from({ length: 8 }).map((_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { cx: 16 + 10 * Math.cos(a), cy: 16 + 10 * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 32 32" className="size-7 shrink-0 sm:size-8" aria-hidden>
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill="var(--primary)" />
      ))}
      <circle cx={16} cy={16} r={3.5} fill="var(--primary)" />
    </svg>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <nav className="relative w-full max-w-[760px] rounded-full border border-border/70 bg-card py-2 pl-2 pr-2 shadow-glass">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden items-center gap-6 text-[14px] md:flex">
            {LINKS.map((l) => (
              <span
                key={l.label}
                className={`inline-flex items-center gap-1.5 ${l.accent ? "text-primary" : "text-foreground"}`}
              >
                {l.dot ? (
                  <span className="size-[3px] rounded-full bg-foreground ring-[1.5px] ring-foreground" />
                ) : null}
                {l.label}
                {l.accent ? <ChevronDown className="size-3.5" /> : null}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ShoppingCart className="hidden size-4 text-muted-foreground sm:block" />
            <Link
              href="/auth"
              className="press inline-flex items-center gap-2 rounded-full bg-primary py-2 pl-4 pr-2 text-[13px] font-medium text-primary-foreground"
            >
              <span className="hidden sm:inline">Accès anticipé</span>
              <span className="sm:hidden">Accès</span>
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary-foreground/20">
                <ChevronRight className="size-3.5" />
              </span>
            </Link>
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex size-9 items-center justify-center rounded-full text-foreground md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {open ? (
          <div className="absolute left-2 right-2 top-full z-20 mt-2 rounded-2xl border border-border/70 bg-card p-3 shadow-float md:hidden">
            {LINKS.map((l) => (
              <span
                key={l.label}
                className={`block rounded-lg px-3 py-2 text-sm ${l.accent ? "text-primary" : "text-foreground"}`}
              >
                {l.label}
              </span>
            ))}
          </div>
        ) : null}
      </nav>
    </div>
  );
}
