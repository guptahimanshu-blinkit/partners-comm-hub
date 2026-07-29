import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeaturePage } from "@/components/feature/FeaturePage";

export const Route = createFileRoute("/app/report-requests")({
  head: () => ({
    meta: [
      { title: "Report Requests — PartnersBiz" },
      { name: "description", content: "Weekly scorecards, LQI reports, and forecast downloads." },
      { property: "og:title", content: "Report Requests — PartnersBiz" },
      { property: "og:description", content: "Fill rate, LQI, and forecast reports." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <FeaturePage
        tab="Report Requests"
        title="Report Requests"
        description="Fill rate scorecards, LQI, forecast, and monthly sales exports."
      />
    </AppShell>
  );
}
