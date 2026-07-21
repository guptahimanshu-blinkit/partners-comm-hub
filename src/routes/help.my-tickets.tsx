import { useMemo } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  AlarmClock,
  RefreshCcw,
  CheckCircle2,
  Timer,
  Clock,
  AlertTriangle,
  Sparkles,
  TrendingDown,
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

const KPIS = {
  slaAdherence: 82.4,
  openAndBreached: 18.0,
  reopenRate: 6.2,
  fcr: 74.1,
};

const BREACHED_OPEN_COUNT = 3;

const AGING = [
  { bucket: "0–2h", pct: 22 },
  { bucket: "2–12h", pct: 26 },
  { bucket: "12–24h", pct: 18 },
  { bucket: "24–48h", pct: 15 },
  { bucket: "48–72h", pct: 11 },
  { bucket: "72h+", pct: 8 },
];

interface CategoryRow {
  id: CategoryId;
  open: number;
  slaAdherence: number;
  breached: number;
}

const CATEGORY_ROWS: CategoryRow[] = [
  { id: "action_required", open: 6, slaAdherence: 71.0, breached: 2 },
  { id: "finance_payments", open: 9, slaAdherence: 78.5, breached: 2 },
  { id: "reports_analytics", open: 4, slaAdherence: 88.0, breached: 0 },
  { id: "daily_ops", open: 5, slaAdherence: 84.2, breached: 1 },
  { id: "reminders", open: 2, slaAdherence: 95.0, breached: 0 },
  { id: "account_access", open: 1, slaAdherence: 100.0, breached: 0 },
];

const SELF_SERVE = { self: 68, agent: 90 };

const WEEKS = [
  { label: "Wk -3", raised: 42, resolved: 38 },
  { label: "Wk -2", raised: 51, resolved: 44 },
  { label: "Wk -1", raised: 47, resolved: 49 },
  { label: "This week", raised: 39, resolved: 35 },
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
            Simulating: Your tickets · sample data only
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
          description="Your open tickets by PartnersBiz communication category."
        >
          <CategoryTable />
        </SectionCard>

        <SectionCard
          title="Self Serve Rate"
          description="How many resolved tickets closed without needing an agent, last 30 days."
        >
          <SelfServe />
        </SectionCard>

        <SectionCard
          title="Ticket Volume Trend"
          description="Raised vs resolved over the last 4 weeks."
        >
          <VolumeTrend />
        </SectionCard>

        <ResponseMedians />
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
        <span className="font-semibold">2.5 hours</span> to{" "}
        <span className="font-semibold text-destructive">41 hours</span> once a
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
    () => [...CATEGORY_ROWS].sort((a, b) => a.slaAdherence - b.slaAdherence),
    [],
  );
  const labelFor = (id: CategoryId) =>
    CATEGORIES.find((c) => c.id === id)?.label ?? id;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Tickets Open</TableHead>
          <TableHead className="text-right">SLA Adherence</TableHead>
          <TableHead className="text-right">Open &amp; Breached</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const red = r.slaAdherence < 65;
          const amber = !red && r.slaAdherence < 80;
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
              <TableCell className="text-right tabular-nums">{r.open}</TableCell>
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
                  {r.slaAdherence.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  r.breached > 0
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {r.breached}
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
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <Sparkles className="h-5 w-5 text-cat-green" />
        <span className="text-4xl font-semibold text-foreground tabular-nums">
          {selfPct}%
        </span>
        <span className="text-sm text-muted-foreground">
          self-served ({SELF_SERVE.self} of {total} resolved, last 30 days)
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-cat-green"
          style={{ width: `${selfPct}%` }}
        />
        <div
          className="h-full bg-muted-foreground/30"
          style={{ width: `${agentPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-cat-green align-middle" />
          {SELF_SERVE.self} resolved without an agent
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-muted-foreground/30 align-middle" />
          {SELF_SERVE.agent} needed an agent
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Higher self-serve means faster resolution and no waiting.
      </p>
    </div>
  );
}

// ------------------ Volume Trend ------------------

function VolumeTrend() {
  const max = Math.max(...WEEKS.flatMap((w) => [w.raised, w.resolved]));
  const prev = WEEKS[WEEKS.length - 2];
  const curr = WEEKS[WEEKS.length - 1];
  const delta = ((curr.raised - prev.raised) / prev.raised) * 100;
  const down = delta < 0;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-around gap-4 h-40">
        {WEEKS.map((w) => (
          <div key={w.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center gap-1.5">
              <div
                className="w-5 rounded-t-sm bg-primary/70"
                style={{ height: `${(w.raised / max) * 100}%` }}
                title={`Raised: ${w.raised}`}
              />
              <div
                className="w-5 rounded-t-sm bg-cat-green/70"
                style={{ height: `${(w.resolved / max) * 100}%` }}
                title={`Resolved: ${w.resolved}`}
              />
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              {w.label}
            </div>
            <div className="text-[10px] tabular-nums text-muted-foreground">
              {w.raised}/{w.resolved}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/70" />
            Raised
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cat-green/70" />
            Resolved
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 font-medium tabular-nums",
            down ? "text-cat-green" : "text-destructive",
          )}
        >
          <TrendingDown
            className={cn("h-3.5 w-3.5", !down && "rotate-180")}
          />
          {down ? "▼" : "▲"} {Math.abs(delta).toFixed(0)}% vs last week
        </div>
      </div>
    </div>
  );
}

// ------------------ Response medians ------------------

function ResponseMedians() {
  const items = [
    {
      label: "Median First Reply",
      value: "2h 05m",
      target: "Target ≤ 4h",
      icon: Timer,
    },
    {
      label: "Median Reopen → Resolved",
      value: "9h 12m",
      target: "Target ≤ 12h",
      icon: Clock,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((i) => {
        const Icon = i.icon;
        return (
          <div
            key={i.label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{i.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {i.value}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {i.target}
            </div>
          </div>
        );
      })}
    </div>
  );
}
