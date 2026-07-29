import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeaturePage } from "@/components/feature/FeaturePage";

export const Route = createFileRoute("/app/assortment")({
  head: () => ({
    meta: [
      { title: "Assortment — PartnersBiz" },
      { name: "description", content: "MDM requests, image rework, and catalog health." },
      { property: "og:title", content: "Assortment — PartnersBiz" },
      { property: "og:description", content: "MDM approvals, rejections, and catalog health." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <FeaturePage
        tab="Assortment"
        title="Assortment"
        description="MDM requests, image rework, and catalog health tracking."
      />
    </AppShell>
  );
}
