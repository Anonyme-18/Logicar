import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Atelier — Devis et factures pour artisans" },
      {
        name: "description",
        content:
          "Créez vos devis, transformez-les en factures verrouillées et suivez vos encaissements sans ressaisie.",
      },
      { property: "og:title", content: "Atelier — Devis et factures pour artisans" },
      {
        property: "og:description",
        content: "Devis, factures verrouillées et tableau de bord financier pour artisans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
