import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { CalendarPlus, Info, Upload, CheckCircle2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";
import { useRequests, addPublishLog } from "@/lib/requests-store";
import { CATEGORIES, type CategoryId } from "@/lib/mock-data";

export const Route = createFileRoute("/notifications/schedule")({
  head: () => ({
    meta: [{ title: "Add New Notification — PartnersBiz Comms Centre" }],
  }),
  component: ScheduleNotificationPage,
});

// -------- Category color helpers (reuse existing cat-* tokens) --------

const CATEGORY_META: Record<
  CategoryId,
  { label: string; dot: string; border: string; soft: string; text: string }
> = {
  action_required: {
    label: "Action Required",
    dot: "bg-cat-red",
    border: "border-l-cat-red",
    soft: "bg-cat-red-soft",
    text: "text-cat-red",
  },
  finance_payments: {
    label: "Finance & Payments",
    dot: "bg-cat-amber",
    border: "border-l-cat-amber",
    soft: "bg-cat-amber-soft",
    text: "text-cat-amber",
  },
  reports_analytics: {
    label: "Reports & Analytics",
    dot: "bg-cat-green",
    border: "border-l-cat-green",
    soft: "bg-cat-green-soft",
    text: "text-cat-green",
  },
  daily_ops: {
    label: "Daily Ops Updates",
    dot: "bg-cat-blue",
    border: "border-l-cat-blue",
    soft: "bg-cat-blue-soft",
    text: "text-cat-blue",
  },
  reminders: {
    label: "Reminders",
    dot: "bg-cat-purple",
    border: "border-l-cat-purple",
    soft: "bg-cat-purple-soft",
    text: "text-cat-purple",
  },
  account_access: {
    label: "Account & Access",
    dot: "bg-muted-foreground/60",
    border: "border-l-muted-foreground/40",
    soft: "bg-muted",
    text: "text-muted-foreground",
  },
};

// -------- Sample data --------

type SegmentKey = "all" | "pending_dues" | "custom";

const SEGMENTS: { key: SegmentKey; label: string; recipients: number }[] = [
  { key: "all", label: "All vendors", recipients: 4812 },
  { key: "pending_dues", label: "Vendors with pending dues", recipients: 612 },
  { key: "custom", label: "Custom segment (query)", recipients: 187 },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TargetLevel = "Vendor" | "Manufacturer";
type RecipientMethod = "role_based" | "ad_hoc";
type ScheduleType = "one_time" | "recurring";

function ScheduleNotificationPage() {
  const { role } = useRole();
  const requests = useRequests();

  const [templateId, setTemplateId] = useState<string>("");
  const [targetLevel, setTargetLevel] = useState<TargetLevel>("Vendor");
  const [segmentKey, setSegmentKey] = useState<SegmentKey>("all");
  const [recipientMethod, setRecipientMethod] =
    useState<RecipientMethod>("role_based");
  const [uploadName, setUploadName] = useState<string>("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("one_time");
  const [scheduleAt, setScheduleAt] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>(["Mon"]);
  const [recurringTime, setRecurringTime] = useState("09:30");

  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  const approved = requests.filter((r) => r.status === "Approved");
  const selected = approved.find((r) => r.templateId === templateId);
  const selectedMeta = selected ? CATEGORY_META[selected.categoryId] : null;
  const segment = SEGMENTS.find((s) => s.key === segmentKey)!;

  const canSubmit = useMemo(() => {
    if (!selected) return false;
    if (scheduleType === "one_time") return !!scheduleAt;
    return weekdays.length > 0 && !!recurringTime;
  }, [selected, scheduleType, scheduleAt, weekdays, recurringTime]);

  const submit = () => {
    if (!selected) return;
    const scheduledDisplay =
      scheduleType === "one_time"
        ? scheduleAt
          ? new Date(scheduleAt).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Immediately"
        : `Recurring · ${weekdays.join(", ")} · ${recurringTime}`;

    const methodLabel =
      recipientMethod === "role_based" ? "Role based" : "Ad-hoc upload";
    const segmentString = `${targetLevel} · ${segment.label} · ${methodLabel}`;

    addPublishLog({
      id: `PUB-${Math.floor(1000 + Math.random() * 9000)}`,
      requestId: selected.id,
      templateId: selected.templateId,
      templateName: selected.templateName,
      segment: segmentString,
      scheduledFor: scheduledDisplay,
      submitterName: "You (Template Submitter)",
      publishedAt: new Date().toISOString(),
      status: "Pending Review",
    });

    toast.success(`${selected.templateName} scheduled — Approver notified`);
    setTemplateId("");
    setScheduleAt("");
    setSegmentKey("all");
    setTargetLevel("Vendor");
    setRecipientMethod("role_based");
    setUploadName("");
    setScheduleType("one_time");
    setWeekdays(["Mon"]);
    setRecurringTime("09:30");
  };

  const toggleWeekday = (d: string) =>
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  return (
    <AppShell>
      <div className="workdesk mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Add New Notification
          </h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Workdesk — schedule an approved template to a vendor segment.
        </p>

        <div
          className={cn(
            "space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6",
            "border-l-4",
            selectedMeta ? selectedMeta.border : "border-l-border",
          )}
        >
          {/* Header strip showing selected category */}
          <div
            className={cn(
              "-mx-5 -mt-5 flex items-center justify-between rounded-t-xl px-5 py-2.5 sm:-mx-6 sm:-mt-6 sm:px-6",
              selectedMeta ? selectedMeta.soft : "bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  selectedMeta ? selectedMeta.dot : "bg-muted-foreground/40",
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider",
                  selectedMeta ? selectedMeta.text : "text-muted-foreground",
                )}
              >
                {selectedMeta
                  ? `Category: ${selectedMeta.label}`
                  : "Category: select a template"}
              </span>
            </div>
          </div>

          {/* 1. Notification Type */}
          <div className="grid gap-2">
            <Label htmlFor="notif-type">Notification Type</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="notif-type">
                <SelectValue placeholder="Choose an approved template…" />
              </SelectTrigger>
              <SelectContent>
                {approved.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No approved templates yet.
                  </div>
                ) : (
                  approved.map((r) => {
                    const meta = CATEGORY_META[r.categoryId];
                    return (
                      <SelectItem key={r.templateId} value={r.templateId}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn("h-2 w-2 rounded-full", meta.dot)}
                          />
                          <span>{r.templateName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            · {meta.label}
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Only templates with an approved request are selectable here.
              </p>
            </div>
          </div>

          {/* 2 + 3. Target Level and Segment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="target-level">Target Level</Label>
              <Select
                value={targetLevel}
                onValueChange={(v) => setTargetLevel(v as TargetLevel)}
              >
                <SelectTrigger id="target-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="segment">Segment</Label>
              <Select
                value={segmentKey}
                onValueChange={(v) => setSegmentKey(v as SegmentKey)}
              >
                <SelectTrigger id="segment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Estimated recipients:{" "}
                <span className="font-semibold text-foreground">
                  {segment.recipients.toLocaleString("en-IN")}
                </span>
              </p>
            </div>
          </div>

          {/* 4. Recipient Method */}
          <div className="grid gap-2">
            <Label>Recipient Method</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    key: "role_based" as const,
                    title: "Role based",
                    sub: "Finance POC + Owner roles from directory.",
                  },
                  {
                    key: "ad_hoc" as const,
                    title: "Ad-hoc upload",
                    sub: "Upload extra recipients via file.",
                  },
                ]
              ).map((opt) => {
                const active = recipientMethod === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRecipientMethod(opt.key)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {opt.title}
                      </span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {opt.sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {recipientMethod === "ad_hoc" && (
              <div className="mt-1 rounded-lg border border-dashed border-border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadName ? "Change file" : "Choose file to upload"}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setUploadName(f.name);
                    }}
                  />
                </label>
                {uploadName && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-cat-green-soft px-2.5 py-1.5 text-[11px] text-cat-green">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      <span className="font-semibold">{uploadName}</span> parsed
                      · 884 rows valid · 6 rejected
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Schedule Type */}
          <div className="grid gap-2">
            <Label>Schedule Type</Label>
            <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
              {(
                [
                  { key: "one_time" as const, label: "One time" },
                  { key: "recurring" as const, label: "Recurring" },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setScheduleType(opt.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium transition-colors",
                    scheduleType === opt.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {scheduleType === "one_time" ? (
              <Input
                id="schedule-at"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="mt-1"
              />
            ) : (
              <div className="mt-1 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const active = weekdays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWeekday(d)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <Input
                  type="time"
                  value={recurringTime}
                  onChange={(e) => setRecurringTime(e.target.value)}
                  className="w-32"
                />
              </div>
            )}
          </div>

          <Button className="w-full" disabled={!canSubmit} onClick={submit}>
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
