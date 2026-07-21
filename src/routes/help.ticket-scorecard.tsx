import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  AlarmClock,
  RefreshCcw,
  CheckCircle2,
  Timer,
  Clock,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// ------------------ Threshold logic ------------------

type Tone = "good" | "watch" | "breach" | "neutral";

const toneText: Record<Tone, string> = {
  good: "text-cat-green",
  watch: "text-amber-600",
  breach: "text-destructive",
  neutral: "text-foreground",
};

const toneChip: Record<Tone, string> = {
  good: "bg-cat-green/10 text-cat-green",
  watch: "bg-amber-500/10 text-amber-600",
  breach: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

const gteTone = (v: number, good: number, watch: number): Tone =>
  v >= good ? "good" : v >= watch ? "watch" : "breach";
const lteTone = (v: number, good: number, watch: number): Tone =>
  v <= good ? "good" : v <= watch ? "watch" : "breach";

// ------------------ Sample data ------------------

interface HotspotRow {
  team: string;
  open: number;
  breached: number;
  medianAgeDays: number;
}

const HOTSPOTS: HotspotRow[] = [
  { team: "Supply Chain", open: 19, breached: 4, medianAgeDays: 2.8 },
  { team: "Catalog", open: 34, breached: 6, medianAgeDays: 2.1 },
  { team: "Finance", open: 22, breached: 2, medianAgeDays: 1.4 },
  { team: "Tech", open: 29, breached: 1, medianAgeDays: 0.9 },
];

const AGING = [
  { bucket: "< 4h", count: 42, tone: "neutral" as Tone },
  { bucket: "4–24h", count: 31, tone: "neutral" as Tone },
  { bucket: "1–3d", count: 18, tone: "watch" as Tone },
  { bucket: "3–7d", count: 9, tone: "watch" as Tone },
  { bucket: "> 7d", count: 4, tone: "breach" as Tone },
];

const DIY_COUNT = 412;
const AGENT_COUNT = 673;

// ------------------ Page ------------------

function TicketScorecardPage() {
  const { role } = useRole();
  const [range, setRange] = useState("30d");
  const [team, setTeam] = useState("all");
  const [priority, setPriority] = useState("all");

  if (role !== "internal_ops") return <Navigate to="/notifications" replace />;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Ticket Scorecard
            </h1>
            <p className="text-sm text-muted-foreground">
              Simulating: Support analytics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-[130px]" aria-label="Date range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="h-9 w-[140px]" aria-label="Team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                <SelectItem value="catalog">Catalog</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="supply">Supply Chain</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 w-[120px]" aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="p1">P1</SelectItem>
                <SelectItem value="p2">P2</SelectItem>
                <SelectItem value="p3">P3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <KpiRow />

        <SectionCard
          title="Open Aging Distribution"
          description="Open tickets by age. Aged buckets flag SLA risk."
        >
          <AgingChart />
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Team-level Breach Hotspots"
            description="Teams sorted by breach %. Watch amber, breach red."
          >
            <HotspotTable />
          </SectionCard>

          <SectionCard
            title="DIY vs Agent Resolution"
            description={`Last 30 days · ${DIY_COUNT + AGENT_COUNT} resolved tickets`}
          >
            <DiyAgentDonut />
          </SectionCard>
        </div>

        <SectionCard
          title="Response Time Medians"
          description="Median times across resolved tickets in this window."
        >
          <ResponseMedians />
        </SectionCard>
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

interface Kpi {
  label: string;
  value: string;
  delta: string;
  deltaUp: boolean;
  tone: Tone;
  target: string;
  icon: typeof ShieldCheck;
}

function KpiRow() {
  const kpis: Kpi[] = [
    {
      label: "SLA Adherence",
      value: "92.4%",
      delta: "▲ 1.2pp",
      deltaUp: true,
      tone: gteTone(92.4, 95, 90),
      target: "Target ≥ 95%",
      icon: ShieldCheck,
    },
    {
      label: "Open & SLA Breached",
      value: "7.1%",
      delta: "▼ 0.6pp",
      deltaUp: false,
      tone: lteTone(7.1, 5, 10),
      target: "Target ≤ 5%",
      icon: AlarmClock,
    },
    {
      label: "Reopen Rate",
      value: "4.8%",
      delta: "▼ 0.3pp",
      deltaUp: false,
      tone: lteTone(4.8, 5, 10),
      target: "Target ≤ 5%",
      icon: RefreshCcw,
    },
    {
      label: "First Contact Resolution",
      value: "68.2%",
      delta: "▲ 2.1pp",
      deltaUp: true,
      tone: gteTone(68.2, 70, 60),
      target: "Target ≥ 70%",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div
            key={k.label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{k.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <div
              className={cn(
                "mt-2 text-2xl font-semibold",
                toneText[k.tone],
              )}
            >
              {k.value}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{k.target}</span>
              <span
                className={cn(
                  "font-medium",
                  k.deltaUp ? "text-cat-green" : "text-muted-foreground",
                )}
              >
                {k.delta}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------ Aging chart ------------------

function AgingChart() {
  const max = Math.max(...AGING.map((a) => a.count));
  return (
    <div className="space-y-2.5">
      {AGING.map((a) => {
        const pct = (a.count / max) * 100;
        return (
          <div key={a.bucket} className="flex items-center gap-3">
            <div className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
              {a.bucket}
            </div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className={cn(
                  "h-full rounded-md",
                  a.tone === "breach"
                    ? "bg-destructive/70"
                    : a.tone === "watch"
                      ? "bg-amber-500/70"
                      : "bg-primary/70",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
              {a.count}
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
    () =>
      [...HOTSPOTS]
        .map((r) => ({ ...r, pct: (r.breached / r.open) * 100 }))
        .sort((a, b) => b.pct - a.pct),
    [],
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Open</TableHead>
          <TableHead className="text-right">Breached</TableHead>
          <TableHead className="text-right">Breach %</TableHead>
          <TableHead className="text-right">Median age</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const tone = lteTone(r.pct, 5, 15);
          return (
            <TableRow key={r.team}>
              <TableCell className="font-medium">{r.team}</TableCell>
              <TableCell className="text-right tabular-nums">{r.open}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.breached}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                    toneChip[tone],
                  )}
                >
                  {r.pct.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {r.medianAgeDays.toFixed(1)}d
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ------------------ DIY vs Agent donut ------------------

function DiyAgentDonut() {
  const total = DIY_COUNT + AGENT_COUNT;
  const diyPct = Math.round((DIY_COUNT / total) * 100);
  const agentPct = 100 - diyPct;
  const gradient = `conic-gradient(hsl(var(--primary)) 0 ${diyPct}%, hsl(var(--muted-foreground) / 0.35) ${diyPct}% 100%)`;

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative h-32 w-32 shrink-0 rounded-full"
        style={{ background: gradient }}
        aria-label={`DIY ${diyPct} percent, Agent ${agentPct} percent`}
      >
        <div className="absolute inset-3 grid place-items-center rounded-full bg-card">
          <div className="text-center leading-tight">
            <div className="text-lg font-semibold">{total}</div>
            <div className="text-[10px] text-muted-foreground">resolved</div>
          </div>
        </div>
      </div>
      <div className="min-w-0 space-y-3 text-sm">
        <LegendRow
          swatch="bg-primary"
          label="DIY (self-serve)"
          value={`${DIY_COUNT} · ${diyPct}%`}
        />
        <LegendRow
          swatch="bg-muted-foreground/40"
          label="Agent resolved"
          value={`${AGENT_COUNT} · ${agentPct}%`}
        />
      </div>
    </div>
  );
}

function LegendRow({
  swatch,
  label,
  value,
}: {
  swatch: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("h-3 w-3 shrink-0 rounded-sm", swatch)} />
      <span className="min-w-0 flex-1 text-foreground">{label}</span>
      <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
        {value}
      </span>
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
      // 1.7 hours
      tone: lteTone(1.7, 2, 4),
      icon: Timer,
    },
    {
      label: "Median Reopen → Resolved",
      value: "6h 18m",
      target: "Target ≤ 8h",
      // 6.3 hours
      tone: lteTone(6.3, 8, 16),
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
            className="rounded-lg border border-border bg-background p-4"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{i.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <div
              className={cn(
                "mt-2 text-2xl font-semibold",
                toneText[i.tone],
              )}
            >
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
