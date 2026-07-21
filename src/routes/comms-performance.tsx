import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  MailWarning,
  EyeOff,
  Gauge,
  ShieldOff,
  LifeBuoy,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/comms-performance")({
  head: () => ({
    meta: [{ title: "Comms Performance — PartnersBiz Comms Centre" }],
  }),
  component: CommsPerformancePage,
});

// ------------------ Sample data ------------------

interface TemplateCtr {
  id: string;
  name: string;
  category: string;
  sends: number;
  opens: number;
  clicks: number;
  ctr: number;
  trend: "up" | "down";
}

const TEMPLATE_CTR: TemplateCtr[] = [
  { id: "APOLLO-100234", name: "PO Extension Approved", category: "Finance & Payments", sends: 12430, opens: 9210, clicks: 5121, ctr: 41.2, trend: "up" },
  { id: "APOLLO-100311", name: "Weekly Fill Rate Digest", category: "Reports & Analytics", sends: 8120, opens: 4310, clicks: 1851, ctr: 22.8, trend: "down" },
  { id: "APOLLO-100355", name: "Invoice Rejected", category: "Finance & Payments", sends: 3220, opens: 2680, clicks: 1887, ctr: 58.6, trend: "up" },
  { id: "APOLLO-100402", name: "Catalogue Update Required", category: "Action Required", sends: 9880, opens: 5560, clicks: 3369, ctr: 34.1, trend: "down" },
  { id: "APOLLO-100455", name: "Monthly Spends Summary", category: "Reports & Analytics", sends: 6540, opens: 3105, clicks: 1190, ctr: 18.2, trend: "down" },
];

// 24-hour CTR for announcement mailers
const HOURLY_CTR = [
  4, 3, 4, 5, 6, 9, 14, 22, 33, 41, 46, 44, 38, 30, 32, 36, 39, 34, 27, 21, 16, 12, 8, 6,
];

interface BounceRow {
  id: string;
  name: string;
  sent: number;
  delivered: number;
  hard: number;
  soft: number;
  reason: string;
}

const BOUNCES: BounceRow[] = [
  { id: "APOLLO-100234", name: "PO Extension Approved", sent: 12430, delivered: 12180, hard: 180, soft: 70, reason: "Invalid mailbox" },
  { id: "APOLLO-100311", name: "Weekly Fill Rate Digest", sent: 8120, delivered: 7420, hard: 512, soft: 188, reason: "Mailbox full" },
  { id: "APOLLO-100402", name: "Catalogue Update Required", sent: 9880, delivered: 9720, hard: 90, soft: 70, reason: "Domain not found" },
];

interface NonOpener {
  id: string;
  vendor: string;
  tenant: string;
  template: string;
  consecutive: number;
  lastOpened: string;
  profile: "Tech Enabled" | "Low Tech";
}

const INITIAL_NON_OPENERS: NonOpener[] = [
  { id: "n1", vendor: "Aashirvaad Foods", tenant: "ITC Limited", template: "Weekly Fill Rate Digest", consecutive: 12, lastOpened: "22 Jun 2026", profile: "Low Tech" },
  { id: "n2", vendor: "Sunfeast Retail", tenant: "ITC Limited", template: "Monthly Spends Summary", consecutive: 9, lastOpened: "04 Jul 2026", profile: "Tech Enabled" },
  { id: "n3", vendor: "Bingo Snacks Co.", tenant: "ITC Limited", template: "Weekly Fill Rate Digest", consecutive: 7, lastOpened: "10 Jul 2026", profile: "Low Tech" },
  { id: "n4", vendor: "Classmate Stationers", tenant: "ITC Limited", template: "Catalogue Update Required", consecutive: 6, lastOpened: "12 Jul 2026", profile: "Tech Enabled" },
  { id: "n5", vendor: "Mangaldeep Traders", tenant: "ITC Limited", template: "PO Extension Approved", consecutive: 5, lastOpened: "15 Jul 2026", profile: "Low Tech" },
  { id: "n6", vendor: "Fiama Distributors", tenant: "ITC Limited", template: "Invoice Rejected", consecutive: 4, lastOpened: "17 Jul 2026", profile: "Tech Enabled" },
];

interface FinanceGroup {
  signature: string;
  templates: number;
  sends: number;
  avgCtr: number;
  best: string;
  worst: string;
}

const FINANCE_GROUPS: FinanceGroup[] = [
  { signature: "Mail · Immediate · P1", templates: 4, sends: 21450, avgCtr: 52.4, best: "Invoice Rejected (58.6%)", worst: "Payment Hold Notice (44.1%)" },
  { signature: "Mail · Daily digest · P2", templates: 3, sends: 14320, avgCtr: 28.7, best: "Weekly Payout Summary (35.2%)", worst: "Deduction Report (21.3%)" },
  { signature: "Mail + WhatsApp · Immediate · P1", templates: 2, sends: 9880, avgCtr: 61.9, best: "PO Extension Approved (64.5%)", worst: "Debit Note Issued (59.2%)" },
];

interface QualityRow {
  id: string;
  name: string;
  clarity: number;      // /2
  tone: number;         // /2
  ctaStrength: number;  // /2
  length: number;       // /2
  personalisation: number; // /2
  gaps: string[];
}

const QUALITY: QualityRow[] = [
  { id: "APOLLO-100234", name: "PO Extension Approved", clarity: 2, tone: 2, ctaStrength: 2, length: 2, personalisation: 1.5, gaps: ["Personalisation token missing in salutation"] },
  { id: "APOLLO-100355", name: "Invoice Rejected", clarity: 2, tone: 2, ctaStrength: 2, length: 2, personalisation: 2, gaps: [] },
  { id: "APOLLO-100511", name: "Payout Confirmation", clarity: 2, tone: 2, ctaStrength: 2, length: 2, personalisation: 2, gaps: [] },
  { id: "APOLLO-100311", name: "Weekly Fill Rate Digest", clarity: 1.5, tone: 2, ctaStrength: 2, length: 1.5, personalisation: 1, gaps: ["Subject > 60 characters", "Body exceeds 400 words"] },
  { id: "APOLLO-100455", name: "Monthly Spends Summary", clarity: 2, tone: 1.5, ctaStrength: 1, length: 1.5, personalisation: 1, gaps: ["Body readability low", "CTA verb missing", "No vendor name token"] },
  { id: "APOLLO-100402", name: "Catalogue Update Required", clarity: 1.5, tone: 2, ctaStrength: 1.5, length: 2, personalisation: 1, gaps: ["Subject > 60 characters", "CTA verb missing"] },
];

// ------------------ Page ------------------

function CommsPerformancePage() {
  const { role } = useRole();
  if (role !== "internal_ops") return <Navigate to="/notifications" replace />;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Comms Performance</h1>
          <p className="text-sm text-muted-foreground">Simulating: Pulse metrics · sample data only</p>
        </header>

        <KpiRow />
        <TemplateCtrCard />
        <HourlyCtrCard />
        <BounceCard />
        <NonOpenerCard />
        <FinanceGroupCard />
        <QualityCard />
      </div>
    </AppShell>
  );
}

// ------------------ KPI tiles ------------------

function KpiRow() {
  const avgCtr = useMemo(() => {
    const total = TEMPLATE_CTR.reduce((a, b) => a + b.ctr, 0);
    return (total / TEMPLATE_CTR.length).toFixed(1);
  }, []);
  const bounceRate = useMemo(() => {
    const totalSent = BOUNCES.reduce((a, b) => a + b.sent, 0);
    const totalBounced = BOUNCES.reduce((a, b) => a + b.hard + b.soft, 0);
    return ((totalBounced / totalSent) * 100).toFixed(1);
  }, []);
  const avgQuality = useMemo(() => {
    const total = QUALITY.reduce(
      (a, b) => a + b.clarity + b.tone + b.ctaStrength + b.length + b.personalisation,
      0,
    );
    return (total / QUALITY.length).toFixed(1);
  }, []);

  const tiles = [
    { label: "Avg CTR", value: `${avgCtr}%`, icon: MousePointerClick },
    { label: "Bounce rate", value: `${bounceRate}%`, icon: MailWarning },
    { label: "Non-openers", value: INITIAL_NON_OPENERS.length, icon: EyeOff },
    { label: "Avg quality", value: `${avgQuality} / 10`, icon: Gauge },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{t.value}</div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------ Section card wrapper ------------------

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

// ------------------ 1. Template CTR ------------------

function TemplateCtrCard() {
  return (
    <SectionCard
      title="Template-level CTR"
      description="Click-through rate for the last 7 days, per template."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Sends</TableHead>
            <TableHead className="text-right">Opens</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead>Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TEMPLATE_CTR.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs">{t.id}</TableCell>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell className="text-muted-foreground">{t.category}</TableCell>
              <TableCell className="text-right tabular-nums">
                {t.sends.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {t.opens.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {t.clicks.toLocaleString()}
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
            </TableRow>
          ))}
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
      title="Time-of-day CTR — announcement mailers"
      description="CTR by send hour (IST). Filtered to Announcement category templates only."
    >
      <div className="flex items-end gap-1.5 h-40">
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
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}:00</span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Best window:{" "}
        <span className="font-medium text-foreground">
          {String(peakHour).padStart(2, "0")}:00–{String(peakHour + 1).padStart(2, "0")}:00 IST
        </span>{" "}
        · peak CTR {max}%.
      </p>
    </SectionCard>
  );
}

// ------------------ 3. Bounce tracker ------------------

function BounceCard() {
  return (
    <SectionCard
      title="Bounce tracker"
      description="Hard and soft bounces by template. Rows with more than 5% bounce are flagged."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template ID</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            <TableHead className="text-right">Hard</TableHead>
            <TableHead className="text-right">Soft</TableHead>
            <TableHead className="text-right">Bounce%</TableHead>
            <TableHead>Top reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BOUNCES.map((r) => {
            const rate = ((r.hard + r.soft) / r.sent) * 100;
            const high = rate > 5;
            return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.sent.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.delivered.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.hard}</TableCell>
                <TableCell className="text-right tabular-nums">{r.soft}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={cn(
                      "font-semibold",
                      high
                        ? "bg-cat-red-soft text-cat-red hover:bg-cat-red-soft"
                        : "bg-cat-green-soft text-cat-green hover:bg-cat-green-soft",
                    )}
                  >
                    {rate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.reason}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

// ------------------ 4. Non-opener tracker ------------------

function NonOpenerCard() {
  const [rows, setRows] = useState<NonOpener[]>(INITIAL_NON_OPENERS);

  const suppress = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Suppressed for this template");
  };
  const route = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Ticket raised with Help & Support");
  };

  return (
    <SectionCard
      title="Non-opener tracker"
      description="Vendors who haven't opened the last several sends of a template."
    >
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No non-openers pending action.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Template</TableHead>
              <TableHead className="text-right">Consecutive non-opens</TableHead>
              <TableHead>Last opened</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {r.vendor}
                    {r.profile === "Low Tech" && (
                      <Badge variant="outline" className="text-[10px]">
                        Low Tech
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.tenant}</TableCell>
                <TableCell>{r.template}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {r.consecutive}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.lastOpened}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => suppress(r.id)}
                    >
                      <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                      Suppress
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => route(r.id)}
                    >
                      <LifeBuoy className="mr-1.5 h-3.5 w-3.5" />
                      Route to Help & Support
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ------------------ 5. Finance mail CTR (config level) ------------------

function FinanceGroupCard() {
  return (
    <SectionCard
      title="Finance mail CTR — configuration level"
      description="Finance templates grouped by inherited configuration (Channel × Batching × Escalation)."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Configuration signature</TableHead>
            <TableHead className="text-right">Templates</TableHead>
            <TableHead className="text-right">Total sends</TableHead>
            <TableHead className="text-right">Avg CTR</TableHead>
            <TableHead>Best template</TableHead>
            <TableHead>Worst template</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FINANCE_GROUPS.map((g) => (
            <TableRow key={g.signature}>
              <TableCell className="font-medium">{g.signature}</TableCell>
              <TableCell className="text-right tabular-nums">{g.templates}</TableCell>
              <TableCell className="text-right tabular-nums">
                {g.sends.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {g.avgCtr}%
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

// ------------------ 6. Content quality score ------------------

function QualityCard() {
  const [gapsFor, setGapsFor] = useState<QualityRow | null>(null);

  return (
    <SectionCard
      title="Content quality score"
      description="Minimum 9 / 10 required to publish."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Score / 10</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {QUALITY.map((q) => {
            const total =
              q.clarity + q.tone + q.ctaStrength + q.length + q.personalisation;
            let status: "publishable" | "improve" | "blocked" = "blocked";
            if (total >= 9) status = "publishable";
            else if (total >= 7) status = "improve";
            return (
              <TableRow key={q.id}>
                <TableCell className="font-mono text-xs">{q.id}</TableCell>
                <TableCell className="font-medium">{q.name}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {total.toFixed(1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {status === "publishable" && (
                      <Badge className="bg-cat-green-soft text-cat-green hover:bg-cat-green-soft">
                        Publishable
                      </Badge>
                    )}
                    {status === "improve" && (
                      <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">
                        Needs improvement
                      </Badge>
                    )}
                    {status === "blocked" && (
                      <Badge className="bg-cat-red-soft text-cat-red hover:bg-cat-red-soft">
                        Blocked
                      </Badge>
                    )}
                    {status !== "publishable" && (
                      <button
                        type="button"
                        onClick={() => setGapsFor(q)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View gaps
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!gapsFor} onOpenChange={(o) => !o && setGapsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quality gaps</DialogTitle>
            <DialogDescription>
              {gapsFor?.id} — {gapsFor?.name}
            </DialogDescription>
          </DialogHeader>
          {gapsFor && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Clarity", gapsFor.clarity],
                  ["Tone", gapsFor.tone],
                  ["CTA strength", gapsFor.ctaStrength],
                  ["Length", gapsFor.length],
                  ["Personalisation", gapsFor.personalisation],
                ].map(([label, val]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-1.5"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {val} / 2
                    </span>
                  </div>
                ))}
              </div>
              {gapsFor.gaps.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-foreground">
                    Suggested fixes
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                    {gapsFor.gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Reach 9 / 10 or higher to unlock publish.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
