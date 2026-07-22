import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  MailWarning,
  EyeOff,
  Gauge,
  UserCog,
  LifeBuoy,
  CheckCircle2,
  Mail,
  MessageCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,

  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";
import { COMM_CATALOG } from "@/lib/comm-catalog";
import type { CategoryId } from "@/lib/mock-data";


export const Route = createFileRoute("/comms-performance")({
  head: () => ({
    meta: [{ title: "Comms Performance — PartnersBiz Comms Centre" }],
  }),
  component: CommsPerformancePage,
});

// ------------------ Sample data ------------------

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  sent: number;
  opened: number;
  clicked: number;
  ctr: number;
  quality: number; // /10
  trend: "up" | "down";
}

const TEMPLATES: TemplateRow[] = [
  { id: "APOLLO-100234", name: "PO Extension Approved", category: "Finance & Payments", sent: 12430, opened: 9210, clicked: 5121, ctr: 41.2, quality: 9.5, trend: "up" },
  { id: "APOLLO-100355", name: "Invoice Rejected", category: "Finance & Payments", sent: 3220, opened: 2680, clicked: 1887, ctr: 58.6, quality: 9.8, trend: "up" },
  { id: "APOLLO-100402", name: "Catalogue Update Required", category: "Action Required", sent: 9880, opened: 5560, clicked: 3369, ctr: 34.1, quality: 8.0, trend: "down" },
  { id: "APOLLO-100311", name: "Weekly Fill Rate Digest", category: "Reports & Analytics", sent: 8120, opened: 4310, clicked: 1851, ctr: 22.8, quality: 7.5, trend: "down" },
  { id: "APOLLO-100455", name: "Monthly Spends Summary", category: "Reports & Analytics", sent: 6540, opened: 3105, clicked: 1190, ctr: 18.2, quality: 6.5, trend: "down" },
  { id: "APOLLO-100501", name: "Diwali Announcement", category: "Announcements", sent: 15420, opened: 6100, clicked: 512, ctr: 3.3, quality: 5.5, trend: "down" },
];

// 24-hour CTR for announcement mailers
const HOURLY_CTR = [
  4, 3, 4, 5, 6, 9, 14, 22, 33, 41, 46, 44, 38, 30, 32, 36, 39, 34, 27, 21, 16, 12, 8, 6,
];

interface BounceRow {
  id: string;
  template: string;
  vendor: string;
  tenant: string;
  reason: string;
  daysSinceDelivery: number;
}

const BOUNCES: BounceRow[] = [
  { id: "b1", template: "Weekly Fill Rate Digest", vendor: "Aashirvaad Foods", tenant: "ITC Limited", reason: "Mailbox not found — likely contact left the company", daysSinceDelivery: 47 },
  { id: "b2", template: "Invoice Rejected", vendor: "Sunfeast Retail", tenant: "ITC Limited", reason: "Mailbox not found — likely contact left the company", daysSinceDelivery: 32 },
  { id: "b3", template: "PO Extension Approved", vendor: "Bingo Snacks Co.", tenant: "ITC Limited", reason: "Mailbox full", daysSinceDelivery: 18 },
  { id: "b4", template: "Monthly Spends Summary", vendor: "Classmate Stationers", tenant: "ITC Limited", reason: "Mailbox not found — likely contact left the company", daysSinceDelivery: 61 },
  { id: "b5", template: "Catalogue Update Required", vendor: "Mangaldeep Traders", tenant: "ITC Limited", reason: "Domain not found", daysSinceDelivery: 12 },
];

interface NonOpenerRow {
  id: string;
  vendor: string;
  tenant: string;
  template: string;
  daysSinceOpen: number;
  suppressed: boolean;
}

const INITIAL_NON_OPENERS: NonOpenerRow[] = [
  { id: "n1", vendor: "Fiama Distributors", tenant: "ITC Limited", template: "Weekly Fill Rate Digest", daysSinceOpen: 54, suppressed: false },
  { id: "n2", vendor: "Vivel Retail Partners", tenant: "ITC Limited", template: "Monthly Spends Summary", daysSinceOpen: 41, suppressed: false },
  { id: "n3", vendor: "Yippee Foods Co.", tenant: "ITC Limited", template: "Catalogue Update Required", daysSinceOpen: 38, suppressed: false },
  { id: "n4", vendor: "Savlon Suppliers", tenant: "ITC Limited", template: "PO Extension Approved", daysSinceOpen: 29, suppressed: false },
  { id: "n5", vendor: "Nimyle Trading", tenant: "ITC Limited", template: "Diwali Announcement", daysSinceOpen: 22, suppressed: false },
  { id: "n6", vendor: "Engage Distributors", tenant: "ITC Limited", template: "Invoice Rejected", daysSinceOpen: 17, suppressed: false },
];

interface FinanceGroup {
  type: "Invoice" | "Payment" | "Statement of Accounts";
  templates: number;
  sent: number;
  opened: number;
  clicked: number;
  ctr: number;
  best: string;
  worst: string;
}

const FINANCE_GROUPS: FinanceGroup[] = [
  { type: "Invoice", templates: 5, sent: 21450, opened: 15320, clicked: 8940, ctr: 41.7, best: "Invoice Rejected (58.6%)", worst: "Invoice Pending Review (28.2%)" },
  { type: "Payment", templates: 4, sent: 18320, opened: 11440, clicked: 6212, ctr: 33.9, best: "Payout Confirmation (48.1%)", worst: "Payment Hold Notice (22.4%)" },
  { type: "Statement of Accounts", templates: 3, sent: 9880, opened: 4210, clicked: 1580, ctr: 16.0, best: "Monthly SoA (21.4%)", worst: "Quarterly Ledger Recon (11.8%)" },
];

// ------------------ Page ------------------

function CommsPerformancePage() {
  const { role } = useRole();
  if (role !== "internal_ops") return <Navigate to="/notifications" replace />;

  return (
    <AppShell>
      <div className="workdesk mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Comms Performance</h1>
          <p className="text-sm text-muted-foreground">
            Simulating: Pulse metrics · sample data only
          </p>
        </header>

        <KpiRow />
        <TemplateCtrCard />
        <HourlyCtrCard />
        <ChannelPreferenceSection />
        <BounceCard />
        <NonOpenerCard />
        <FinanceGroupCard />

      </div>
    </AppShell>
  );
}

// ------------------ KPI tiles ------------------

function KpiRow() {
  const avgCtr = useMemo(() => {
    const total = TEMPLATES.reduce((a, b) => a + b.ctr, 0);
    return (total / TEMPLATES.length).toFixed(1);
  }, []);
  const belowBar = useMemo(
    () => TEMPLATES.filter((t) => t.quality < 9).length,
    [],
  );
  const avgQuality = useMemo(() => {
    const total = TEMPLATES.reduce((a, b) => a + b.quality, 0);
    return (total / TEMPLATES.length).toFixed(1);
  }, []);

  const tiles = [
    { label: "Avg CTR", value: `${avgCtr}%`, icon: MousePointerClick, red: false },
    { label: "Bounces flagged", value: BOUNCES.length, icon: MailWarning, red: BOUNCES.length > 3 },
    { label: "Non-openers", value: INITIAL_NON_OPENERS.length, icon: EyeOff, red: INITIAL_NON_OPENERS.length > 5 },
    { label: "Below quality bar", value: `${belowBar} / ${TEMPLATES.length}`, icon: Gauge, red: belowBar > 0, sub: `Avg ${avgQuality} / 10` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm",
              t.red ? "border-destructive/40 bg-destructive/5" : "border-border",
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <div
              className={cn(
                "mt-2 text-2xl font-semibold",
                t.red ? "text-destructive" : "text-foreground",
              )}
            >
              {t.value}
            </div>
            {t.sub && (
              <div className="mt-1 text-[11px] text-muted-foreground">{t.sub}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------ Section wrapper ------------------

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

// ------------------ 1. Template CTR (sortable + quality) ------------------

function TemplateCtrCard() {
  const [sortDesc, setSortDesc] = useState(true);
  const rows = useMemo(
    () =>
      [...TEMPLATES].sort((a, b) =>
        sortDesc ? b.ctr - a.ctr : a.ctr - b.ctr,
      ),
    [sortDesc],
  );

  return (
    <SectionCard
      title="Template CTR"
      description="Click-through rate for the last 7 days. Content quality is a 1–10 score; ≥ 9 required to publish."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Opened</TableHead>
            <TableHead className="text-right">Clicked</TableHead>
            <TableHead className="text-right">
              <button
                type="button"
                onClick={() => setSortDesc((s) => !s)}
                className="inline-flex items-center gap-1 font-medium hover:text-foreground"
              >
                CTR
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </TableHead>
            <TableHead>Trend</TableHead>
            <TableHead className="text-right">Content Quality</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => {
            const rework = t.quality < 9;
            return (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">{t.category}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.sent.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.opened.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.clicked.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {t.ctr}%
                </TableCell>
                <TableCell>
                  {t.trend === "up" ? (
                    <span className="inline-flex items-center gap-1 text-cat-green">
                      <TrendingUp className="h-4 w-4" /> up
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-cat-red">
                      <TrendingDown className="h-4 w-4" /> down
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-semibold tabular-nums text-foreground">
                      {t.quality.toFixed(1)}
                    </span>
                    {rework ? (
                      <Badge className="bg-cat-red-soft text-cat-red hover:bg-cat-red-soft">
                        Needs Rework
                      </Badge>
                    ) : (
                      <Badge className="bg-cat-green-soft text-cat-green hover:bg-cat-green-soft">
                        Publish Ready
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

// ------------------ 2. Time-of-day CTR ------------------

function HourlyCtrCard() {
  const max = Math.max(...HOURLY_CTR);
  const peakHour = HOURLY_CTR.indexOf(max);

  return (
    <SectionCard
      title="Time-of-day CTR — Announcement mailers"
      description="CTR by send hour (IST). Filtered to Announcement category templates only."
    >
      <div className="flex h-40 items-end gap-1.5">
        {HOURLY_CTR.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "w-full rounded-t transition-colors",
                i === peakHour ? "bg-primary" : "bg-primary/25",
              )}
              style={{ height: `${(v / max) * 100}%` }}
              title={`${String(i).padStart(2, "0")}:00 — ${v}%`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}:00</span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Best send window:{" "}
        <span className="font-medium text-foreground">
          {String(peakHour).padStart(2, "0")}:00–
          {String(peakHour + 1).padStart(2, "0")}:00 IST
        </span>{" "}
        · peak CTR {max}%.
      </p>
    </SectionCard>
  );
}

// ------------------ 3. Bounce tracker ------------------

function BounceCard() {
  const [rows, setRows] = useState<BounceRow[]>(BOUNCES);
  const updateContact = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Contact update request raised with vendor admin");
  };

  return (
    <SectionCard
      title="Bounce tracker"
      description="Emails that failed to deliver. Long gaps usually mean the contact has left the company."
    >
      {rows.length === 0 ? (
        <EmptyState label="All bounces cleared." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Days since last delivery</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const stale = r.daysSinceDelivery >= 30;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.template}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-foreground">{r.vendor}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {r.tenant}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.reason}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                        stale
                          ? "bg-cat-red-soft text-cat-red"
                          : "bg-amber-500/10 text-amber-600",
                      )}
                    >
                      {r.daysSinceDelivery} days
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateContact(r.id)}
                      >
                        <UserCog className="mr-1.5 h-3.5 w-3.5" />
                        Update Contact
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ------------------ 4. Non-opener tracker ------------------

function NonOpenerCard() {
  const [rows, setRows] = useState<NonOpenerRow[]>(INITIAL_NON_OPENERS);
  const suppress = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, suppressed: true } : r)),
    );
    toast.success("Suppressed and routed to Help & Support");
  };

  return (
    <SectionCard
      title="Non-opener tracker"
      description="Vendors who haven't opened this template's sends in a long time."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Template</TableHead>
            <TableHead className="text-right">Days since last open</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const stale = r.daysSinceOpen >= 30;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{r.vendor}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {r.tenant}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{r.template}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                      stale
                        ? "bg-cat-red-soft text-cat-red"
                        : "bg-amber-500/10 text-amber-600",
                    )}
                  >
                    {r.daysSinceOpen} days
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    {r.suppressed ? (
                      <Badge className="gap-1 bg-muted text-muted-foreground hover:bg-muted">
                        <CheckCircle2 className="h-3 w-3" />
                        No further sends until contact refreshed
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => suppress(r.id)}
                      >
                        <LifeBuoy className="mr-1.5 h-3.5 w-3.5" />
                        Suppress and Route to Help &amp; Support
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

// ------------------ 5. Finance mail CTR (by config type) ------------------

function FinanceGroupCard() {
  return (
    <SectionCard
      title="Finance mail CTR — by configuration type"
      description="Finance templates grouped by their configuration type."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Configuration type</TableHead>
            <TableHead className="text-right">Templates</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Opened</TableHead>
            <TableHead className="text-right">Clicked</TableHead>
            <TableHead className="text-right">Avg CTR</TableHead>
            <TableHead>Best</TableHead>
            <TableHead>Worst</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FINANCE_GROUPS.map((g) => (
            <TableRow key={g.type}>
              <TableCell className="font-medium">{g.type}</TableCell>
              <TableCell className="text-right tabular-nums">{g.templates}</TableCell>
              <TableCell className="text-right tabular-nums">
                {g.sent.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.opened.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.clicked.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {g.ctr}%
              </TableCell>
              <TableCell className="text-muted-foreground">{g.best}</TableCell>
              <TableCell className="text-muted-foreground">{g.worst}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}

// ------------------ Channel Preference Distribution ------------------

// Category-specific base subscribers so the sample data isn't uniform.
const CATEGORY_BASE_SUBS: Record<CategoryId, number> = {
  action_required: 420,
  finance_payments: 380,
  reports_analytics: 260,
  daily_ops: 340,
  reminders: 300,
  account_access: 460,
};

// A little deterministic jitter per comm id so bars vary.
function idJitter(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 60) - 30; // -30..+29
}

interface CommChannelStat {
  id: string;
  name: string;
  category: CategoryId;
  mailOnly: number;
  whatsappOnly: number;
  both: number;
  total: number;
}

const COMM_CHANNEL_STATS: CommChannelStat[] = COMM_CATALOG.map((c) => {
  const base = CATEGORY_BASE_SUBS[c.category] + idJitter(c.id);
  // Distribute a base subscriber pool across three buckets using catalog
  // defaults as the "lean" and category as a tone modifier.
  const leansWhatsapp =
    c.defaults.whatsapp && !c.defaults.mail
      ? { mail: 0.18, both: 0.32, wa: 0.5 }
      : c.defaults.whatsapp && c.defaults.mail
        ? { mail: 0.32, both: 0.5, wa: 0.18 }
        : { mail: 0.62, both: 0.28, wa: 0.1 };
  const mailOnly = Math.round(base * leansWhatsapp.mail);
  const both = Math.round(base * leansWhatsapp.both);
  const whatsappOnly = Math.round(base * leansWhatsapp.wa);
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    mailOnly,
    whatsappOnly,
    both,
    total: mailOnly + whatsappOnly + both,
  };
});

const OVERALL_SPLIT = COMM_CHANNEL_STATS.reduce(
  (acc, r) => ({
    mailOnly: acc.mailOnly + r.mailOnly,
    whatsappOnly: acc.whatsappOnly + r.whatsappOnly,
    both: acc.both + r.both,
  }),
  { mailOnly: 0, whatsappOnly: 0, both: 0 },
);

// 4-week trend: WhatsApp adoption rising, Mail-only slowly declining.
const CHANNEL_TREND: Array<{
  week: string;
  mailOnly: number;
  both: number;
  whatsappOnly: number;
}> = [
  { week: "W-3", mailOnly: 5940, both: 3720, whatsappOnly: 1560 },
  { week: "W-2", mailOnly: 5810, both: 3880, whatsappOnly: 1740 },
  { week: "W-1", mailOnly: 5680, both: 4020, whatsappOnly: 1920 },
  { week: "This week", mailOnly: 5540, both: 4180, whatsappOnly: 2110 },
];

const CH_COLORS = {
  mailOnly: "#6b7280",
  both: "#F8CB46",
  whatsappOnly: "#25D366",
};

function ChannelPreferenceSection() {
  const total = OVERALL_SPLIT.mailOnly + OVERALL_SPLIT.whatsappOnly + OVERALL_SPLIT.both;
  const cards = [
    {
      label: "Mail only",
      value: OVERALL_SPLIT.mailOnly,
      color: CH_COLORS.mailOnly,
      Icon: Mail,
    },
    {
      label: "WhatsApp only",
      value: OVERALL_SPLIT.whatsappOnly,
      color: CH_COLORS.whatsappOnly,
      Icon: MessageCircle,
    },
    {
      label: "Both Mail & WhatsApp",
      value: OVERALL_SPLIT.both,
      color: CH_COLORS.both,
      Icon: CheckCircle2,
    },
  ];

  const tableRows = useMemo(() => {
    return COMM_CHANNEL_STATS.map((r) => ({
      ...r,
      mailPct: Math.round((r.mailOnly / r.total) * 100),
      waPct: Math.round((r.whatsappOnly / r.total) * 100),
      bothPct: Math.round((r.both / r.total) * 100),
    })).sort((a, b) => b.waPct - a.waPct);
  }, []);

  return (
    <SectionCard
      title="Channel Preference Split"
      description="How vendor subscriptions split across Mail, WhatsApp, and Both — sourced from Preference Centre. Portal delivery is always on and not counted here. Sample data only."
    >
      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const pct = ((c.value / total) * 100).toFixed(1);
          return (
            <div
              key={c.label}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ background: `${c.color}22`, color: c.color }}
                >
                  <c.Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[12px] font-medium text-muted-foreground">
                  {c.label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {c.value.toLocaleString()}
                </span>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {pct}% of total
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4-week trend */}
      <div className="mt-6 rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Last 4 weeks
            </h3>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp adoption trending up as vendors opt in.
            </p>
          </div>
          <ul className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {[
              { label: "Mail only", color: CH_COLORS.mailOnly },
              { label: "Both", color: CH_COLORS.both },
              { label: "WhatsApp only", color: CH_COLORS.whatsappOnly },
            ].map((l) => (
              <li key={l.label} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: l.color }}
                />
                {l.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={CHANNEL_TREND}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />
              <RTooltip
                formatter={(v: number) => v.toLocaleString()}
                contentStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="mailOnly"
                name="Mail only"
                stackId="1"
                stroke={CH_COLORS.mailOnly}
                fill={CH_COLORS.mailOnly}
                fillOpacity={0.55}
              />
              <Area
                type="monotone"
                dataKey="both"
                name="Both"
                stackId="1"
                stroke={CH_COLORS.both}
                fill={CH_COLORS.both}
                fillOpacity={0.75}
              />
              <Area
                type="monotone"
                dataKey="whatsappOnly"
                name="WhatsApp only"
                stackId="1"
                stroke={CH_COLORS.whatsappOnly}
                fill={CH_COLORS.whatsappOnly}
                fillOpacity={0.8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-lg border border-border bg-background">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">
            By comm type
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Sorted by highest WhatsApp adoption first.
          </p>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Comm type</TableHead>
                <TableHead className="text-right">Mail</TableHead>
                <TableHead className="text-right">WhatsApp</TableHead>
                <TableHead className="text-right">Both</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">
                    {r.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.mailPct}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className="inline-flex items-center gap-1 font-semibold"
                      style={{ color: CH_COLORS.whatsappOnly }}
                    >
                      {r.waPct}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.bothPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SectionCard>
  );
}


