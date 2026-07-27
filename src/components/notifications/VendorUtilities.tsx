import { useState } from "react";
import {
  Stethoscope,
  Route,
  MoonStar,
  PlaneTakeoff,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Info,
  Mail,
  MessageCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CheckState = "idle" | "running" | "pass" | "fail";
const TESTS = [
  { id: "phone", label: "Verified phone & email on file" },
  { id: "bounce", label: "Check bounce / suppression list" },
  { id: "wa", label: "Test WhatsApp connectivity (Meta ID)" },
  { id: "mail", label: "Send test email to primary POC" },
] as const;

function DiagnoseModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [state, setState] = useState<Record<string, CheckState>>({});

  const run = () => {
    setState(Object.fromEntries(TESTS.map((t) => [t.id, "running"])));
    TESTS.forEach((t, i) => {
      setTimeout(
        () => {
          setState((s) => ({
            ...s,
            [t.id]: t.id === "bounce" ? "fail" : "pass",
          }));
        },
        600 + i * 500,
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Diagnose My Comms
          </DialogTitle>
          <DialogDescription>
            Runs 4 quick checks to make sure notifications can actually reach you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {TESTS.map((t) => {
            const s = state[t.id] ?? "idle";
            return (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <span>{t.label}</span>
                {s === "idle" && (
                  <span className="text-xs text-muted-foreground">Not run</span>
                )}
                {s === "running" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {s === "pass" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-cat-green">
                    <CheckCircle2 className="h-4 w-4" /> Passed
                  </span>
                )}
                {s === "fail" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                    <XCircle className="h-4 w-4" /> Needs attention
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={run}>Run diagnostics</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  badge: { text: string; tone: "amber" | "green" };
};

function StatCard({ icon, label, value, subtext, badge }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
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
    </div>
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

function DepartmentBreakdownTable() {
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
            return (
              <TableRow key={d.role}>
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
                  {d.status === "healthy" ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Healthy
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <AlertTriangle className="mr-1 h-3 w-3" /> 3 Bounces Logged
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

export function VendorUtilitiesSection() {
  const [diagOpen, setDiagOpen] = useState(false);

  // Role-based alert routing
  const [financeEmail, setFinanceEmail] = useState("cfo@itc-limited.com");
  const [warehouseWA, setWarehouseWA] = useState("+91 98200 44112");

  // Quiet hours
  const [quietOn, setQuietOn] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  // OOO
  const [ooo, setOoo] = useState(false);
  const [backup, setBackup] = useState("Ramesh Iyer — Finance Manager");

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-semibold">Comms Deliverability &amp; Health Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Real-time delivery rates, bounce logs, and team SLA response metrics for
          ITC Limited.
        </p>
      </div>

      {/* Operational lock notice */}
      <div className="border-b border-border bg-muted/30 p-4">
        <div className="flex items-start gap-2 text-xs">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">
              Operational &amp; Financial comms (P1/P2)
            </span>{" "}
            are locked ON — mandatory operational notification required by
            contract.
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 border-b border-border p-4 sm:grid-cols-3">
        <StatCard
          icon={<Mail className="h-4 w-4" />}
          label="Email Deliverability"
          value="97.6%"
          subtext="142 / 145 Delivered"
          badge={{ text: "⚠️ 3 Bounces Logged", tone: "amber" }}
        />
        <StatCard
          icon={<MessageCircle className="h-4 w-4" />}
          label="WhatsApp Deliverability"
          value="100%"
          subtext="88 / 88 Delivered"
          badge={{ text: "✓ 0 Failures", tone: "green" }}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Team Response SLA"
          value="1h 42m Avg"
          subtext="Target: < 4 business hours"
          badge={{ text: "98.4% P1 Compliance", tone: "green" }}
        />
      </div>

      {/* Department breakdown */}
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-medium">Department &amp; role delivery breakdown</p>
        </div>
        <DepartmentBreakdownTable />
      </div>

      {/* Diagnose */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cat-blue-soft text-cat-blue">
            <Stethoscope className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Diagnose My Comms</p>
            <p className="text-xs text-muted-foreground">
              Run 4 checks: phone/email verified, bounce list, WhatsApp
              connectivity, test mail.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDiagOpen(true)}>
          Run diagnostics
        </Button>
      </div>

      {/* Role-based alert routing */}
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Role-based alert routing</p>
          <Badge variant="outline" className="text-[10px]">
            Overrides
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Finance comms → Email
            </Label>
            <Input
              value={financeEmail}
              onChange={(e) => setFinanceEmail(e.target.value)}
              placeholder="cfo@company.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Warehouse Ops comms → WhatsApp
            </Label>
            <Input
              value={warehouseWA}
              onChange={(e) => setWarehouseWA(e.target.value)}
              placeholder="+91 …"
            />
          </div>
        </div>
      </div>

      {/* Quiet hours */}
      <div className="border-b border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MoonStar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Non-P1 quiet hours</p>
            <Badge variant="outline" className="text-[10px]">
              P1 always delivered
            </Badge>
          </div>
          <Switch checked={quietOn} onCheckedChange={setQuietOn} />
        </div>
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            !quietOn && "pointer-events-none opacity-50",
          )}
        >
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Start (IST)</Label>
            <Select value={quietStart} onValueChange={setQuietStart}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["20:00", "21:00", "22:00", "23:00"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">End (IST)</Label>
            <Select value={quietEnd} onValueChange={setQuietEnd}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["06:00", "07:00", "08:00", "09:00"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Non-P1 comms received in this window batch into a single morning
          digest at {quietEnd}.
        </p>
      </div>

      {/* OOO */}
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlaneTakeoff className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Out-of-office &amp; auto-delegation</p>
          </div>
          <Switch checked={ooo} onCheckedChange={setOoo} />
        </div>
        <div
          className={cn(
            "grid gap-1.5",
            !ooo && "pointer-events-none opacity-50",
          )}
        >
          <Label className="text-xs text-muted-foreground">
            Backup POC (critical comms auto-route here while you&apos;re away)
          </Label>
          <Input
            value={backup}
            onChange={(e) => setBackup(e.target.value)}
            placeholder="Name — role"
          />
        </div>
        {ooo && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <PlaneTakeoff className="h-3.5 w-3.5" />
            OOO active — P1 comms rerouted to {backup}. Others queue for your
            return.
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border p-3">
        <Button
          size="sm"
          onClick={() => toast.success("Vendor utilities saved")}
        >
          Save changes
        </Button>
      </div>

      <DiagnoseModal open={diagOpen} onOpenChange={setDiagOpen} />
    </section>
  );
}
