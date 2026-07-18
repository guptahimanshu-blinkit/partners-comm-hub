import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { CalendarPlus, Info } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole } from "@/lib/role-context";
import { useRequests } from "@/lib/requests-store";

export const Route = createFileRoute("/notifications/schedule")({
  head: () => ({
    meta: [{ title: "Add New Notification — PartnersBiz Comms Centre" }],
  }),
  component: ScheduleNotificationPage,
});

function ScheduleNotificationPage() {
  const { role } = useRole();
  const [templateId, setTemplateId] = useState<string>("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [segment, setSegment] = useState("All vendors");

  const requests = useRequests();
  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  const approved = requests.filter((r) => r.status === "Approved");
  const selected = approved.find((r) => r.templateId === templateId);

  const submit = () => {
    if (!selected) return;
    toast.success(`${selected.templateName} scheduled`);
    setTemplateId("");
    setScheduleAt("");
    setSegment("All vendors");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Add New Notification
          </h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Workdesk — schedule an approved template to a vendor segment.
        </p>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-2">
            <Label htmlFor="notif-type">Select Notification Type</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="notif-type">
                <SelectValue placeholder="Choose a template…" />
              </SelectTrigger>
              <SelectContent>
                {published.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — {t.tenant} · {t.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Only approved templates appear here.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="segment">Target segment</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger id="segment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "All vendors",
                  "Grocery – Tier 1",
                  "Fashion vendors",
                  "New vendors (< 90 days)",
                ].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="schedule-at">Schedule at</Label>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </div>

          <Button className="w-full" disabled={!selected} onClick={submit}>
            Schedule Notification
          </Button>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Prototype, sample data only, this schedule is not persisted after refresh.
        </p>
      </div>
    </AppShell>
  );
}
