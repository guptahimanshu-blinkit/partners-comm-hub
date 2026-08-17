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
  Plus,
  ArrowLeft,
  ArrowRight,
  X,
  ArrowUp,
  Pencil,
  Users,
  Info,
  FileText,
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
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  useCampaigns,
  useRequests,
  addCampaign,
  updateCampaign,
  updateCampaignStatus,
  nowStamp,
  type Campaign,
  type CampaignChannel,
  type CampaignStatus,
  type TemplateRequest,
  useVendorActionEvents,
  useVendorTelemetry,
  type VendorActionTelemetry,
} from "@/lib/requests-store";
import { CATEGORIES } from "@/lib/mock-data";
import {
  CAMP_CATS,
  CAMP_CAT_KEYS,
  CDP_SEGMENTS,
  CAMPAIGN_TEMPLATES,
  LARGE_AUDIENCE_THRESHOLD,
  type CampaignCategory,
} from "@/lib/campaign-catalog";
import { toast } from "sonner";


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
  Paused: "bg-cat-amber/10 text-cat-amber border-cat-amber/20",
  Scheduled: "bg-cat-blue/10 text-cat-blue border-cat-blue/20",
  "Pending approval": "bg-cat-amber/10 text-cat-amber border-cat-amber/20",
  Failing: "bg-cat-red/10 text-cat-red border-cat-red/20",
  Completed: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICON: Record<CampaignStatus, typeof Circle> = {
  Running: CheckCircle2,
  Paused: Pause,
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
  const [wizardOpen, setWizardOpen] = useState(false);


  const canSee =
    role === "internal_ops" &&
    (internalRole === "Template Submitter" || internalRole === "Approver");

  const tabCounts = useMemo(
    () => ({
      All: campaigns.length,
      Running: campaigns.filter((c) => c.status === "Running").length,
      Scheduled: campaigns.filter((c) => c.status === "Scheduled").length,
      "Pending approval": campaigns.filter((c) => c.status === "Pending approval").length,
      Failing: campaigns.filter((c) => c.status === "Failing").length,
      Completed: campaigns.filter((c) => c.status === "Completed").length,
    }),
    [campaigns],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (q) {
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
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Simulating: Workdesk · live once an Approver acknowledges a published template
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </button>
        </header>


        {/* Toolbar */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["All", "Running", "Scheduled", "Pending approval", "Failing", "Completed"] as const).map((s) => {
              const count = tabCounts[s];
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

      <NewCampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
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
  const isLive =
    c.status === "Running" || c.status === "Failing" || c.status === "Paused";
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<{
    sensitivity: "FYI" | "Standard" | "Critical";
    reminders: number;
    frequency: Campaign["frequency"];
    extraVendorIds: string[];
    newVendorId: string;
  }>({
    sensitivity: c.sensitivity ?? strategyForCampaign(c),
    reminders: c.reminders,
    frequency: c.frequency,
    extraVendorIds: c.extraVendorIds ?? [],
    newVendorId: "",
  });

  const startEdit = () => {
    setDraft({
      sensitivity: c.sensitivity ?? strategyForCampaign(c),
      reminders: c.reminders,
      frequency: c.frequency,
      extraVendorIds: c.extraVendorIds ?? [],
      newVendorId: "",
    });
    setEditMode(true);
  };

  const applyChanges = () => {
    updateCampaign(c.id, {
      sensitivity: draft.sensitivity,
      reminders: draft.reminders,
      frequency: draft.frequency,
      extraVendorIds: draft.extraVendorIds,
    });
    toast.success("Live changes applied — future reminder steps updated");
    setEditMode(false);
  };


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
          {canEdit && !editMode && (
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md border border-primary/40 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Edit
            </button>
          )}
          {editMode && (
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              Cancel
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

      {isLive && (
        <LiveEditBanner
          campaign={c}
          editMode={editMode}
          onApply={applyChanges}
          canApply={editMode}
        />
      )}

      {editMode && isLive && (
        <Section title="Edit live campaign">
          <EditLivePanel
            draft={draft}
            setDraft={setDraft}
            currentStrategy={strategyForCampaign(c)}
          />
        </Section>
      )}

      <Section title="Preset sensitivity strategy">
        <SensitivityStrategies active={draft.sensitivity && editMode ? draft.sensitivity : (c.sensitivity ?? strategyForCampaign(c))} />
      </Section>

      <Section title="Sequence timeline">
        <SequenceTimeline campaign={c} />
      </Section>


      <Section title="Recipient audit & telemetry">
        <RecipientAudit seed={c.id} />
      </Section>

      <Section title="Delivery & bounce exceptions">
        <DeliveryExceptionsPanel campaignId={c.id} />
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

      <Section title="Vendor action telemetry log">
        <VendorTelemetryLog campaign={c} />
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

function LiveEditBanner({
  campaign,
  editMode,
  onApply,
  canApply,
}: {
  campaign: Campaign;
  editMode: boolean;
  onApply: () => void;
  canApply: boolean;
}) {
  const isPaused = campaign.status === "Paused";

  const handlePauseResume = () => {
    if (isPaused) {
      updateCampaignStatus(campaign.id, "Running");
      toast.success("Campaign resumed", {
        description: "Future sends will proceed as scheduled.",
      });
    } else {
      updateCampaignStatus(campaign.id, "Paused");
      toast.success("Campaign paused — future schedule held");
    }
  };

  const handleExport = () => {
    const rows: string[][] = [
      ["Recipient ID", "Vendor Name", "Channel", "Delivery Status", "Timestamp"],
    ];
    const channels = campaign.channels;
    const statuses = ["Delivered", "Dropped", "Bounced", "Pending"] as const;
    const count = Math.min(50, Math.max(10, Math.floor(campaign.audienceCount / 20)));
    for (let i = 0; i < count; i++) {
      const rid = `RCP-${campaign.id.replace(/[^A-Z0-9]/gi, "")}-${String(i + 1).padStart(4, "0")}`;
      const vendor = `Vendor ${String.fromCharCode(65 + (i % 26))}${i}`;
      const channel = channels[i % channels.length] ?? "Email";
      const status = statuses[i % statuses.length];
      const ts = new Date(Date.now() - i * 3600_000).toISOString();
      rows.push([rid, vendor, channel, status, ts]);
    }
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drop_logs_${campaign.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Recipient drop logs exported successfully");
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-start gap-2 rounded-lg border border-cat-amber/40 bg-cat-amber/10 p-3 text-xs">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cat-amber" />
        <div className="min-w-0">
          <div className="font-semibold text-foreground">
            {isPaused
              ? "Paused campaign"
              : editMode
                ? "Editing live campaign"
                : "Live campaign"}
          </div>
          <p className="mt-0.5 text-muted-foreground">
            Changes apply to future reminder steps only. Delivered steps (T+0)
            remain locked.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <LiveActionBtn
          Icon={Pause}
          label={isPaused ? "Resume campaign" : "Pause campaign"}
          onClick={handlePauseResume}
        />
        <LiveActionBtn
          Icon={Save}
          label="Apply live changes"
          primary
          disabled={!canApply}
          onClick={onApply}
        />
        <LiveActionBtn
          Icon={Download}
          label="Export recipient drop logs"
          onClick={handleExport}
        />
      </div>
    </div>
  );
}

function LiveActionBtn({
  Icon,
  label,
  primary,
  disabled,
  onClick,
}: {
  Icon: typeof Pause;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
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

type EditDraft = {
  sensitivity: "FYI" | "Standard" | "Critical";
  reminders: number;
  frequency: Campaign["frequency"];
  extraVendorIds: string[];
  newVendorId: string;
};

function EditLivePanel({
  draft,
  setDraft,
  currentStrategy,
}: {
  draft: EditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
  currentStrategy: "FYI" | "Standard" | "Critical";
}) {
  const addVendor = () => {
    const v = draft.newVendorId.trim();
    if (!v) return;
    if (draft.extraVendorIds.includes(v)) return;
    setDraft((d) => ({ ...d, extraVendorIds: [...d.extraVendorIds, v], newVendorId: "" }));
  };
  const removeVendor = (v: string) =>
    setDraft((d) => ({ ...d, extraVendorIds: d.extraVendorIds.filter((x) => x !== v) }));

  return (
    <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="rounded-md border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Locked: </span>
        T+0 initial send and all delivered steps are immutable. Edits below only
        affect future reminder steps.
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Sensitivity strategy
        </Label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(["FYI", "Standard", "Critical"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, sensitivity: s }))}
              className={cn(
                "rounded-md border px-2 py-1.5 text-xs font-medium transition",
                draft.sensitivity === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {s}
              {s === currentStrategy && draft.sensitivity !== s && (
                <span className="ml-1 text-[9px] text-muted-foreground">(current)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Future reminders
          </Label>
          <Input
            type="number"
            min={0}
            max={5}
            value={draft.reminders}
            onChange={(e) =>
              setDraft((d) => ({ ...d, reminders: Math.max(0, Math.min(5, Number(e.target.value) || 0)) }))
            }
            className="mt-1.5 h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Frequency
          </Label>
          <select
            value={draft.frequency}
            onChange={(e) =>
              setDraft((d) => ({ ...d, frequency: e.target.value as Campaign["frequency"] }))
            }
            className="mt-1.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            {["Once", "Daily", "Weekly", "Monthly", "Quarterly"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Add vendor IDs to audience
        </Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            value={draft.newVendorId}
            onChange={(e) => setDraft((d) => ({ ...d, newVendorId: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVendor();
              }
            }}
            placeholder="e.g. VND-77120"
            className="h-8 text-xs"
          />
          <button
            type="button"
            onClick={addVendor}
            className="rounded-md border border-primary/40 bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add
          </button>
        </div>
        {draft.extraVendorIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.extraVendorIds.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium"
              >
                {v}
                <button
                  type="button"
                  onClick={() => removeVendor(v)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${v}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          New vendor IDs join from the next reminder step onward.
        </p>
      </div>
    </div>
  );
}


function RecipientAudit({ seed }: { seed: string }) {
  const r = hashSeed(seed);
  const emId = 9900 + Math.floor(r * 99);
  const vendorEvents = useVendorActionEvents();
  const baseEvents: {
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
  const liveEvents = vendorEvents.slice(0, 4).map((e) => ({
    when: new Date(e.when).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    text: e.text,
    tone: "goal" as const,
  }));
  const events = [...liveEvents, ...baseEvents];
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


// ============= Delivery & bounce exceptions (per-campaign) =============

const BOUNCE_POOL: {
  vendor: string;
  vendorId: string;
  channel: "Email" | "WhatsApp";
  reason: string;
  contact: string;
}[] = [
  { vendor: "Aashirvaad Foods", vendorId: "V-8821", channel: "Email", reason: "550 Mailbox Full", contact: "scm-lead@aashirvaad.co" },
  { vendor: "Sunfeast Retail", vendorId: "V-4410", channel: "Email", reason: "550 Mailbox Not Found", contact: "ops@sunfeast-retail.in" },
  { vendor: "Bingo Snacks Co.", vendorId: "V-6612", channel: "Email", reason: "Domain Firewall Block", contact: "finance@bingosnacks.in" },
  { vendor: "Mangaldeep Traders", vendorId: "V-3320", channel: "WhatsApp", reason: "Recipient not on WhatsApp", contact: "+91 98200 44119" },
  { vendor: "Classmate Stationers", vendorId: "V-7712", channel: "Email", reason: "550 Mailbox Full", contact: "accounts@classmate-st.in" },
];

function DeliveryExceptionsPanel({ campaignId }: { campaignId: string }) {
  const seed = hashSeed(campaignId);
  // 2–4 bounces per campaign, deterministic slice from the pool
  const count = 2 + Math.floor(seed * 3);
  const start = Math.floor(seed * BOUNCE_POOL.length);
  const initial = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const src = BOUNCE_POOL[(start + i) % BOUNCE_POOL.length];
        // Stable timestamp within the last 48h
        const minutes = Math.floor(((seed * 1000 + i * 137) % 2880));
        const d = new Date(Date.now() - minutes * 60_000);
        return {
          ...src,
          id: `bx-${campaignId}-${i}`,
          timestamp: d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaignId],
  );

  const [rows, setRows] = useState(initial);

  const onUpdate = (id: string, vendorId: string, next: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, contact: next } : r)),
    );
    toast.success(`Contact updated for Vendor ${vendorId} — re-queued for delivery`);
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 text-xs text-muted-foreground">
        No delivery exceptions logged for this campaign run.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <div className="text-[11px] font-medium text-muted-foreground">
          {rows.length} vendor{rows.length === 1 ? "" : "s"} bouncing on this campaign run
        </div>
        <span className="rounded-md bg-cat-red-soft px-2 py-0.5 text-[10px] font-semibold text-cat-red">
          Requires contact refresh
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Failure reason</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <BounceRow key={r.id} r={r} onUpdate={onUpdate} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BounceRow({
  r,
  onUpdate,
}: {
  r: {
    id: string;
    vendor: string;
    vendorId: string;
    channel: "Email" | "WhatsApp";
    reason: string;
    contact: string;
    timestamp: string;
  };
  onUpdate: (id: string, vendorId: string, next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(r.contact);

  const save = () => {
    if (!draft.trim()) return;
    onUpdate(r.id, r.vendorId, draft.trim());
    setOpen(false);
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.vendor}</span>
          <span className="text-[10px] text-muted-foreground">{r.vendorId}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
          {r.channel}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{r.reason}</TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground">
        {r.timestamp}
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
              >
                Update Contact
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2">
              <div className="text-xs font-semibold text-foreground">
                Update {r.channel === "Email" ? "email" : "phone"} for {r.vendor}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Current: <span className="font-mono">{r.contact}</span>
              </div>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  r.channel === "Email" ? "new-lead@vendor.com" : "+91 98000 00000"
                }
                className="h-8 text-xs"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save & re-queue
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TableCell>
    </TableRow>
  );
}





// ============= New Campaign Wizard (6 steps) =============

type Owner =
  | "biz-fin"
  | "finance-ops"
  | "category"
  | "monetisation"
  | "supply";
type TargetLevel = "Vendor" | "Manufacturer";
type AudienceMethod = "Role-based" | "Ad-hoc Users" | "Excel Upload";
type TriggerKind = "One-time" | "Event-based" | "Recurring";
type StrategyChoice = "FYI" | "Standard" | "Critical";
type EscalationChannel = "WhatsApp" | "Dashboard Banner";

type WizMessage = {
  key: string;
  requestId: string;
  templateId: string;
  name: string;
  channel: CampaignChannel;
  variables: string[];
};

const OWNER_LABEL: Record<Owner, string> = {
  "biz-fin": "Business Finance",
  "finance-ops": "Finance Ops",
  category: "Category Team",
  monetisation: "Monetisation",
  supply: "Supply Chain",
};

const SEGMENTS = CDP_SEGMENTS;

const CAMP_CAT_ICON: Record<CampaignCategory, typeof Bell> = {
  actionable: Zap,
  payments: Shield,
  updates: Bell,
  promotional: Megaphone,
};

const CHANNEL_OPTIONS: CampaignChannel[] = ["Email", "WhatsApp", "Dashboard"];

const EVENT_TRIGGERS = [
  "invoice_overdue",
  "ads_credit_low",
  "grn_discrepancy_raised",
  "po_cancelled",
];

const RECURRING_PATTERNS = [
  "Every Monday at 10:00 IST",
  "Every weekday at 09:00 IST",
  "1st of every month at 09:00 IST",
];

const STEP_TITLES = [
  "Basics",
  "Audience",
  "Message sequencing",
  "Schedule",
  "Reminders",
  "Review & launch",
];

const LIQUID_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function detectVariables(text: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = LIQUID_REGEX.exec(text)) !== null) found.add(m[1]);
  return Array.from(found);
}

function inferChannelFromName(name: string): CampaignChannel {
  const n = name.toLowerCase();
  if (n.includes("whatsapp") || n.includes("wa ")) return "WhatsApp";
  if (n.includes("banner") || n.includes("dashboard") || n.includes("card"))
    return "Dashboard";
  return "Email";
}

function initialWizardState() {
  return {
    step: 1 as 1 | 2 | 3 | 4 | 5 | 6,
    // Step 1
    name: "",
    owner: "" as Owner | "",
    campCat: "" as CampaignCategory | "",
    // Step 2
    targetLevel: "Vendor" as TargetLevel,
    segment: SEGMENTS[0].key,
    methods: new Set<AudienceMethod>(["Role-based"]),
    // Step 3
    messages: [] as WizMessage[],
    libraryOpen: false,
    // Step 4
    trigger: "One-time" as TriggerKind,
    triggerDate: "",
    triggerTime: "10:00",
    triggerEvent: EVENT_TRIGGERS[0],
    recurringPattern: RECURRING_PATTERNS[0],
    // Step 5
    strategy: "Standard" as StrategyChoice,
    escalationChannel: "WhatsApp" as EscalationChannel,
    reminderTemplate: "",
  };
}

function NewCampaignWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const requests = useRequests();
  const campaigns = useCampaigns();
  const [s, setS] = useState(initialWizardState);

  const approvedTemplates = useMemo(
    () => requests.filter((r) => r.status === "Approved"),
    [requests],
  );

  const audienceCount = useMemo(() => {
    const seg = SEGMENTS.find((x) => x.key === s.segment);
    return seg?.count ?? 0;
  }, [s.segment]);

  const overlapWarning = useMemo(() => {
    const active = campaigns.filter(
      (c) => c.status === "Running" || c.status === "Scheduled",
    );
    return active.find(
      (c) => c.segment === s.segment && audienceCount > 500,
    );
  }, [campaigns, s.segment, audienceCount]);

  const remindersDisabled = s.trigger === "Recurring";
  const largeAudience = audienceCount > LARGE_AUDIENCE_THRESHOLD;

  const canNext = (() => {
    if (s.step === 1) return s.name.trim() && s.owner && s.campCat;
    if (s.step === 2) return s.methods.size > 0;
    if (s.step === 3) return s.messages.length > 0;
    if (s.step === 4) {
      if (s.trigger === "One-time") return s.triggerDate && s.triggerTime;
      if (s.trigger === "Event-based") return !!s.triggerEvent;
      return !!s.recurringPattern;
    }
    if (s.step === 5) return true;
    return true;
  })();

  const reset = () => setS(initialWizardState());

  const handleClose = () => {
    onClose();
    // Reset after close animation
    setTimeout(reset, 200);
  };

  const buildCampaign = (status: CampaignStatus): Campaign => {
    const first = s.messages[0];
    const uniqChannels: CampaignChannel[] = Array.from(
      new Set(s.messages.map((m) => m.channel)),
    );
    const reminderCount =
      s.strategy === "Critical" ? 5 : s.strategy === "Standard" ? 3 : 1;
    return {
      id: `CMP-W${Math.floor(Math.random() * 900000 + 100000)}`,
      requestId: first?.requestId ?? "REQ-WIZARD",
      templateId: first?.templateId ?? "APOLLO-WIZARD",
      name: s.name.trim(),
      categoryId:
        s.campCat === "payments"
          ? "finance_payments"
          : s.campCat === "actionable"
            ? "action_required"
            : s.campCat === "promotional"
              ? "reminders"
              : "daily_ops",
      priority:
        s.strategy === "Critical"
          ? "P1"
          : s.strategy === "Standard"
            ? "P2"
            : "P3",
      purpose: `${s.campCat ? CAMP_CATS[s.campCat].name : "Campaign"} campaign owned by ${OWNER_LABEL[s.owner as Owner]}.`,
      channels: uniqChannels.length ? uniqChannels : ["Email"],
      segment: s.segment,
      audienceCount,
      triggerType: s.trigger === "Recurring" ? "Recurring" : "One time",
      frequency: s.trigger === "Recurring" ? "Weekly" : "Once",
      reminders: remindersDisabled ? 0 : reminderCount,
      status,
      attachment: "None",
      cta: "Direct Link",
      formulaFlags: ["None"],
      approvedBy: status === "Pending approval" ? "—" : "Aisha Khan",
      acknowledgedAt:
        status === "Pending approval" ? "Awaiting acknowledgement" : nowStamp(),
      firstSend:
        s.trigger === "One-time"
          ? `${s.triggerDate}, ${s.triggerTime}`
          : s.trigger === "Recurring"
            ? s.recurringPattern
            : `On event: ${s.triggerEvent}`,
      submitterName: "Himanshu Gupta",
      requestApprovedAt: nowStamp(),
      publishedAt: new Date().toISOString(),
    };
  };

  const launch = () => {
    addCampaign(buildCampaign("Running"));
    toast.success("Campaign launched — now running at the top of the list.");
    handleClose();
  };

  const saveDraft = () => {
    toast.success("Draft saved (prototype — not persisted).");
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="workdesk max-h-[90vh] w-full max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Create Campaign</DialogTitle>
        </DialogHeader>

        <Stepper current={s.step} />

        <div className="mt-4 space-y-4">
          {s.step === 1 && (
            <StepBasics state={s} setState={setS} />
          )}
          {s.step === 2 && (
            <StepAudience
              state={s}
              setState={setS}
              audienceCount={audienceCount}
              overlapName={overlapWarning?.name}
            />
          )}
          {s.step === 3 && (
            <StepSequencing
              state={s}
              setState={setS}
              approvedTemplates={approvedTemplates}
              campCat={s.campCat}
            />
          )}
          {s.step === 4 && <StepSchedule state={s} setState={setS} />}
          {s.step === 5 && (
            <StepReminders
              state={s}
              setState={setS}
              disabled={remindersDisabled}
            />
          )}
          {s.step === 6 && (
            <StepReview
              state={s}
              audienceCount={audienceCount}
              largeAudience={largeAudience}
            />
          )}
        </div>

        <DialogFooter className="mt-6 flex-row items-center justify-between gap-2 sm:justify-between">
          <button
            type="button"
            onClick={() =>
              s.step > 1 && setS((p) => ({ ...p, step: (p.step - 1) as 1 }))
            }
            disabled={s.step === 1}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          <div className="flex items-center gap-2">
            {s.step === 6 && (
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Save className="h-3.5 w-3.5" />
                Save as draft
              </button>
            )}
            {s.step < 6 && (
              <button
                type="button"
                onClick={() =>
                  canNext &&
                  setS((p) => ({ ...p, step: (p.step + 1) as 2 }))
                }
                disabled={!canNext}
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {s.step === 6 && (
              <button
                type="button"
                onClick={launch}
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="h-3.5 w-3.5" />
                Launch Campaign
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mt-2 flex items-center gap-1 overflow-x-auto pb-1">
      {STEP_TITLES.map((title, idx) => {
        const n = idx + 1;
        const done = current > n;
        const active = current === n;
        return (
          <li key={title} className="flex min-w-0 items-center gap-1">
            <div
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
            </div>
            <span
              className={cn(
                "truncate text-[11px]",
                active
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {title}
            </span>
            {n < STEP_TITLES.length && (
              <span className="mx-1 h-px w-4 shrink-0 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type WizState = ReturnType<typeof initialWizardState>;
type WizSetter = React.Dispatch<React.SetStateAction<WizState>>;

function StepBasics({
  state,
  setState,
}: {
  state: WizState;
  setState: WizSetter;
}) {
  const pickCategory = (key: CampaignCategory) => {
    if (state.campCat === key) return;
    const hasDownstreamData =
      state.messages.length > 0 ||
      state.strategy !== "Standard" ||
      state.reminderTemplate.trim().length > 0;
    if (
      state.campCat &&
      hasDownstreamData &&
      !window.confirm(
        "Changing the campaign category clears the message sequence and reminder setup. Continue?",
      )
    ) {
      return;
    }
    setState((p) => ({
      ...p,
      campCat: key,
      messages: [],
      strategy: (CAMP_CATS[key].defaultTier === "critical"
        ? "Critical"
        : CAMP_CATS[key].defaultTier === "standard"
          ? "Standard"
          : "FYI") as StrategyChoice,
      escalationChannel: "WhatsApp",
      reminderTemplate: "",
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="wiz-name">Campaign name</Label>
        <Input
          id="wiz-name"
          placeholder="e.g. Q2 Rebate Reconciliation"
          value={state.name}
          onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="wiz-owner">Owner</Label>
        <select
          id="wiz-owner"
          value={state.owner}
          onChange={(e) =>
            setState((p) => ({ ...p, owner: e.target.value as Owner }))
          }
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Select owner…</option>
          {(Object.keys(OWNER_LABEL) as Owner[]).map((k) => (
            <option key={k} value={k}>
              {OWNER_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label>Campaign category</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {CAMP_CAT_KEYS.map((key) => {
            const meta = CAMP_CATS[key];
            const active = state.campCat === key;
            const Icon = CAMP_CAT_ICON[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickCategory(key)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left transition",
                  active
                    ? "border-primary/60 bg-primary/10 shadow-sm"
                    : "border-border bg-background hover:bg-muted/40",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {meta.name}
                    </span>
                    <span className="rounded-full border border-border bg-muted/60 px-1.5 py-0 text-[10px] uppercase text-muted-foreground">
                      {meta.defaultTier}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {meta.desc}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {meta.channels.map((ch) => (
                      <span
                        key={ch}
                        className="rounded border border-border bg-background px-1 py-0 text-[10px] text-muted-foreground"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {state.campCat && (
          <p className="text-[11px] text-muted-foreground">
            Governance is inherited from the pre-approved templates in:{" "}
            {CAMP_CATS[state.campCat].tplCats.join(" · ")} — no separate admin
            approval is required for the campaign.
          </p>
        )}
      </div>
    </div>
  );
}

function StepAudience({
  state,
  setState,
  audienceCount,
  overlapName,
}: {
  state: WizState;
  setState: WizSetter;
  audienceCount: number;
  overlapName?: string;
}) {
  const toggleMethod = (m: AudienceMethod) => {
    setState((p) => {
      const next = new Set(p.methods);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return { ...p, methods: next };
    });
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Target level</Label>
        <div className="flex gap-2">
          {(["Vendor", "Manufacturer"] as TargetLevel[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setState((p) => ({ ...p, targetLevel: t }))}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium",
                state.targetLevel === t
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/40",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Saved segments</Label>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {SEGMENTS.map((seg) => {
            const active = state.segment === seg.key;
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => setState((p) => ({ ...p, segment: seg.key }))}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                  active ? "bg-primary/10" : "bg-background hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                    active ? "border-primary" : "border-border",
                  )}
                >
                  {active && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {seg.key}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {seg.desc}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-xs font-semibold text-foreground">
                  {seg.count.toLocaleString("en-IN")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {audienceCount > LARGE_AUDIENCE_THRESHOLD && (
        <div className="flex items-start gap-2 rounded-lg border border-cat-blue/30 bg-cat-blue/5 p-3 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cat-blue" />
          <span className="text-foreground">
            Large audience selected — please verify your targeting before
            launch.
          </span>
        </div>
      )}

      <div className="grid gap-2">
        <Label>Recipient method</Label>
        <div className="space-y-1.5">
          {(["Role-based", "Ad-hoc Users", "Excel Upload"] as AudienceMethod[]).map(
            (m) => (
              <label
                key={m}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={state.methods.has(m)}
                  onCheckedChange={() => toggleMethod(m)}
                />
                <span>{m}</span>
                {m === "Role-based" && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    Finance POC / Owner
                  </span>
                )}
              </label>
            ),
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <div className="font-semibold text-foreground">
            {audienceCount.toLocaleString("en-IN")}{" "}
            {state.targetLevel.toLowerCase()}s resolved
          </div>
          <p className="mt-0.5 text-muted-foreground">
            Live audience count for “{state.segment}”.
          </p>
        </div>
      </div>

      {overlapName && (
        <div className="flex items-start gap-2 rounded-lg border border-cat-amber/40 bg-cat-amber/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cat-amber" />
          <div>
            <div className="font-semibold text-foreground">
              Audience overlaps &gt;50% with active campaign
            </div>
            <p className="mt-0.5 text-muted-foreground">
              “{overlapName}” is already targeting this segment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepSequencing({
  state,
  setState,
  approvedTemplates,
  campCat,
}: {
  state: WizState;
  setState: WizSetter;
  approvedTemplates: TemplateRequest[];
  campCat: CampaignCategory | "";
}) {
  const move = (idx: number, dir: -1 | 1) => {
    setState((p) => {
      const arr = [...p.messages];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...p, messages: arr };
    });
  };
  const remove = (key: string) =>
    setState((p) => ({
      ...p,
      messages: p.messages.filter((m) => m.key !== key),
    }));
  const addFromTemplate = (t: TemplateRequest) => {
    const vars = detectVariables(`${t.subject} ${t.purpose}`);
    setState((p) => ({
      ...p,
      libraryOpen: false,
      messages: [
        ...p.messages,
        {
          key: `${t.id}-${Date.now()}`,
          requestId: t.id,
          templateId: t.templateId,
          name: t.templateName,
          channel: inferChannelFromName(t.templateName),
          variables: vars.length ? vars : ["vendor_name"],
        },
      ],
    }));
  };
  const setChannel = (key: string, ch: CampaignChannel) =>
    setState((p) => ({
      ...p,
      messages: p.messages.map((m) =>
        m.key === key ? { ...m, channel: ch } : m,
      ),
    }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Drag together the ordered comms chain — each message fires in sequence.
        Only approved templates from Requests are selectable.
      </p>

      {state.messages.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          No messages added yet. Add one from the template library below.
        </div>
      )}

      <ol className="space-y-2">
        {state.messages.map((m, i) => (
          <li
            key={m.key}
            className="flex items-start gap-2 rounded-lg border border-border bg-background p-3"
          >
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <ChannelBadge channel={m.channel} />
                <span className="text-sm font-medium text-foreground">
                  {m.name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {m.templateId}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {m.variables.map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-cat-amber/30 bg-cat-amber/10 px-1.5 py-0 font-mono text-[10px] text-cat-amber"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  Channel:
                </span>
                {CHANNEL_OPTIONS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(m.key, ch)}
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[10px]",
                      m.channel === ch
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <IconBtn
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                onClick={() => move(i, 1)}
                disabled={i === state.messages.length - 1}
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                onClick={() =>
                  toast.info("Edit template — prototype stub.")
                }
                title="Edit template"
              >
                <Pencil className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                onClick={() => remove(m.key)}
                title="Remove"
                danger
              >
                <X className="h-3.5 w-3.5" />
              </IconBtn>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => setState((p) => ({ ...p, libraryOpen: true }))}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Message from Template Library
      </button>

      <TemplateLibraryDialog
        open={state.libraryOpen}
        campCat={campCat}
        onPickCatalog={(t) =>
          setState((p) => ({
            ...p,
            libraryOpen: false,
            messages: [
              ...p.messages,
              {
                key: `${t.id}-${p.messages.length}`,
                requestId: "REQ-PREAPPROVED",
                templateId: t.id,
                name: t.name,
                channel: (t.channel === "Email" ||
                t.channel === "WhatsApp"
                  ? t.channel
                  : "Dashboard") as CampaignChannel,
                variables: [],
              },
            ],
          }))
        }
        templates={approvedTemplates}
        onPick={addFromTemplate}
        onClose={() =>
          setState((p) => ({ ...p, libraryOpen: false }))
        }
      />
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "grid h-6 w-6 place-items-center rounded-md border",
        disabled
          ? "border-border bg-muted/30 text-muted-foreground/40"
          : danger
            ? "border-cat-red/40 bg-cat-red/10 text-cat-red hover:bg-cat-red/20"
            : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function ChannelBadge({ channel }: { channel: CampaignChannel }) {
  const Icon =
    channel === "Email"
      ? Mail
      : channel === "WhatsApp"
        ? MessageCircle
        : LayoutDashboard;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-foreground">
      <Icon className="h-3 w-3" />
      {channel}
    </span>
  );
}

function TemplateLibraryDialog({
  open,
  templates,
  campCat,
  onPick,
  onPickCatalog,
  onClose,
}: {
  open: boolean;
  templates: TemplateRequest[];
  campCat: CampaignCategory | "";
  onPick: (t: TemplateRequest) => void;
  onPickCatalog: (t: (typeof CAMPAIGN_TEMPLATES)[number]) => void;
  onClose: () => void;
}) {
  const catalog = campCat
    ? CAMPAIGN_TEMPLATES.filter((t) =>
        CAMP_CATS[campCat].tplCats.includes(t.templateCategory),
      )
    : [];
  const campaigns = useCampaigns();
  const usageByTemplate = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of campaigns) {
      if (c.status === "Running" || c.status === "Failing") {
        map.set(c.templateId, (map.get(c.templateId) ?? 0) + 1);
      }
    }
    return map;
  }, [campaigns]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="workdesk max-h-[70vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Pick a template</DialogTitle>
        </DialogHeader>

        {catalog.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pre-approved · {CAMP_CATS[campCat as CampaignCategory].name}
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {catalog.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPickCatalog(t)}
                    className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {t.name}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono">{t.id}</span>
                        <span>· {t.channel}</span>
                        <span>· {t.templateCategory}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Mock stat: {t.stat.ackRate}% ack rate over{" "}
                        {t.stat.n.toLocaleString("en-IN")} sends
                      </div>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No approved templates yet — get a request approved in Requests
            first.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {templates.map((t) => {
              const usage = usageByTemplate.get(t.templateId) ?? 0;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPick(t)}
                    className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {t.templateName}
                        </span>
                        {usage > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-cat-amber/40 bg-cat-amber/10 px-1.5 py-0 text-[10px] font-semibold text-cat-amber">
                            Used in {usage} live campaign{usage === 1 ? "" : "s"} · locked
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {t.templateId}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}


function StepSchedule({
  state,
  setState,
}: {
  state: WizState;
  setState: WizSetter;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Trigger</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["One-time", "Event-based", "Recurring"] as TriggerKind[]).map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setState((p) => ({ ...p, trigger: t }))}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm font-medium",
                  state.trigger === t
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                )}
              >
                {t}
              </button>
            ),
          )}
        </div>
      </div>

      {state.trigger === "One-time" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="wiz-date">Date</Label>
            <Input
              id="wiz-date"
              type="date"
              value={state.triggerDate}
              onChange={(e) =>
                setState((p) => ({ ...p, triggerDate: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wiz-time">Time (IST)</Label>
            <Input
              id="wiz-time"
              type="time"
              value={state.triggerTime}
              onChange={(e) =>
                setState((p) => ({ ...p, triggerTime: e.target.value }))
              }
            />
          </div>
        </div>
      )}

      {state.trigger === "Event-based" && (
        <div className="grid gap-1.5">
          <Label htmlFor="wiz-event">Event</Label>
          <select
            id="wiz-event"
            value={state.triggerEvent}
            onChange={(e) =>
              setState((p) => ({ ...p, triggerEvent: e.target.value }))
            }
            className="h-9 rounded-md border border-input bg-background px-2 font-mono text-sm"
          >
            {EVENT_TRIGGERS.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.trigger === "Recurring" && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="wiz-recur">Cadence</Label>
            <select
              id="wiz-recur"
              value={state.recurringPattern}
              onChange={(e) =>
                setState((p) => ({
                  ...p,
                  recurringPattern: e.target.value,
                }))
              }
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {RECURRING_PATTERNS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-cat-blue/30 bg-cat-blue/5 p-3 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-cat-blue" />
            <span className="text-foreground">
              Reminders are not applicable for recurring campaigns — Step 5
              will be skipped.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function StepReminders({
  state,
  setState,
  disabled,
}: {
  state: WizState;
  setState: WizSetter;
  disabled: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-cat-blue/30 bg-cat-blue/5 p-3 text-xs">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cat-blue" />
        <span className="text-foreground">
          Reminders not applicable for recurring campaigns.
        </span>
      </div>
    );
  }
  const strategies: {
    key: StrategyChoice;
    tag: string;
    Icon: typeof Bell;
    summary: string;
  }[] = [
    {
      key: "FYI",
      tag: "Low touch",
      Icon: Bell,
      summary: "Max 1 reminder · same channel · fixed 5d interval.",
    },
    {
      key: "Standard",
      tag: "Backoff",
      Icon: Zap,
      summary:
        "Exponential backoff 2d → 4d → 8d · Email → WhatsApp → Dashboard.",
    },
    {
      key: "Critical",
      tag: "SLA enforced",
      Icon: Shield,
      summary:
        "Every 2d ×5 · multi-channel dispatch · broadens audience · auto-ticket on expiry.",
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {strategies.map((str) => {
          const active = state.strategy === str.key;
          return (
            <button
              key={str.key}
              type="button"
              onClick={() =>
                setState((p) => ({ ...p, strategy: str.key }))
              }
              className={cn(
                "rounded-lg border p-3 text-left transition",
                active
                  ? "border-primary/60 bg-primary/10 shadow-sm"
                  : "border-border bg-background hover:bg-muted/40",
              )}
            >
              <div className="flex items-center gap-2">
                <str.Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{str.key}</span>
                <span className="ml-auto rounded-full border border-border bg-muted/60 px-1.5 py-0 text-[10px] text-muted-foreground">
                  {str.tag}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                {str.summary}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="wiz-esc">Escalation channel</Label>
          <select
            id="wiz-esc"
            value={state.escalationChannel}
            onChange={(e) =>
              setState((p) => ({
                ...p,
                escalationChannel: e.target.value as EscalationChannel,
              }))
            }
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option>WhatsApp</option>
            <option>Dashboard Banner</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="wiz-remtpl">Reminder template</Label>
          <Input
            id="wiz-remtpl"
            placeholder="e.g. APOLLO-REMINDER-01"
            value={state.reminderTemplate}
            onChange={(e) =>
              setState((p) => ({
                ...p,
                reminderTemplate: e.target.value,
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function StepReview({
  state,
  audienceCount,
  largeAudience,
}: {
  state: WizState;
  audienceCount: number;
  largeAudience: boolean;
}) {
  const scheduleText =
    state.trigger === "One-time"
      ? `One-time · ${state.triggerDate || "—"} ${state.triggerTime}`
      : state.trigger === "Event-based"
        ? `Event · ${state.triggerEvent}`
        : `Recurring · ${state.recurringPattern}`;
  const reminderText =
    state.trigger === "Recurring"
      ? "n/a (recurring)"
      : `${state.strategy} · escalate via ${state.escalationChannel}`;
  const rows: [string, string][] = [
    ["Name", state.name || "—"],
    [
      "Owner",
      state.owner ? OWNER_LABEL[state.owner as Owner] : "—",
    ],
    ["Category", state.campCat ? CAMP_CATS[state.campCat].name : "—"],
    [
      "Audience",
      `${audienceCount.toLocaleString("en-IN")} ${state.targetLevel.toLowerCase()}s · ${state.segment}`,
    ],
    [
      "Message chain",
      state.messages.length
        ? state.messages
            .map((m, i) => `${i + 1}. ${m.channel} → ${m.name}`)
            .join("  ·  ")
        : "—",
    ],
    ["Schedule", scheduleText],
    ["Reminder policy", reminderText],
  ];
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-b-0">
                <th className="w-40 bg-muted/40 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {k}
                </th>
                <td className="px-3 py-2 text-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {largeAudience ? (
        <div className="flex items-start gap-2 rounded-lg border border-cat-blue/30 bg-cat-blue/5 p-3 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cat-blue" />
          <div>
            <div className="font-semibold text-foreground">
              Large audience selected
            </div>
            <p className="mt-0.5 text-muted-foreground">
              {audienceCount.toLocaleString("en-IN")} recipients — please
              verify your targeting before launch. No approval required;
              governance comes from the pre-approved templates you selected.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <div className="font-semibold text-foreground">Ready to launch</div>
            <p className="mt-0.5 text-muted-foreground">
              All messages use pre-approved templates — no additional approval
              required.
            </p>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileText className="h-3 w-3" />
        Prototype · campaign is stored in-session only.
      </p>
    </div>
  );
}

function VendorTelemetryLog({ campaign }: { campaign: Campaign }) {
  const allTelemetry = useVendorTelemetry();
  const logs = allTelemetry.filter((t) => t.campaignId === campaign.id);
  const total = Math.max(1, Math.round(campaign.audienceCount));
  const completed = logs.filter(
    (l) =>
      l.actionType === "Acknowledged & Stopped" ||
      l.actionType === "Reconciled Statement",
  ).length;
  const pct = Math.min(100, Math.round((completed / total) * 100));

  const latestAck = logs.find(
    (l) => l.actionType === "Acknowledged & Stopped",
  );
  const anyReconciled = logs.find(
    (l) => l.actionType === "Reconciled Statement",
  );
  const riskCleared = latestAck ?? anyReconciled;

  const actionTone: Record<VendorActionTelemetry["actionType"], string> = {
    "Acknowledged & Stopped": "bg-emerald-100 text-emerald-800",
    "Reconciled Statement": "bg-emerald-100 text-emerald-800",
    Disputed: "bg-rose-100 text-rose-800",
    Snoozed: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Goal completed</span>
          <span className="tabular-nums text-muted-foreground">
            {completed.toLocaleString()} / {total.toLocaleString()} vendors ({pct}%)
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {riskCleared && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          PO Status: {riskCleared.actionType} ·{" "}
          {riskCleared.clearedRiskFlag} ✓
        </div>
      )}

      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Audit log stream
        </div>
        {logs.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            No vendor actions logged for this campaign yet.
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">
                    {l.timestamp}
                  </span>
                  <span className="font-medium">
                    {l.vendorName} ({l.vendorId})
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      actionTone[l.actionType],
                    )}
                  >
                    {l.actionType}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · {l.channel}
                  </span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  {l.poInvoiceNo} — {l.statusTransition}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
