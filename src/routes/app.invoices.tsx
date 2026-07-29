import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeaturePage } from "@/components/feature/FeaturePage";

export const Route = createFileRoute("/app/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — PartnersBiz" },
      { name: "description", content: "Invoice verification, rejections, and payment status." },
      { property: "og:title", content: "Invoices — PartnersBiz" },
      { property: "og:description", content: "Verified invoices, rejections, and payment holds." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <FeaturePage
        tab="Invoices"
        title="Invoices"
        description="Invoice verification, rejections, TDS disputes, and payment holds."
      />
    </AppShell>
  );
}
