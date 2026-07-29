import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeaturePage } from "@/components/feature/FeaturePage";

export const Route = createFileRoute("/app/fees-and-charges")({
  head: () => ({
    meta: [
      { title: "Fees & Charges — PartnersBiz" },
      { name: "description", content: "GRN bundles, debit notes, and courier charge reconciliations." },
      { property: "og:title", content: "Fees & Charges — PartnersBiz" },
      { property: "og:description", content: "Debit notes, GRN bundles, and RTV charges." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <FeaturePage
        tab="Fees & Charges"
        title="Fees & Charges"
        description="GRN + DN + POD bundles, debit notes, and RTV courier charges."
      />
    </AppShell>
  );
}
