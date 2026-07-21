import { useMemo } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  AlarmClock,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  UserRound,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
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
import { CATEGORIES, type CategoryId } from "@/lib/mock-data";
import {
  useRoleAssignments,
  isCategoryAssignedTo,
} from "@/lib/role-assignments";

export const Route = createFileRoute("/help/my-tickets")({
  head: () => ({
    meta: [{ title: "Ticket Scorecard — PartnersBiz Comms Centre" }],
  }),
  component: VendorTicketScorecardPage,
});

// ------------------ Sample data (vendor-scoped) ------------------
// Deliberately different numbers from the internal scorecard so it's
// clearly this vendor's own view, not a copy.

const KPIS = {
  slaAdherence: 88.6,
  openAndBreached: 12.5,
  reopenRate: 4.8,
  fcr: 71.3,
};

const BREACHED_OPEN_COUNT = 2;

const AGING = [
  { bucket: "0–2h", pct: 28 },
  { bucket: "2–12h", pct: 31 },
  { bucket: "12–24h", pct: 17 },
  { bucket: "24–48h", pct: 12 },
  { bucket: "48–72h", pct: 8 },
  { bucket: "72h+", pct: 4 },
];

interface CategoryRow {
  id: CategoryId;
  raised: number;
  resolvedPct: number;
}

const CATEGORY_ROWS: CategoryRow[] = [
  { id: "finance_payments", raised: 34, resolvedPct: 82.4 },
  { id: "daily_ops", raised: 27, resolvedPct: 88.9 },
  { id: "action_required", raised: 19, resolvedPct: 73.7 },
  { id: "reports_analytics", raised: 12, resolvedPct: 91.7 },
  { id: "reminders", raised: 7, resolvedPct: 100.0 },
  { id: "account_access", raised: 3, resolvedPct: 100.0 },
];

const SELF_SERVE = { self: 61, agent: 41 };

const WEEKS = [
  { label: "Wk -3", count: 32 },
  { label: "Wk -2", count: 28 },
  { label: "Wk -1", count: 25 },
  { label: "This week", count: 17 },
];

const CATEGORY_CHIP: Record<CategoryId, string> = {
  action_required: "bg-cat-red/10 text-cat-red",
  finance_payments: "bg-cat-amber/10 text-cat-amber",
  reports_analytics: "bg-cat-green/10 text-cat-green",
  daily_ops: "bg-cat-blue/10 text-cat-blue",
  reminders: "bg-cat-purple/10 text-cat-purple",
  account_access: "bg-cat-grey/10 text-cat-grey",
};

// ------------------ Page ------------------

function VendorTicketScorecardPage() {
  const { role, employeeRole } = useRole();
  const { assignments } = useRoleAssignments();

  const canSee =
    role === "vendor_admin" ||
    (role === "vendor_employee" &&
      isCategoryAssignedTo("reports_analytics", employeeRole, assignments));

  if (!canSee) return <Navigate to="/notifications" replace />;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ticket Scorecard
          </h1>
          <p className="text-sm text-muted-foreground">
            Your tickets · sample data only
          </p>
        </header>

        <KpiRow />

        {BREACHED_OPEN_COUNT > 0 && <BreachBanner />}

        <SectionCard
          title="Open Aging Distribution"
          description="Share of your open tickets by age. Older buckets are at higher SLA risk."
        >
          <AgingChart />
        </SectionCard>

        <SectionCard
          title="Category Breakdown"
          description="Your tickets by PartnersBiz category, last 30 days."
        >
          <CategoryTable />
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard
            title="Self Serve Rate"
            description="Resolved without needing an agent, last 30 days."
          >
            <SelfServe />
          </SectionCard>

          <SectionCard
            title="Ticket Volume Trend"
            description="Tickets raised per week, last 4 weeks."
          >
            <VolumeTrend />
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

// ------------------ Section card ------------------

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

// ------------------ KPI tiles ------------------

function KpiRow() {
  const kpis = [
    {
      label: "SLA Adherence Rate",
      value: `${KPIS.slaAdherence.toFixed(1)}%`,
      target: "Target ≥ 95%",
      icon: ShieldCheck,
      red: KPIS.slaAdherence < 65,
    },
    {
      label: "Open & SLA Breached",
      value: `${KPIS.openAndBreached.toFixed(1)}%`,
      target: "% of your open tickets",
      icon: AlarmClock,
      red: KPIS.openAndBreached > 35,
    },
    {
      label: "Reopen Rate",
      value: `${KPIS.reopenRate.toFixed(1)}%`,
      target: "Target ≤ 5%",
      icon: RefreshCcw,
      red: false,
    },
    {
      label: "First Contact Resolution",
      value: `${KPIS.fcr.toFixed(1)}%`,
      target: "Target ≥ 70%",
      icon: CheckCircle2,
      red: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div
            key={k.label}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm",
              k.red ? "border-destructive/40 bg-destructive/5" : "border-border",
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{k.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <div
              className={cn(
                "mt-2 text-2xl font-semibold",
                k.red ? "text-destructive" : "text-foreground",
              )}
            >
              {k.value}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {k.target}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------ Breach callout ------------------

function BreachBanner() {
  return (
    <div className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <p className="text-sm leading-relaxed text-foreground">
        <span className="font-semibold text-destructive">
          {BREACHED_OPEN_COUNT} of your open tickets are past SLA.
        </span>{" "}
        Median resolution jumps from{" "}
        <span className="font-semibold">1h 50m</span> to{" "}
        <span className="font-semibold text-destructive">36 hours</span> once a
        ticket breaches.
      </p>
    </div>
  );
}

// ------------------ Aging chart ------------------

function AgingChart() {
  const max = Math.max(...AGING.map((a) => a.pct));
  return (
    <div className="space-y-2.5">
      {AGING.map((a) => {
        const width = (a.pct / max) * 100;
        const red = a.bucket === "48–72h" || a.bucket === "72h+";
        const amber = a.bucket === "24–48h";
        return (
          <div key={a.bucket} className="flex items-center gap-3">
            <div className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
              {a.bucket}
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className={cn(
                  "flex h-full items-center justify-end rounded-md pr-2 text-[11px] font-semibold text-white",
                  red
                    ? "bg-destructive/80"
                    : amber
                      ? "bg-amber-500/80"
                      : "bg-primary/70",
                )}
                style={{ width: `${width}%` }}
              >
                {width > 12 ? `${a.pct}%` : ""}
              </div>
              {width <= 12 && (
                <span
                  className="absolute inset-y-0 flex items-center pl-[calc(var(--w)_+_8px)] text-[11px] font-semibold text-foreground"
                  style={{ ["--w" as string]: `${width}%` }}
                >
                  {a.pct}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------ Category breakdown ------------------

function CategoryTable() {
  const rows = useMemo(
    () => [...CATEGORY_ROWS].sort((a, b) => b.raised - a.raised),
    [],
  );
  const labelFor = (id: CategoryId) =>
    CATEGORIES.find((c) => c.id === id)?.label ?? id;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Tickets Raised</TableHead>
          <TableHead className="text-right">Resolved</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const red = r.resolvedPct < 70;
          const amber = !red && r.resolvedPct < 85;
          return (
            <TableRow key={r.id}>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                    CATEGORY_CHIP[r.id],
                  )}
                >
                  {labelFor(r.id)}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.raised}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                    red
                      ? "bg-destructive/10 text-destructive"
                      : amber
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-cat-green/10 text-cat-green",
                  )}
                >
                  {r.resolvedPct.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ------------------ Self Serve Rate ------------------

function SelfServe() {
  const total = SELF_SERVE.self + SELF_SERVE.agent;
  const selfPct = Math.round((SELF_SERVE.self / total) * 100);
  const agentPct = 100 - selfPct;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-cat-green" />
          Resolved via self serve
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground tabular-nums">
            {SELF_SERVE.self}
          </span>
          <span className="text-sm font-semibold text-cat-green tabular-nums">
            {selfPct}%
          </span>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <UserRound className="h-3.5 w-3.5" />
          Needed an agent
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground tabular-nums">
            {SELF_SERVE.agent}
          </span>
          <span className="text-sm font-semibold text-muted-foreground tabular-nums">
            {agentPct}%
          </span>
        </div>
      </div>
      <p className="col-span-2 text-[11px] text-muted-foreground">
        Based on {total} tickets resolved in the last 30 days.
      </p>
    </div>
  );
}

// ------------------ Volume Trend ------------------

function VolumeTrend() {
  const max = Math.max(...WEEKS.map((w) => w.count));
  const first = WEEKS[0].count;
  const last = WEEKS[WEEKS.length - 1].count;
  const down = last < first;
  const label = down ? "Trending down" : "Trending up";
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-around gap-4 h-32">
        {WEEKS.map((w) => (
          <div key={w.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end justify-center">
              <div
                className="w-8 rounded-t-sm bg-primary/70"
                style={{ height: `${(w.count / max) * 100}%` }}
                title={`${w.count} tickets`}
              />
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {w.label}
            </div>
            <div className="text-[10px] tabular-nums text-muted-foreground">
              {w.count}
            </div>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 border-t border-border pt-3 text-xs font-medium",
          down ? "text-cat-green" : "text-destructive",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label} — {Math.abs(last - first)} fewer tickets vs 3 weeks ago
      </div>
    </div>
  );
}
