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
  Zap,
  Bell,
  Shield,
  Pause,
  Save,
  Download,
  ArrowDown,
  Ticket,
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
        <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["All", "Running", "Scheduled", "Pending approval", "Failing", "Completed"] as const).map((s) => {
              const count =
                s === "All"
                  ? campaigns.length
                  : campaigns.filter((c) => c.status === s).length;
              const active = statusFilter === s;
              const label = s === "Pending approval" ? "Pending" : s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                      active
                        ? "bg-background/20 text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or Apollo ID"
              className="h-9 pl-8"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="w-40">Channels</TableHead>
                <TableHead className="w-36">Audience</TableHead>
                <TableHead className="w-44">Trigger</TableHead>
                <TableHead className="w-32">Reminders</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const cat = categoryMeta(c.categoryId);
                const canEdit =
                  c.status === "Scheduled" || c.status === "Pending approval";
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
                    <TableCell className="align-top text-sm">
                      <div className="tabular-nums font-medium">
                        {c.audienceCount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        vendors · {c.segment.replace(" Vendors", "")}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="text-sm">
                        {c.triggerType === "One time" ? "One time" : "Recurring"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.triggerType === "One time"
                          ? c.firstSend.split(",")[0]
                          : c.frequency}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {c.reminders === 0 ? (
                        <span className="text-muted-foreground">n/a</span>
                      ) : (
                        <span className="font-mono text-xs">
                          backoff ×{c.reminders}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusPill status={c.status} />
                    </TableCell>
                    <TableCell
                      className="align-top text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        {canEdit ? "Edit" : "View"}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
  const isWhatsAppOnly =
    c.channels.length === 1 && c.channels[0] === "WhatsApp";
  const hasHistory =
    c.status === "Running" ||
    c.status === "Failing" ||
    c.status === "Completed";
  const canEdit = c.status !== "Completed";

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
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <StatusPill status={c.status} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  "border-primary/30 bg-primary/10 text-foreground",
                )}
              >
                {c.commType ?? cat.label}
              </span>
              <span className="font-mono text-muted-foreground">
                {c.templateId}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Owner:{" "}
                <span className="font-medium text-foreground">
                  {c.submitterName}
                </span>
              </span>
              <span>·</span>
              <span>
                Ack by{" "}
                <span className="font-medium text-foreground">
                  {c.approvedBy}
                </span>
              </span>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() =>
                alert(
                  "Edit flow is a prototype stub — edits happen on the source request in Workdesk / Requests.",
                )
              }
              className="rounded-md border border-primary/40 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Edit
            </button>
          )}
        </div>
      </SheetHeader>

      {c.failureNote && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-cat-red/30 bg-cat-red/5 p-3 text-xs text-cat-red">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{c.failureNote}</span>
        </div>
      )}

      {(c.status === "Running" || c.status === "Failing") && <LiveEditBanner />}

      <Section title="Preset sensitivity strategy">
        <SensitivityStrategies active={strategyForCampaign(c)} />
      </Section>

      <Section title="Sequence timeline">
        <SequenceTimeline campaign={c} />
      </Section>

      <Section title="Recipient audit & telemetry">
        <RecipientAudit seed={c.id} />
      </Section>



      {/* Configuration snapshot */}
      <Section title="Configuration snapshot">
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Messages used
            </div>
            <div className="mt-1.5 space-y-1.5">
              {c.channels.map((ch) => (
                <div
                  key={ch}
                  className="flex items-center gap-2 text-sm"
                >
                  <ChannelIcons channels={[ch]} />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    · {ch}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <Field
              label="Trigger"
              value={
                c.triggerType === "One time"
                  ? `One time · ${c.firstSend}`
                  : `Recurring · ${c.frequency}`
              }
              className="col-span-2"
            />
            <Field
              label="Reminder policy"
              value={
                c.reminders === 0
                  ? "n/a"
                  : `backoff ×${c.reminders} · ${c.priority === "P1" ? "+24h, +48h" : "+48h"}`
              }
            />
            <Field label="Segment" value={c.segment} />
          </div>
        </div>
      </Section>

      {/* Funnel / receipts */}
      <Section
        title={
          isWhatsAppOnly ? "WhatsApp delivery" : "Send funnel"
        }
      >
        {hasHistory ? (
          isWhatsAppOnly ? (
            <WhatsAppReceipts audience={c.audienceCount} seed={c.id} />
          ) : (
            <SendFunnel audience={c.audienceCount} seed={c.id} />
          )
        ) : (
          <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            No send history yet — first send is scheduled for{" "}
            <span className="font-medium text-foreground">{c.firstSend}</span>.
          </p>
        )}
      </Section>

      {c.whatsappMessage && (
        <Section title="WhatsApp preview">
          <div className="rounded-2xl bg-[#ECE5DD] p-3">
            <div className="ml-auto max-w-sm rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-2.5 shadow-sm">
              <p
                className="whitespace-pre-wrap text-[13px] leading-snug text-[#111]"
                style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
              >
                {c.whatsappMessage}
              </p>
            </div>
          </div>
        </Section>
      )}

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
          <Field label="Priority" value={c.priority} />
          <Field label="Category" value={cat.label} />
          <Field
            label="Purpose"
            value={c.purpose}
            className="col-span-2"
          />
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
          Sample data · edits happen on the source request in Workdesk / Requests.
        </p>
      </Section>
    </>
  );
}

// Deterministic pseudo-random from a string seed
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) / 2 ** 31;
}

function SendFunnel({ audience, seed }: { audience: number; seed: string }) {
  const r = hashSeed(seed);
  const delivered = Math.round(audience * (0.94 + r * 0.04));
  const opened = Math.round(delivered * (0.42 + r * 0.15));
  const clicked = Math.round(opened * (0.28 + r * 0.12));
  const goal = Math.round(clicked * (0.35 + r * 0.2));
  const steps = [
    { label: "Targeted", value: audience, tone: "base" as const },
    { label: "Delivered", value: delivered, tone: "base" as const },
    { label: "Opened", value: opened, tone: "base" as const },
    { label: "Clicked", value: clicked, tone: "base" as const },
    { label: "Goal reached", value: goal, tone: "goal" as const },
  ];
  return (
    <div className="space-y-1.5">
      {steps.map((s) => {
        const pct = audience > 0 ? (s.value / audience) * 100 : 0;
        return (
          <div key={s.label} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-foreground">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {s.value.toLocaleString("en-IN")}{" "}
                <span className="text-[10px]">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  s.tone === "goal" ? "bg-cat-green" : "bg-primary",
                )}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WhatsAppReceipts({ audience, seed }: { audience: number; seed: string }) {
  const r = hashSeed(seed);
  const sent = audience;
  const delivered = Math.round(sent * (0.91 + r * 0.05));
  const read = Math.round(delivered * (0.68 + r * 0.18));
  const failed = sent - delivered;
  const rows = [
    { label: "Sent", value: sent, color: "text-foreground" },
    {
      label: "Delivered (✓✓ grey)",
      value: delivered,
      color: "text-muted-foreground",
    },
    { label: "Read (✓✓ blue)", value: read, color: "text-cat-blue" },
    { label: "Failed", value: failed, color: "text-cat-red" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        WhatsApp reports delivery and read receipts — there is no open or click
        signal to funnel.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((row) => {
          const pct = sent > 0 ? (row.value / sent) * 100 : 0;
          return (
            <div
              key={row.label}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {row.label}
              </div>
              <div className={cn("mt-1 text-lg font-semibold tabular-nums", row.color)}>
                {row.value.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {pct.toFixed(1)}% of sent
              </div>
            </div>
          );
        })}
      </div>
    </div>
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

// ---------------- New: Strategy, Timeline, Live Edit, Audit ----------------

type StrategyTier = "FYI" | "Standard" | "Critical";

function strategyForCampaign(c: Campaign): StrategyTier {
  if (c.priority === "P1") return "Critical";
  if (c.priority === "P2") return "Standard";
  return "FYI";
}

const STRATEGIES: {
  tier: StrategyTier;
  Icon: typeof Zap;
  tag: string;
  tagClass: string;
  summary: string;
  bullets: string[];
}[] = [
  {
    tier: "FYI",
    Icon: Bell,
    tag: "Low touch",
    tagClass: "bg-muted text-muted-foreground border-border",
    summary: "Max 1 reminder, same channel, fixed 5-day interval.",
    bullets: [
      "T+0d: Initial send",
      "T+5d: Single reminder, same channel",
      "No escalation, no ticket auto-log",
    ],
  },
  {
    tier: "Standard",
    Icon: Zap,
    tag: "Backoff · escalate",
    tagClass: "bg-cat-blue/10 text-cat-blue border-cat-blue/20",
    summary: "Exponential backoff (2d → 4d → 8d), channel escalation Email → WhatsApp → Dashboard.",
    bullets: [
      "T+0d: Email",
      "T+2d: WhatsApp nudge",
      "T+4d + T+8d: Dashboard banner",
    ],
  },
  {
    tier: "Critical",
    Icon: Shield,
    tag: "SLA enforced",
    tagClass: "bg-cat-red/10 text-cat-red border-cat-red/20",
    summary: "Every 2 days ×5, multi-channel, broadens to secondary POCs, auto-tickets on SLA breach.",
    bullets: [
      "T+0d → T+8d: Every 2d, all channels in parallel",
      "T+4d: Loop in secondary vendor POCs",
      "T+6d: Auto-ticket to Warehouse / Supply Chain Ops (SLA 4h)",
    ],
  },
];

function SensitivityStrategies({ active }: { active: StrategyTier }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STRATEGIES.map((s) => {
        const isActive = s.tier === active;
        return (
          <div
            key={s.tier}
            className={cn(
              "rounded-lg border p-3 text-xs transition",
              isActive
                ? "border-primary/40 bg-primary/10 shadow-sm"
                : "border-border bg-background",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-md border",
                  isActive
                    ? "border-primary/40 bg-primary/20 text-foreground"
                    : "border-border bg-muted/50 text-muted-foreground",
                )}
              >
                <s.Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {s.tier}
                </div>
                <span
                  className={cn(
                    "mt-0.5 inline-flex rounded-full border px-1.5 py-0 text-[10px] font-medium",
                    s.tagClass,
                  )}
                >
                  {s.tag}
                </span>
              </div>
              {isActive && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                  Applied
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {s.summary}
            </p>
            <ul className="mt-2 space-y-1 text-[11px]">
              {s.bullets.map((b) => (
                <li key={b} className="flex gap-1.5">
                  <span className="text-muted-foreground">·</span>
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function SequenceTimeline({ campaign }: { campaign: Campaign }) {
  const steps: {
    t: string;
    title: string;
    detail: string;
    Icon: typeof Mail;
    tone: "done" | "next" | "pending";
    meta?: string;
  }[] = [
    {
      t: "T+0d",
      title: "Email dispatched",
      detail: "With dynamic SQL attachment (rebate_trend_by_vendor.sql)",
      Icon: Mail,
      tone: "done",
      meta: "Delivered",
    },
    {
      t: "T+2d",
      title: "WhatsApp nudge",
      detail: "Fires if goal 'Reconcile' is unfulfilled",
      Icon: MessageCircle,
      tone: campaign.status === "Running" || campaign.status === "Failing" ? "next" : "pending",
      meta: "Conditional",
    },
    {
      t: "T+4d",
      title: "PartnersBiz dashboard banner",
      detail: "Pinned to Action Deck for target segment",
      Icon: LayoutDashboard,
      tone: "pending",
    },
    {
      t: "T+6d",
      title: "Auto-ticket to Warehouse / Supply Chain Ops",
      detail: "SLA: 4 business hours",
      Icon: Ticket,
      tone: "pending",
      meta: "SLA 4h",
    },
  ];
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={s.title} className="relative flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full border-2",
                    s.tone === "done"
                      ? "border-primary bg-primary text-primary-foreground"
                      : s.tone === "next"
                        ? "border-cat-amber bg-cat-amber/10 text-cat-amber"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  <s.Icon className="h-4 w-4" />
                </div>
                {!isLast && (
                  <div className="my-1 w-0.5 flex-1 bg-border" style={{ minHeight: 22 }} />
                )}
              </div>
              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-4")}>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                    {s.t}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {s.title}
                  </span>
                  {s.meta && (
                    <span className="ml-auto rounded-full border border-border bg-muted/50 px-1.5 py-0 text-[10px] text-muted-foreground">
                      {s.meta}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {s.detail}
                </p>
                {!isLast && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <ArrowDown className="h-3 w-3" />
                    <span>if goal not met</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LiveEditBanner() {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-start gap-2 rounded-lg border border-cat-amber/40 bg-cat-amber/10 p-3 text-xs">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cat-amber" />
        <div className="min-w-0">
          <div className="font-semibold text-foreground">
            Editing live campaign
          </div>
          <p className="mt-0.5 text-muted-foreground">
            Changes apply to future reminder steps only. Delivered steps remain
            locked.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <LiveActionBtn Icon={Pause} label="Pause campaign" />
        <LiveActionBtn Icon={Save} label="Apply live changes" primary />
        <LiveActionBtn Icon={Download} label="Export recipient drop logs" />
      </div>
    </div>
  );
}

function LiveActionBtn({
  Icon,
  label,
  primary,
}: {
  Icon: typeof Pause;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => alert(`${label} — prototype action (no-op).`)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
        primary
          ? "border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function RecipientAudit({ seed }: { seed: string }) {
  const r = hashSeed(seed);
  const emId = 9900 + Math.floor(r * 99);
  const events: {
    when: string;
    text: string;
    tone: "info" | "ok" | "goal";
  }[] = [
    { when: "14 Jul 10:00", text: `Email dispatched (#EM-${emId})`, tone: "info" },
    { when: "14 Jul 10:02", text: "Email delivered & opened", tone: "ok" },
    { when: "14 Jul 10:03", text: "Clicked → PartnersBiz Action Deck", tone: "info" },
    {
      when: "15 Jul 09:15",
      text: "Swiped right on PartnersBiz Action Deck (Action Resolved)",
      tone: "ok",
    },
    { when: "15 Jul 09:15", text: "Goal status: Completed ✓", tone: "goal" },
  ];
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="text-[11px] font-medium text-muted-foreground">
          Sample recipient · Kwality Foods Pvt Ltd
        </div>
        <button
          type="button"
          onClick={() => alert("Export telemetry — prototype action.")}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium hover:bg-muted"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
      </div>
      <ol className="divide-y divide-border">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3 px-3 py-2 text-xs">
            <span className="w-20 shrink-0 font-mono text-[10px] text-muted-foreground">
              {e.when}
            </span>
            <span
              className={cn(
                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                e.tone === "goal"
                  ? "bg-cat-green"
                  : e.tone === "ok"
                    ? "bg-primary"
                    : "bg-muted-foreground/60",
              )}
            />
            <span
              className={cn(
                "flex-1",
                e.tone === "goal"
                  ? "font-semibold text-cat-green"
                  : "text-foreground",
              )}
            >
              {e.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

