import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PlusCircle, ArrowRight, ShieldAlert, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRole } from "@/lib/role-context";
import { colorClasses, type Category, type CategoryId } from "@/lib/mock-data";

export const Route = createFileRoute("/add-communication")({
  head: () => ({
    meta: [{ title: "Add Communication — PartnersBiz Comms Centre" }],
  }),
  component: AddCommunicationPage,
});

interface CommConfig {
  label: string;
  color: Category["color"];
  channel: string;
  batching: string;
  escalation: string;
  expiry: string;
}

const CONFIG: Record<CategoryId, CommConfig> = {
  action_required: {
    label: "Action Required",
    color: "red",
    channel: "Both (Portal + Mail)",
    batching: "Real time no batching",
    escalation: "Auto escalate to Ops/CM queue",
    expiry: "Persist until resolved",
  },
  finance_payments: {
    label: "Finance & Payments",
    color: "amber",
    channel: "Both (Portal + Mail)",
    batching: "Real time / weekly by type",
    escalation: "Auto escalate disputes only",
    expiry: "Persist until resolved",
  },
  reports_analytics: {
    label: "Reports & Analytics",
    color: "green",
    channel: "Portal first mail optional",
    batching: "Weekly / Monthly / Quarterly",
    escalation: "None informational",
    expiry: "Auto expire next cycle",
  },
  daily_ops: {
    label: "Daily Ops Updates",
    color: "blue",
    channel: "Portal + batched digest mail",
    batching: "Daily digest fixed time",
    escalation: "None confirmation only",
    expiry: "48 to 72 hrs",
  },
  reminders: {
    label: "Reminders",
    color: "purple",
    channel: "Portal push + mail if P1",
    batching: "Single scheduled trigger",
    escalation: "Auto escalate to queue at threshold",
    expiry: "Auto clear at deadline",
  },
  account_access: {
    label: "Account & Access",
    color: "grey",
    channel: "Mail only",
    batching: "Real time no batching",
    escalation: "Escalate to Admin queue non OTP only",
    expiry: "OTP window / until login",
  },
};

const COMM_TYPES: { key: string; label: string; category: CategoryId }[] = [
  { key: "financial", label: "Financial", category: "finance_payments" },
  { key: "periodic", label: "Periodic", category: "reports_analytics" },
  { key: "high_frequency", label: "High frequency", category: "daily_ops" },
  { key: "pre_emptive", label: "Pre emptive", category: "reminders" },
  { key: "security", label: "Security", category: "account_access" },
];

function AddCommunicationPage() {
  const { role } = useRole();

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [losesMoney, setLosesMoney] = useState<"yes" | "no" | null>(null);
  const [commType, setCommType] = useState<string | null>(null);

  const resolvedCategory: CategoryId | null = useMemo(() => {
    if (losesMoney === "yes") return "action_required";
    if (losesMoney === "no" && commType) {
      return COMM_TYPES.find((t) => t.key === commType)?.category ?? null;
    }
    return null;
  }, [losesMoney, commType]);

  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  const config = resolvedCategory ? CONFIG[resolvedCategory] : null;

  const reset = () => {
    setName("");
    setTrigger("");
    setLosesMoney(null);
    setCommType(null);
  };

  const submit = () => {
    const commName = name.trim() || "Untitled communication";
    toast.success(`${commName} submitted for approval`);
    reset();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Add Communication
          </h1>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Draft a new comm, configuration is assigned automatically by category.
        </p>

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Content is finalized in Apollo and scheduled via Workdesk. All new or edited
            communications go through a single review step before going live, regardless
            of which team submits them.
          </p>
        </div>


        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-2">
            <Label htmlFor="commName">Communication name</Label>
            <Input
              id="commName"
              placeholder="e.g. PO cancellation alert"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trigger">Trigger condition</Label>
            <Input
              id="trigger"
              placeholder="e.g. When a PO is cancelled by the buyer"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Is this an actionable task?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={losesMoney === "yes" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setLosesMoney("yes");
                  setCommType(null);
                }}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={losesMoney === "no" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setLosesMoney("no")}
              >
                No
              </Button>
            </div>
          </div>

          {losesMoney === "no" && (
            <div className="grid gap-2">
              <Label>What type of communication is this?</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COMM_TYPES.map((t) => (
                  <Button
                    key={t.key}
                    type="button"
                    variant={commType === t.key ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setCommType(t.key)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {resolvedCategory === "action_required" && config && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4",
                "border-cat-red/40 bg-cat-red-soft/40",
              )}
            >
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-cat-red" />
              <div>
                <p className="text-sm font-semibold text-cat-red">
                  Category = Action Required
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  High-impact comm — no further questions needed.
                </p>
              </div>
            </div>
          )}

          {config && (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Configuration preview
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    colorClasses[config.color].badge,
                  )}
                >
                  {config.label}
                </span>
              </div>
              <dl className="divide-y divide-border">
                <ConfigRow label="Channel" value={config.channel} />
                <ConfigRow label="Batching" value={config.batching} />
                <ConfigRow label="Escalation" value={config.escalation} />
                <ConfigRow label="Portal Expiry" value={config.expiry} />
              </dl>
            </div>
          )}

          {config && (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Check the Send Calendar to see if this can be clubbed with an existing
                  send before submitting.
                </p>
              </div>
              <Button className="w-full gap-1.5" onClick={submit}>
                Submit for Approval <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Prototype, sample data only, this comm is not persisted after refresh.
        </p>
      </div>
    </AppShell>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}
