import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  CalendarPlus,
  Info,
  CheckCircle2,
  ShieldCheck,
  Paperclip,
  BarChart3,
} from "lucide-react";
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
import {
  useRequests,
  addPublishLog,
  syncPublishToNotifications,
  type TemplateRequest,
} from "@/lib/requests-store";
import type { CategoryId } from "@/lib/mock-data";

export const Route = createFileRoute("/notifications/schedule")({
  head: () => ({
    meta: [{ title: "Add New Notification — PartnersBiz Comms Centre" }],
  }),
  component: ScheduleNotificationPage,
});

const CATEGORY_META: Record<
  CategoryId,
  { label: string; dot: string; border: string; soft: string; text: string }
> = {
  action_required: { label: "Action Required", dot: "bg-cat-red", border: "border-l-cat-red", soft: "bg-cat-red-soft", text: "text-cat-red" },
  finance_payments: { label: "Finance & Payments", dot: "bg-cat-amber", border: "border-l-cat-amber", soft: "bg-cat-amber-soft", text: "text-cat-amber" },
  reports_analytics: { label: "Reports & Analytics", dot: "bg-cat-green", border: "border-l-cat-green", soft: "bg-cat-green-soft", text: "text-cat-green" },
  daily_ops: { label: "Daily Ops Updates", dot: "bg-cat-blue", border: "border-l-cat-blue", soft: "bg-cat-blue-soft", text: "text-cat-blue" },
  reminders: { label: "Reminders", dot: "bg-cat-purple", border: "border-l-cat-purple", soft: "bg-cat-purple-soft", text: "text-cat-purple" },
  account_access: { label: "Account & Access", dot: "bg-muted-foreground/60", border: "border-l-muted-foreground/40", soft: "bg-muted", text: "text-muted-foreground" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ScheduleType = "one_time" | "recurring";

// Detect Liquid variables in a body string.
const LIQUID_RE = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
function detectLiquidVars(s: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = LIQUID_RE.exec(s)) !== null) out.add(m[1]);
  return Array.from(out);
}

function targetLevelFromSentTo(sentTo: string[]): "Vendor" | "Manufacturer" {
  return sentTo.some((s) => /manufact/i.test(s)) ? "Manufacturer" : "Vendor";
}

function scheduleTypeFromFrequency(freq: string[]): ScheduleType {
  return freq.some((f) => /weekly|daily|monthly/i.test(f))
    ? "recurring"
    : "one_time";
}

function estimatedRecipients(req: TemplateRequest): number {
  return req.preflightChecks?.audienceCount ?? 450;
}

function attachmentDescriptor(req: TemplateRequest): {
  type: string;
  name: string;
} | null {
  const cfg = req.attachmentConfig;
  if (!cfg || cfg.type === "none") {
    if (req.emailAttachmentsName && req.emailAttachmentsName !== "-") {
      return { type: "static", name: req.emailAttachmentsName };
    }
    return null;
  }
  return {
    type: cfg.type,
    name: cfg.fileName || cfg.queryKey || cfg.s3Path || "attachment",
  };
}

function ScheduleNotificationPage() {
  const { role } = useRole();
  const requests = useRequests();

  const [templateId, setTemplateId] = useState<string>("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("one_time");
  const [scheduleAt, setScheduleAt] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>(["Mon"]);
  const [recurringTime, setRecurringTime] = useState("09:30");

  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  const approved = requests.filter((r) => r.status === "Approved");
  const selected = approved.find((r) => r.templateId === templateId);
  const selectedMeta = selected ? CATEGORY_META[selected.categoryId] : null;

  // Auto-hydrate schedule type from template frequency.
  useEffect(() => {
    if (!selected) return;
    setScheduleType(scheduleTypeFromFrequency(selected.frequency));
  }, [selected]);

  const targetLevel = selected ? targetLevelFromSentTo(selected.sentTo) : "Vendor";
  const audience = selected ? estimatedRecipients(selected) : 0;
  const segmentLabel = selected
    ? `${selected.vendorListName} — ${audience.toLocaleString("en-IN")} estimated recipients`
    : "";
  const attachment = selected ? attachmentDescriptor(selected) : null;
  const liquidVars = selected ? detectLiquidVars(selected.body ?? "") : [];

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

    const segmentString = `${targetLevel} · ${selected.vendorListName} · ${audience.toLocaleString("en-IN")} recipients`;

    const rand = (n: number) =>
      Math.random().toString(16).slice(2, 2 + n).toUpperCase();
    const pubId = `PUB-${Date.now().toString(36).toUpperCase()}-${rand(3)}`;
    const log = {
      id: pubId,
      requestId: selected.id,
      templateId: selected.templateId,
      templateName: selected.templateName,
      segment: segmentString,
      scheduledFor: scheduledDisplay,
      submitterName: "Himanshu Gupta",
      publishedAt: new Date().toISOString(),
      status: "Pending Review" as const,
    };
    addPublishLog(log);
    syncPublishToNotifications(log, selected);

    toast.success(`Scheduled & minted to PartnersBiz`, {
      description: `"${selected.subject}" queued for ${audience.toLocaleString("en-IN")} recipients — vendor card is live.`,
    });
    setTemplateId("");
    setScheduleAt("");
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
          Workdesk — schedule an approved template. All fields below auto-hydrate
          from the linked request.
        </p>

        <div
          className={cn(
            "space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6",
            "border-l-4",
            selectedMeta ? selectedMeta.border : "border-l-border",
          )}
        >
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
                  ? `Category: ${selectedMeta.label} · Priority ${selected!.priority}`
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
                          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
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

          {selected && (
            <>
              {/* Auto-populated block */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Info className="h-3.5 w-3.5" /> Auto-populated from {selected.templateId}
                </div>
                <dl className="grid gap-2.5 text-[12px] sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Subject
                    </dt>
                    <dd className="font-medium text-foreground">
                      {selected.subject}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Body preview
                    </dt>
                    <dd className="mt-0.5 rounded-md border border-border bg-background/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
                      {selected.body ??
                        "Hi {{vendor_name}}, this is a notification regarding {{po_number}}."}
                    </dd>
                    {liquidVars.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {liquidVars.map((v) => (
                          <span
                            key={v}
                            className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary"
                          >
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected.inlineSqlChart && (
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Inline chart
                      </dt>
                      <dd className="mt-0.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-cat-green/40 bg-cat-green-soft px-2 py-1 text-[11px] font-medium text-cat-green">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Inline SQL Chart: {selected.inlineSqlChart}
                        </span>
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Attachment
                    </dt>
                    <dd className="mt-0.5">
                      {attachment ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 text-[11px] font-medium text-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                            {attachment.type}
                          </span>
                          {attachment.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          None
                        </span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      CTA
                    </dt>
                    <dd className="text-[11px] font-medium text-foreground">
                      {selected.cta}
                      {selected.ctaDestination && (
                        <span className="ml-1 text-muted-foreground">
                          → {selected.ctaDestination}
                        </span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Target Level (locked)
                    </dt>
                    <dd className="text-[11px] font-medium text-foreground">
                      {targetLevel}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Frequency
                    </dt>
                    <dd className="text-[11px] font-medium text-foreground">
                      {selected.frequency.join(", ")}
                    </dd>
                  </div>

                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Segment
                    </dt>
                    <dd className="text-[11px] font-medium text-foreground">
                      {segmentLabel}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Pre-flight checks */}
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Pre-flight checks
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <PreflightBadge
                    ok={audience <= 5000}
                    label={`Audience threshold gate · ${audience.toLocaleString("en-IN")}`}
                  />
                  <PreflightBadge
                    ok={!(selected.preflightChecks?.isAtFrequencyCap)}
                    label="Weekly frequency cap"
                  />
                  <PreflightBadge
                    ok={selected.preflightChecks?.waValidated !== false}
                    label="WhatsApp Meta ID registry"
                  />
                </div>
              </div>
            </>
          )}

          {/* Schedule Type */}
          <div className="grid gap-2">
            <Label>
              Schedule Type
              {selected && (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  (auto-set from frequency: {selected.frequency.join(", ")})
                </span>
              )}
            </Label>
            <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
              {[
                { key: "one_time" as const, label: "One time" },
                { key: "recurring" as const, label: "Recurring" },
              ].map((opt) => (
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

function PreflightBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        ok
          ? "border-cat-green/40 bg-cat-green-soft text-cat-green"
          : "border-cat-red/40 bg-cat-red-soft text-cat-red",
      )}
    >
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </span>
  );
}
