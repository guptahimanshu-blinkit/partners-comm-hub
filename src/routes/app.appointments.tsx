import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeaturePage } from "@/components/feature/FeaturePage";

export const Route = createFileRoute("/app/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — PartnersBiz" },
      { name: "description", content: "Inbound slot bookings, cancellations, and gate passes." },
      { property: "og:title", content: "Appointments — PartnersBiz" },
      { property: "og:description", content: "Warehouse appointments and QR gate passes." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <FeaturePage
        tab="Appointments"
        title="Appointments"
        description="Warehouse inbound slots, confirmations, cancellations, and gate passes."
      />
    </AppShell>
  );
}
