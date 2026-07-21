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

export const Route = createFileRoute("/help/ticket-scorecard")({
  head: () => ({
    meta: [{ title: "Ticket Scorecard — PartnersBiz Comms Centre" }],
  }),
  component: TicketScorecardPage,
});

// ------------------ Sample data ------------------

const KPIS = {
  slaAdherence: 58.4, // %
  openAndBreached: 81.0, // % of open
  reopenRate: 12.6, // %
  fcr: 61.7, // %
};

const AGING = [
  { bucket: "0–2h", pct: 4 },
  { bucket: "2–12h", pct: 6 },
  { bucket: "12–24h", pct: 9 },
  { bucket: "24–48h", pct: 12 },
  { bucket: "48–72h", pct: 22 },
  { bucket: "72h+", pct: 47 },
];

interface HotspotRow {
  team: string;
  open: number;
  slaAdherence: number;
  breached: number;
}

const HOTSPOTS: HotspotRow[] = [
  { team: "Catalog Ops", open: 84, slaAdherence: 32.1, breached: 57 },
  { team: "Supply Chain", open: 62, slaAdherence: 41.9, breached: 36 },
  { team: "Finance – Payments", open: 47, slaAdherence: 52.4, breached: 22 },
  { team: "Onboarding", open: 29, slaAdherence: 63.2, breached: 11 },
  { team: "Fill Rate Ops", open: 38, slaAdherence: 71.5, breached: 11 },
  { team: "Tech – Portal", open: 19, slaAdherence: 82.6, breached: 3 },
  { team: "Compliance", open: 12, slaAdherence: 88.1, breached: 1 },
  { team: "Loyalty & Growth", open: 8, slaAdherence: 94.3, breached: 0 },
];

const DIY_COUNT = 312;
const AGENT_COUNT = 918;

// ------------------ Page ------------------

function TicketScorecardPage() {
  const { role } = useRole();
  if (role !== "internal_ops") return <Navigate to="/notifications" replace />;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ticket Scorecard
          </h1>
          <p className="text-sm text-muted-foreground">
            Simulating: Support analytics · sample data only
          </p>
        </header>

        <KpiRow />

        <BreachBanner />

        <SectionCard
          title="Open Aging Distribution"
          description="Share of open tickets by age. Aged buckets show SLA risk building up."
        >
          <AgingChart />
        </SectionCard>

        <SectionCard
          title="Team-level Breach Hotspots"
          description="Sorted by worst SLA adherence first."
        >
          <HotspotTable />
        </SectionCard>

        <SectionCard
          title="DIY vs Agent Resolution"
          description="How resolved tickets closed in the last 30 days."
        >
          <DiyAgentSplit />
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
  const slaLow = KPIS.slaAdherence < 65;
  const breachedHigh = KPIS.openAndBreached >= 35; // "below 65% healthy" analogue: high breached is bad
  // Spec: red accent when SLA Adherence OR Open & Breached is below 65%.
  // Open & Breached is a "bad" metric, so red when > 35% (mirror of the 65% healthy threshold).
  const kpis = [
    {
      label: "SLA Adherence Rate",
      value: `${KPIS.slaAdherence.toFixed(1)}%`,
      target: "Target ≥ 95%",
      icon: ShieldCheck,
      red: slaLow,
    },
    {
      label: "Open & SLA Breached",
      value: `${KPIS.openAndBreached.toFixed(1)}%`,
      target: "% of total open tickets",
      icon: AlarmClock,
      red: breachedHigh,
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
          81% of open tickets are already past SLA,
        </span>{" "}
        and most have been open over 72 hours. Once a ticket breaches, median
        resolution time jumps from{" "}
        <span className="font-semibold">2.9 hours</span> to{" "}
        <span className="font-semibold text-destructive">68.8 hours</span>.
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
                <span className="absolute inset-y-0 flex items-center pl-[calc(var(--w)_+_8px)] text-[11px] font-semibold text-foreground"
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

// ------------------ Hotspot table ------------------

function HotspotTable() {
  const rows = useMemo(
    () => [...HOTSPOTS].sort((a, b) => a.slaAdherence - b.slaAdherence),
    [],
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
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
            <TableRow key={r.team}>
              <TableCell className="font-medium">{r.team}</TableCell>
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
                  r.breached > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
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

// ------------------ DIY vs Agent split ------------------

function DiyAgentSplit() {
  const total = DIY_COUNT + AGENT_COUNT;
  const diyPct = Math.round((DIY_COUNT / total) * 100);
  const agentPct = 100 - diyPct;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="text-xs font-medium text-muted-foreground">
          Vendors who self served
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground tabular-nums">
            {DIY_COUNT.toLocaleString()}
          </span>
          <span className="text-sm font-medium text-cat-green">{diyPct}%</span>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="text-xs font-medium text-muted-foreground">
          Needed an agent
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground tabular-nums">
            {AGENT_COUNT.toLocaleString()}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {agentPct}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ------------------ Response medians ------------------

function ResponseMedians() {
  const items = [
    {
      label: "Median Agent First Reply",
      value: "1h 42m",
      target: "Target ≤ 2h",
      icon: Timer,
    },
    {
      label: "Median Reopen → Resolved",
      value: "6h 18m",
      target: "Target ≤ 8h",
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
