import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeaturePage } from "@/components/feature/FeaturePage";

export const Route = createFileRoute("/app/po-summary")({
  head: () => ({
    meta: [
      { title: "PO Summary — PartnersBiz" },
      { name: "description", content: "Purchase order updates, revisions, cancellations, and RTV alerts." },
      { property: "og:title", content: "PO Summary — PartnersBiz" },
      { property: "og:description", content: "Live PO status and action-required alerts." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <FeaturePage
        tab="PO Summary"
        title="PO Summary"
        description="Purchase orders, revisions, cancellations, and RTV alerts routed to your team."
      />
    </AppShell>
  );
}
