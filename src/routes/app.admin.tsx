import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FeaturePage } from "@/components/feature/FeaturePage";

export const Route = createFileRoute("/app/admin")({
  head: () => ({
    meta: [
      { title: "Admin — PartnersBiz" },
      { name: "description", content: "Account access, OTP mails, and reactivation notices." },
      { property: "og:title", content: "Admin — PartnersBiz" },
      { property: "og:description", content: "Account, OTP, and reactivation communications." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <FeaturePage
        tab="Admin"
        title="Admin"
        description="Account activation, OTP login, and reactivation notices."
      />
    </AppShell>
  );
}
