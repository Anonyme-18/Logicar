import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atelier — Devis et factures pour artisans",
  description:
    "Créez vos devis, transformez-les en factures verrouillées et suivez vos encaissements sans ressaisie.",
  openGraph: {
    title: "Atelier — Devis et factures pour artisans",
    description: "Devis, factures verrouillées et tableau de bord financier pour artisans.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-secondary p-3 sm:p-4">
      <div className="relative h-[calc(100vh-24px)] w-full overflow-hidden rounded-2xl bg-muted sm:h-[calc(100vh-32px)] sm:rounded-3xl">
        <div className="absolute inset-0 bg-aurora" aria-hidden />
        <div className="absolute inset-0 bg-background/10" aria-hidden />

        <div className="relative z-10 h-full overflow-y-auto">
          <Navbar />

          <div className="flex flex-col items-center px-4 pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-[13px] shadow-glass">
              <span className="size-2 rounded-full bg-primary" />
              Atelier — logiciel artisan
            </span>

            <h1
              className="mt-5 max-w-4xl sm:mt-6"
              style={{
                fontSize: "clamp(36px, 8vw, 72px)",
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: "-0.02em",
              }}
            >
              Des devis{" "}
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                impeccables
              </span>
              <br />
              en deux minutes
            </h1>

            <p
              className="mt-4 px-2 text-muted-foreground sm:mt-6"
              style={{ fontSize: "clamp(13px, 3.5vw, 16px)" }}
            >
              Devis, factures verrouillées et encaissements — zéro ressaisie, calculs exacts.
            </p>

            <Link
              href="/auth"
              className="press mt-6 inline-flex items-center gap-3 rounded-full bg-foreground py-2 pl-6 pr-2 text-[14px] font-medium text-background sm:mt-8 sm:py-2.5 sm:pl-7"
            >
              Commencer
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-background/15 sm:size-7">
                <ChevronRight className="size-4" />
              </span>
            </Link>
          </div>

          <DashboardPreview />
        </div>
      </div>
    </div>
  );
}
