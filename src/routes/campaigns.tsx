import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  Megaphone,
  Mail,
  MessageCircle,
  LayoutDashboard,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarClock,
  Circle,
  X,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useRole } from "@/lib/role-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCampaigns, type Campaign, type CampaignChannel, type CampaignStatus } from "@/lib/requests-store";
import { CATEGORIES } from "@/lib/mock-data";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [{ title: "Campaigns — Workdesk" }],
  }),
  component: CampaignsPage,
});

const CAT_DOT: Record<string, string> = {
  red: "bg-cat-red",
  amber: "bg-cat-amber",
  green: "bg-cat-green",
  blue: "bg-cat-blue",
  purple: "bg-cat-purple",
  grey: "bg-muted-foreground",
};

const STATUS_STYLE: Record<CampaignStatus, string> = {
  Running: "bg-cat-green/10 text-cat-green border-cat-green/20",
  Scheduled: "bg-cat-blue/10 text-cat-blue border-cat-blue/20",
  "Pending approval": "bg-cat-amber/10 text-cat-amber border-cat-amber/20",
  Failing: "bg-cat-red/10 text-cat-red border-cat-red/20",
  Completed: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICON: Record<CampaignStatus, typeof Circle> = {
  Running: CheckCircle2,
  Scheduled: CalendarClock,
  "Pending approval": Clock,
  Failing: AlertTriangle,
  Completed: Circle,
};

const ALL_STATUSES: CampaignStatus[] = [
  "Running",
  "Scheduled",
  "Pending approval",
  "Failing",
  "Completed",
];

function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

function CampaignsPage() {
  const { role, internalRole } = useRole();
  const campaigns = useCampaigns();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "All">("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Campaign | null>(null);

  const canSee =
    role === "internal_ops" &&
    (internalRole === "Template Submitter" || internalRole === "Approver");

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.templateId.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [campaigns, statusFilter, query]);

  if (!canSee) return <Navigate to="/requests" replace />;

  return (
    <AppShell>
      <div className="workdesk mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <header className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/15 p-2 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Simulating: Workdesk · live once an Approver acknowledges a published template
            </p>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or Apollo ID"
              className="h-9 pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as CampaignStatus | "All")}
            >
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign name</TableHead>
                <TableHead className="w-40">Channels</TableHead>
                <TableHead className="w-32">Audience</TableHead>
                <TableHead className="w-40">Trigger</TableHead>
                <TableHead className="w-36">Reminders</TableHead>
                <TableHead className="w-40">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const cat = categoryMeta(c.categoryId);
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell className="align-top">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            CAT_DOT[cat.color],
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {c.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {c.templateId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <ChannelIcons channels={c.channels} />
                    </TableCell>
                    <TableCell className="align-top text-sm tabular-nums">
                      {c.audienceCount.toLocaleString("en-IN")}{" "}
                      <span className="text-xs text-muted-foreground">vendors</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <TriggerPill
                        type={c.triggerType}
                        frequency={c.frequency}
                      />
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {c.reminders === 0
                        ? "None"
                        : `${c.reminders} reminder${c.reminders > 1 ? "s" : ""}`}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusPill status={c.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No campaigns match these filters. Acknowledge a published
                    template on the Requests page to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CampaignDetail
        campaign={selected}
        onClose={() => setSelected(null)}
      />
    </AppShell>
  );
}

function ChannelIcons({ channels }: { channels: CampaignChannel[] }) {
  const items: { key: CampaignChannel; Icon: typeof Mail; label: string }[] = [
    { key: "Email", Icon: Mail, label: "Email" },
    { key: "WhatsApp", Icon: MessageCircle, label: "WhatsApp" },
    { key: "Dashboard", Icon: LayoutDashboard, label: "Dashboard" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map(({ key, Icon, label }) => {
        const on = channels.includes(key);
        return (
          <span
            key={key}
            title={label}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md border",
              on
                ? "border-primary/30 bg-primary/15 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground/50",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        );
      })}
    </div>
  );
}

function TriggerPill({
  type,
  frequency,
}: {
  type: "One time" | "Recurring";
  frequency: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-xs">
      <span className="font-medium">{type}</span>
      {type === "Recurring" && (
        <span className="text-muted-foreground">· {frequency}</span>
      )}
    </span>
  );
}

function StatusPill({ status }: { status: CampaignStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        STATUS_STYLE[status],
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

// ---------------- Detail ----------------

function CampaignDetail({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!campaign} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="workdesk w-full max-w-xl overflow-y-auto sm:max-w-xl"
      >
        {campaign && <CampaignDetailBody c={campaign} />}
      </SheetContent>
    </Sheet>
  );
}

function CampaignDetailBody({ c }: { c: Campaign }) {
  const cat = categoryMeta(c.categoryId);
  return (
    <>
      <SheetHeader className="space-y-2 pr-8">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              CAT_DOT[cat.color],
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-left text-lg leading-snug">
              {c.name}
            </SheetTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">
                {c.templateId}
              </span>
              <span className="text-muted-foreground/60">·</span>
              <StatusPill status={c.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Acknowledged by {c.approvedBy} on {c.acknowledgedAt}
            </p>
          </div>
        </div>
      </SheetHeader>

      {c.failureNote && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-cat-red/30 bg-cat-red/5 p-3 text-xs text-cat-red">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{c.failureNote}</span>
        </div>
      )}

      <Section title="Overview">
        <Grid2>
          <Field label="Category" value={cat.label} />
          <Field label="Priority" value={c.priority} />
          <Field label="Comm type" value={c.commType ?? "—"} />
          <Field
            label="Purpose"
            value={c.purpose}
            className="col-span-2"
          />
        </Grid2>
      </Section>

      <Section title="Delivery">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Channels
            </span>
            <ChannelIcons channels={c.channels} />
            <span className="text-xs text-muted-foreground">
              {c.channels.join(" · ")}
            </span>
          </div>
          <Grid2>
            <Field label="Segment" value={c.segment} />
            <Field
              label="Audience"
              value={`${c.audienceCount.toLocaleString("en-IN")} vendors`}
            />
          </Grid2>
          {c.whatsappMessage && (
            <div className="rounded-2xl bg-[#ECE5DD] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#075E54]">
                WhatsApp preview
              </div>
              <div className="ml-auto max-w-sm rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-2.5 shadow-sm">
                <p
                  className="whitespace-pre-wrap text-[13px] leading-snug text-[#111]"
                  style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
                >
                  {c.whatsappMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Schedule">
        <Grid2>
          <Field
            label="Trigger"
            value={
              c.triggerType === "One time"
                ? "One time"
                : `Recurring · ${c.frequency}`
            }
          />
          <Field label="First send" value={c.firstSend} />
          <Field
            label="Reminders"
            value={
              c.reminders === 0
                ? "None"
                : `${c.reminders} · ${c.priority === "P1" ? "+24h, +48h" : "+48h"}`
            }
          />
          <Field label="Frequency" value={c.frequency} />
        </Grid2>
      </Section>

      <Section title="Inherited configuration">
        <Grid2>
          <Field label="Attachment" value={c.attachment} />
          <Field label="CTA" value={c.cta} />
          {c.ctaDestination && (
            <Field
              label="CTA destination"
              value={c.ctaDestination}
              className="col-span-2 break-all"
            />
          )}
          <Field
            label="Formula flags"
            value={c.formulaFlags.join(", ") || "None"}
            className="col-span-2"
          />
        </Grid2>
      </Section>

      <Section title="Timeline">
        <ol className="space-y-2 text-xs">
          <TimelineRow
            label="Request approved"
            when={c.requestApprovedAt ?? "—"}
          />
          <TimelineRow label="Published by submitter" when={fmtISO(c.publishedAt)} />
          <TimelineRow label="Acknowledged by approver" when={c.acknowledgedAt} />
          {c.status === "Failing" && (
            <TimelineRow
              label="Delivery issues detected"
              when={c.acknowledgedAt}
              tone="warn"
            />
          )}
          {c.status === "Completed" && (
            <TimelineRow label="Campaign completed" when={c.firstSend} tone="done" />
          )}
        </ol>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Read-only view · sample data. Edits happen on the source request in
          Workdesk / Requests.
        </p>
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-border pt-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  );
}

function TimelineRow({
  label,
  when,
  tone,
}: {
  label: string;
  when: string;
  tone?: "warn" | "done";
}) {
  const dot =
    tone === "warn"
      ? "bg-cat-red"
      : tone === "done"
        ? "bg-muted-foreground"
        : "bg-primary";
  return (
    <li className="flex items-center gap-2">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      <span className="font-medium text-foreground">{label}</span>
      <span className="ml-auto text-muted-foreground">{when}</span>
    </li>
  );
}

function fmtISO(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Silence unused import warning for X in some editors
void X;
