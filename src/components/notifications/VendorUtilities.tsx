import { useState } from "react";
import {
  CheckCircle2,
  Lock,
  Mail,
  MessageCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Zap,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DrillTarget = "email" | "whatsapp" | "sla" | null;
type EmailFilter = "all" | "scm";

type BounceRow = {
  address: string;
  ref: string;
  error: string;
  timestamp: string;
  dept: "scm" | "warehouse";
};

const BOUNCES: BounceRow[] = [
  {
    address: "scm-lead@itc-limited.com",
    ref: "PO #KF-77120",
    error: "550 Mailbox Full",
    timestamp: "26 Jul 10:14 IST",
    dept: "scm",
  },
  {
    address: "scm-lead@itc-limited.com",
    ref: "PO #AS-64410",
    error: "550 Mailbox Full",
    timestamp: "25 Jul 18:30 IST",
    dept: "scm",
  },
  {
    address: "logistics@itc-limited.com",
    ref: "INV-DF-22044",
    error: "Domain Firewall Block",
    timestamp: "24 Jul 14:12 IST",
    dept: "warehouse",
  },
];

const SLA_ROWS = [
  { category: "PO Cancellations", avg: "42m avg", tone: "green" as const },
  { category: "Price Revisions", avg: "1h 10m avg", tone: "green" as const },
  { category: "TDS Disputes", avg: "2h 15m avg", tone: "amber" as const },
];

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  badge: { text: string; tone: "amber" | "green" };
  onClick: () => void;
};

function StatCard({ icon, label, value, subtext, badge, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-muted-foreground">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtext}</div>
      <Badge
        className={cn(
          "mt-3 text-[11px] font-medium",
          badge.tone === "amber"
            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
        )}
      >
        {badge.text}
      </Badge>
    </button>
  );
}

type DepartmentRow = {
  role: string;
  channel: string;
  address: string;
  sent: number;
  delivered: number;
  status: "healthy" | "warning";
};

const DEPARTMENTS: DepartmentRow[] = [
  {
    role: "Finance & Payments (FM)",
    channel: "Email",
    address: "cfo@itc-limited.com",
    sent: 48,
    delivered: 48,
    status: "healthy",
  },
  {
    role: "Supply Chain Ops (SCM)",
    channel: "Email",
    address: "scm-lead@itc-limited.com",
    sent: 64,
    delivered: 61,
    status: "warning",
  },
  {
    role: "Warehouse & Dispatch",
    channel: "WhatsApp",
    address: "+91 98200 44112",
    sent: 33,
    delivered: 33,
    status: "healthy",
  },
];

function DepartmentBreakdownTable({
  onScmClick,
}: {
  onScmClick: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-xs font-medium">Department / Role</TableHead>
            <TableHead className="text-xs font-medium">Channel</TableHead>
            <TableHead className="text-xs font-medium">Sent</TableHead>
            <TableHead className="text-xs font-medium">Delivered</TableHead>
            <TableHead className="text-xs font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEPARTMENTS.map((d) => {
            const pct = ((d.delivered / d.sent) * 100).toFixed(1);
            const isWarn = d.status === "warning";
            return (
              <TableRow
                key={d.role}
                onClick={isWarn ? onScmClick : undefined}
                className={cn(isWarn && "cursor-pointer hover:bg-muted/40")}
              >
                <TableCell className="font-medium">{d.role}</TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground">{d.channel}</div>
                  <div className="text-xs">{d.address}</div>
                </TableCell>
                <TableCell className="tabular-nums">{d.sent}</TableCell>
                <TableCell className="tabular-nums">
                  {d.delivered} ({pct}%)
                </TableCell>
                <TableCell>
                  {isWarn ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <AlertTriangle className="mr-1 h-3 w-3" /> 3 Bounces Logged
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Healthy
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EmailAuditSheet({
  open,
  onOpenChange,
  filter,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filter: EmailFilter;
}) {
  const rows =
    filter === "scm" ? BOUNCES.filter((b) => b.dept === "scm") : BOUNCES;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Bounce &amp; Delivery Audit
          </SheetTitle>
          <SheetDescription>
            {filter === "scm"
              ? "Filtered: Supply Chain Ops · last 72h"
              : "Last 72h · 145 sent · 3 bounces"}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs">Recipient</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs">Error</TableHead>
                  <TableHead className="text-xs">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">
                      {b.address}
                    </TableCell>
                    <TableCell className="text-xs">{b.ref}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                      >
                        {b.error}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.timestamp}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <div className="text-xs">
              <p className="font-medium">Fix at the source</p>
              <p className="text-muted-foreground">
                Update the SCM POC email to resume delivery.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                toast.success("Opening SCM contact editor…");
                onOpenChange(false);
              }}
            >
              Update SCM Email Address
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WhatsAppAuditSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp Delivery Telemetry
          </SheetTitle>
          <SheetDescription>Last 72h · Meta Business API</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <MetricRow
            icon={<Zap className="h-4 w-4 text-emerald-600" />}
            label="Meta API Latency"
            value="1.1s avg"
          />
          <MetricRow
            icon={<PhoneCall className="h-4 w-4 text-emerald-600" />}
            label="Primary Registered Number"
            value="+91 98200 44112"
          />
          <MetricRow
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Bounces / Errors"
            value="0"
          />
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            All 88 messages delivered in the last 72h. Channel healthy.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SlaSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Vendor SLA Performance Breakdown
          </SheetTitle>
          <SheetDescription>
            Avg turnaround by category · target &lt; 4 business hours
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {SLA_ROWS.map((r) => (
            <div
              key={r.category}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <span className="text-sm font-medium">{r.category}</span>
              <Badge
                className={cn(
                  "text-[11px]",
                  r.tone === "green"
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-100",
                )}
              >
                {r.avg}
              </Badge>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function VendorUtilitiesSection() {
  const [drill, setDrill] = useState<DrillTarget>(null);
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");

  const openEmail = (f: EmailFilter) => {
    setEmailFilter(f);
    setDrill("email");
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-semibold">
          Comms Deliverability &amp; Health Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time delivery rates, bounce logs, and team SLA response metrics for
          ITC Limited.
        </p>
      </div>

      <div className="border-b border-border bg-muted/30 p-4">
        <div className="flex items-start gap-2 text-xs">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">
              Operational &amp; Financial comms (P1/P2)
            </span>{" "}
            are locked ON — required by contract.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-border p-4 sm:grid-cols-3">
        <StatCard
          icon={<Mail className="h-4 w-4" />}
          label="Email Deliverability"
          value="97.6%"
          subtext="142 / 145 Delivered"
          badge={{ text: "⚠️ 3 Bounces Logged", tone: "amber" }}
          onClick={() => openEmail("all")}
        />
        <StatCard
          icon={<MessageCircle className="h-4 w-4" />}
          label="WhatsApp Deliverability"
          value="100%"
          subtext="88 / 88 Delivered"
          badge={{ text: "✓ 0 Failures", tone: "green" }}
          onClick={() => setDrill("whatsapp")}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Team Response SLA"
          value="1h 42m Avg"
          subtext="Target: < 4 business hours"
          badge={{ text: "98.4% P1 Compliance", tone: "green" }}
          onClick={() => setDrill("sla")}
        />
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-medium">
            Department &amp; role delivery breakdown
          </p>
        </div>
        <DepartmentBreakdownTable onScmClick={() => openEmail("scm")} />
      </div>

      <EmailAuditSheet
        open={drill === "email"}
        onOpenChange={(v) => !v && setDrill(null)}
        filter={emailFilter}
      />
      <WhatsAppAuditSheet
        open={drill === "whatsapp"}
        onOpenChange={(v) => !v && setDrill(null)}
      />
      <SlaSheet
        open={drill === "sla"}
        onOpenChange={(v) => !v && setDrill(null)}
      />
    </section>
  );
}
