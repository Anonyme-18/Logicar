import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Atelier — Devis & factures artisan",
  description: "Devis, factures verrouillées et suivi financier pour artisans indépendants.",
  openGraph: {
    title: "Atelier — Devis & factures artisan",
    description: "Devis, factures verrouillées et suivi financier pour artisans indépendants.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
