import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/notifications/review-queue")({
  head: () => ({
    meta: [{ title: "Comms Review Queue — PartnersBiz Comms Centre" }],
  }),
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const { role, internalRole } = useRole();
  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  return (
    <AppShell>
      <div className="p-4 sm:p-6">
        <div className="mb-5">
          <div className="mb-1 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Comms Review Queue
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Viewing as {internalRole}. Content coming in the next step.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Placeholder — role-specific queue will be populated next.
        </div>
      </div>
    </AppShell>
  );
}
