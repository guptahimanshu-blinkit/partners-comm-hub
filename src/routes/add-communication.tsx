import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PlusCircle, ArrowRight, Info, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRole } from "@/lib/role-context";
import { colorClasses } from "@/lib/mock-data";
import {
  inferCategoryRules,
  addCampaign,
  type SubCategoryPurpose,
  type DomainType,
  type InferredRules,
  type Campaign,
} from "@/lib/requests-store";

export const Route = createFileRoute("/add-communication")({
  head: () => ({
    meta: [{ title: "Add Communication — PartnersBiz Comms Centre" }],
  }),
  component: AddCommunicationPage,
});

const SUB_CATEGORIES: SubCategoryPurpose[] = [
  "Reports",
  "Announcements",
  "Campaigns",
  "Defect Flow Communications",
];
const DOMAINS: DomainType[] = [
  "Operations & Appointments",
  "Finance & Payments",
  "Assortment / MDM",
  "Warehouse Ops",
  "Monetization",
];

const CATEGORY_LABEL: Record<string, string> = {
  action_required: "Action Required",
  finance_payments: "Finance & Payments",
  reports_analytics: "Reports & Analytics",
  daily_ops: "Daily Ops Updates",
  reminders: "Reminders",
  account_access: "Account & Access",
};
const CATEGORY_COLOR: Record<string, "red" | "amber" | "green" | "blue" | "purple" | "grey"> = {
  action_required: "red",
  finance_payments: "amber",
  reports_analytics: "green",
  daily_ops: "blue",
  reminders: "purple",
  account_access: "grey",
};

function AddCommunicationPage() {
  const { role } = useRole();

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [subCategory, setSubCategory] = useState<SubCategoryPurpose | "">("");
  const [domain, setDomain] = useState<DomainType | "">("");

  const inferred: InferredRules | null = useMemo(() => {
    if (!subCategory || !domain) return null;
    return inferCategoryRules(subCategory, domain);
  }, [subCategory, domain]);

  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  const reset = () => {
    setName("");
    setTrigger("");
    setSubCategory("");
    setDomain("");
  };

  const submit = () => {
    const commName = name.trim() || "Untitled communication";
    if (inferred) {
      const id = `CMP-AC${Math.floor(Math.random() * 900000 + 100000)}`;
      const campaign: Campaign = {
        id,
        requestId: `REQ-AC-${id}`,
        templateId: `APOLLO-${id.slice(-6)}`,
        name: commName,
        categoryId: inferred.categoryId,
        priority: inferred.priority,
        purpose: trigger.trim() || commName,
        channels: inferred.channels.includes("WhatsApp")
          ? ["Email", "WhatsApp", "Dashboard"]
          : ["Email", "Dashboard"],
        segment: "All vendors",
        audienceCount: 3880,
        triggerType: "One time",
        frequency: "Once",
        reminders: inferred.priority === "P1" ? 2 : inferred.priority === "P2" ? 1 : 0,
        status: "Running",
        attachment: "None",
        cta: "Direct Link",
        formulaFlags: ["None"],
        approvedBy: "Aisha Khan",
        acknowledgedAt: new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }),
        firstSend: "Now",
        submitterName: "Himanshu Gupta",
        publishedAt: new Date().toISOString(),
      };
      addCampaign(campaign);
      toast.success(
        `${commName} launched — vendor notification synced to PartnersBiz.`,
      );
    } else {
      toast.success(`${commName} submitted for approval`);
    }
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
          Draft a new comm — category, priority, channels, batching, and expiry
          are inferred automatically from purpose × domain.
        </p>

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Content is finalized in Apollo and scheduled via Workdesk. All new or
            edited communications go through a single review step before going
            live, regardless of which team submits them.
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
            <Label>Sub-Category Purpose</Label>
            <Select
              value={subCategory}
              onValueChange={(v) => setSubCategory(v as SubCategoryPurpose)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {SUB_CATEGORIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Domain</Label>
            <Select
              value={domain}
              onValueChange={(v) => setDomain(v as DomainType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {inferred && (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  System-Inferred Rules
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  className={cn(
                    "hover:bg-inherit",
                    colorClasses[CATEGORY_COLOR[inferred.categoryId]].badge,
                  )}
                >
                  Category: {CATEGORY_LABEL[inferred.categoryId]}
                </Badge>
                <Badge className="bg-cat-red-soft text-cat-red hover:bg-cat-red-soft">
                  Priority: {inferred.priority}
                </Badge>
                {inferred.channels.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
                <Badge variant="secondary">Batching: {inferred.batching}</Badge>
                <Badge variant="secondary">Expiry: {inferred.expiry}</Badge>
                <Badge
                  className={cn(
                    "hover:bg-inherit",
                    inferred.unsubscribe === "LOCKED_DISABLED"
                      ? "bg-cat-red-soft text-cat-red"
                      : "bg-cat-green-soft text-cat-green",
                  )}
                >
                  {inferred.unsubscribe === "LOCKED_DISABLED"
                    ? "Unsubscribe: Locked"
                    : "Unsubscribe: Allowed"}
                </Badge>
              </div>
            </div>
          )}

          {inferred && (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Check the Send Calendar to see if this can be clubbed with an
                  existing send before submitting.
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
