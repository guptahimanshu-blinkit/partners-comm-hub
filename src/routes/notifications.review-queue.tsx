import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  Inbox,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Info,
  Check,
  Send,
  Save,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Paperclip,
  Link2,
  Layers,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRole } from "@/lib/role-context";
import { colorClasses, type Category, type CategoryId } from "@/lib/mock-data";

export const Route = createFileRoute("/notifications/review-queue")({
  head: () => ({
    meta: [{ title: "Comms Review Queue — PartnersBiz Comms Centre" }],
  }),
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const { role, internalRole } = useRole();
  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Comms Review Queue
          </h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          {internalRole === "Template Submitter"
            ? "Draft a new template, categorize it, and send it for approval."
            : "Review pending templates from your team. Approve to publish, reject to send back with notes."}
        </p>

        {internalRole === "Template Submitter" ? (
          <TemplateSubmitterFlow />
        ) : (
          <ApproverQueue />
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Config profiles (aligned with Add Communication + Category Configuration)  */
/* -------------------------------------------------------------------------- */

interface CommConfig {
  label: string;
  color: Category["color"];
  channel: string;
  batching: string;
  escalation: string;
  expiry: string;
  priority: string;
}

const CONFIG: Record<CategoryId, CommConfig> = {
  action_required: {
    label: "Action Required",
    color: "red",
    channel: "Both (Portal + Mail)",
    batching: "Real time no batching",
    escalation: "Auto escalate to Ops/CM queue",
    expiry: "Persist until resolved",
    priority: "P1",
  },
  finance_payments: {
    label: "Finance & Payments",
    color: "amber",
    channel: "Both (Portal + Mail)",
    batching: "Real time / weekly by type",
    escalation: "Auto escalate disputes only",
    expiry: "Persist until resolved",
    priority: "P1 or P2",
  },
  reports_analytics: {
    label: "Reports & Analytics",
    color: "green",
    channel: "Portal first mail optional",
    batching: "Weekly / Monthly / Quarterly",
    escalation: "None informational",
    expiry: "Auto expire next cycle",
    priority: "P2 or P3",
  },
  daily_ops: {
    label: "Daily Ops Updates",
    color: "blue",
    channel: "Portal + batched digest mail",
    batching: "Daily digest fixed time",
    escalation: "None confirmation only",
    expiry: "48 to 72 hrs",
    priority: "P2",
  },
  reminders: {
    label: "Reminders",
    color: "purple",
    channel: "Portal push + mail if P1",
    batching: "Single scheduled trigger",
    escalation: "Auto escalate to queue at threshold",
    expiry: "Auto clear at deadline",
    priority: "P1 or P2",
  },
  account_access: {
    label: "Account & Access",
    color: "grey",
    channel: "Mail only",
    batching: "Real time no batching",
    escalation: "Escalate to Admin queue non OTP only",
    expiry: "OTP window / until login",
    priority: "P1 or P2",
  },
};

const COMM_TYPES: { key: string; label: string; category: CategoryId }[] = [
  { key: "financial", label: "Financial", category: "finance_payments" },
  { key: "periodic", label: "Periodic", category: "reports_analytics" },
  { key: "high_frequency", label: "High frequency", category: "daily_ops" },
  { key: "pre_emptive", label: "Pre emptive", category: "reminders" },
  { key: "security", label: "Security", category: "account_access" },
];

const TENANTS = ["Inch", "Eternal", "District", "Blinkit", "Hyperpure", "Zomato"];
const APOLLO_CATEGORIES = ["Internal", "Important Updates", "Orders and Purchases"];

type AttachmentType = "None" | "PDF" | "Image" | "Excel Export";
type CtaType = "None" | "Direct Link" | "Autofilled Help & Support Ticket";

/* -------------------------------------------------------------------------- */
/* Template Submitter flow                                                    */
/* -------------------------------------------------------------------------- */

function TemplateSubmitterFlow() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tenant, setTenant] = useState("Blinkit");
  const [templateType, setTemplateType] = useState("Transactional");
  const [apolloCategory, setApolloCategory] = useState("Important Updates");
  const [rateLimit, setRateLimit] = useState("");
  const [variables, setVariables] = useState("{}");

  // Step 2
  const [losesMoney, setLosesMoney] = useState<"yes" | "no" | null>(null);
  const [commType, setCommType] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AttachmentType>("None");
  const [cta, setCta] = useState<CtaType>("None");
  const [ctaLink, setCtaLink] = useState("");

  // Step 4
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resolvedCategory: CategoryId | null = useMemo(() => {
    if (losesMoney === "yes") return "action_required";
    if (losesMoney === "no" && commType) {
      return COMM_TYPES.find((t) => t.key === commType)?.category ?? null;
    }
    return null;
  }, [losesMoney, commType]);

  const config = resolvedCategory ? CONFIG[resolvedCategory] : null;

  const subType = useMemo(() => {
    if (commType !== "financial" && commType !== "periodic") return null;
    const d = description.toLowerCase();
    if (/\b(every|weekly|monthly|daily|hourly|quarterly)\b/.test(d)) {
      return "Scheduled Push";
    }
    if (/\b(clicks?|requests?|downloads?)\b/.test(d)) return "On Demand Pull";
    return null;
  }, [commType, description]);

  const step1Valid = name.trim().length > 0 && description.trim().length > 0;
  const step2Valid = !!config;

  const reset = () => {
    setStep(1);
    setName("");
    setDescription("");
    setTenant("Blinkit");
    setTemplateType("Transactional");
    setApolloCategory("Important Updates");
    setRateLimit("");
    setVariables("{}");
    setLosesMoney(null);
    setCommType(null);
    setAttachment("None");
    setCta("None");
    setCtaLink("");
  };

  const submittedRecord = () => ({
    name,
    tenant,
    type: templateType,
    apolloCategory,
    category: config?.label,
    subType,
    priority: config?.priority,
    attachment,
    ctaType: cta,
    ctaLink: cta === "Direct Link" ? ctaLink : undefined,
  });

  const submitReview = () => {
    // eslint-disable-next-line no-console
    console.log("Submitted for review", submittedRecord());
    toast.success(`${name || "Untitled template"} submitted for review`);
    reset();
  };
  const saveDraft = () => {
    // eslint-disable-next-line no-console
    console.log("Saved as draft", submittedRecord());
    toast.success(`${name || "Untitled template"} saved as draft`);
    reset();
  };
  const notifySlack = () => {
    toast.success("Slack notification sent to #comms-review");
  };

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 1 && (
        <SectionCard title="Create Template">
          <Field label="Name" required>
            <Input
              placeholder="Template name (used to identify / search)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field
            label="Description"
            required
            hint="Short description about the template — also used as the trigger condition."
          >
            <Input
              placeholder="e.g. Every Monday, weekly payout summary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label="Tenant" required>
            <RadioGroup
              value={tenant}
              onValueChange={setTenant}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {TENANTS.map((t) => (
                <RadioRow key={t} value={t} label={t} groupValue={tenant} />
              ))}
            </RadioGroup>
          </Field>

          <Field label="Type" required>
            <RadioGroup
              value={templateType}
              onValueChange={setTemplateType}
              className="grid grid-cols-2 gap-2"
            >
              {["Promotional", "Transactional"].map((t) => (
                <RadioRow key={t} value={t} label={t} groupValue={templateType} />
              ))}
            </RadioGroup>
          </Field>

          <Field
            label="Apollo Category"
            required
            hint="This is the Apollo delivery bucket, distinct from the PartnersBiz category chosen in the next step."
          >
            <RadioGroup
              value={apolloCategory}
              onValueChange={setApolloCategory}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {APOLLO_CATEGORIES.map((c) => (
                <RadioRow key={c} value={c} label={c} groupValue={apolloCategory} />
              ))}
            </RadioGroup>
          </Field>

          <Field
            label="Rate Limit"
            required
            hint="Maximum emails per hour per recipient beyond which further sends are dropped."
          >
            <Input
              type="number"
              placeholder="e.g. 77"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
            />
          </Field>

          <Field
            label="Variables List"
            hint="JSON schema for the variables used to render the email."
          >
            <Textarea
              rows={4}
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          <StepNav
            onNext={() => setStep(2)}
            nextDisabled={!step1Valid}
            nextLabel="Continue to categorization"
          />
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard title="Comms Categorization">
          <Field label="Does the vendor lose money or time if this is ignored?">
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
          </Field>

          {losesMoney === "no" && (
            <Field label="What type of communication is this?">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COMM_TYPES.map((t) => (
                  <Button
                    key={t.key}
                    type="button"
                    variant={commType === t.key ? "default" : "outline"}
                    onClick={() => setCommType(t.key)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </Field>
          )}

          {resolvedCategory === "action_required" && config && (
            <div className="flex items-start gap-3 rounded-xl border border-cat-red/40 bg-cat-red-soft/40 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-cat-red" />
              <div>
                <p className="text-sm font-semibold text-cat-red">
                  Category = Action Required
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  High-impact comm — priority automatically set to P1.
                </p>
              </div>
            </div>
          )}

          {config && (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Inherited from category, not editable here.
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      colorClasses[config.color].badge,
                    )}
                  >
                    {config.label}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-foreground">
                    Priority {config.priority}
                  </span>
                  {subType && (
                    <span className="rounded-full border border-dashed border-border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Sub Type · {subType}
                    </span>
                  )}
                </div>
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
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Set for this specific template
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Optional overrides for this template only.
                </p>
              </div>

              <Field label="Attachment">
                <Select
                  value={attachment}
                  onValueChange={(v) => setAttachment(v as AttachmentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["None", "PDF", "Image", "Excel Export"] as AttachmentType[]).map(
                      (a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Call to Action">
                <Select value={cta} onValueChange={(v) => setCta(v as CtaType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "None",
                        "Direct Link",
                        "Autofilled Help & Support Ticket",
                      ] as CtaType[]
                    ).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {cta === "Direct Link" && (
                <Field label="Link destination">
                  <Input
                    placeholder="https://…"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                  />
                </Field>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Delivery to WhatsApp is handled automatically for Low Tech vendor
                  segments based on Vendor Delivery Profiles, not set per template.
                </p>
              </div>
            </div>
          )}

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextDisabled={!step2Valid}
            nextLabel="Continue to content"
          />
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard title="Content">
          <div className="grid min-h-[240px] place-items-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <div>
              <p className="text-sm font-medium text-foreground">
                Stripo-style content editor
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Placeholder — drop content blocks (Image, Text, Button, HTML…) here.
              </p>
            </div>
          </div>
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextLabel="Continue to save"
          />
        </SectionCard>
      )}

      {step === 4 && (
        <SectionCard title="Save Template">
          <p className="text-sm text-muted-foreground">
            You&apos;re about to save this template to Apollo. You can still edit content
            or resend for review afterwards.
          </p>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <span className="text-foreground">Name:</span> {name || "—"}
              </span>
              <span>
                <span className="text-foreground">Tenant:</span> {tenant}
              </span>
              <span>
                <span className="text-foreground">Category:</span>{" "}
                {config?.label ?? "—"}
              </span>
              <span>
                <span className="text-foreground">Priority:</span>{" "}
                {config?.priority ?? "—"}
              </span>
            </div>
          </div>
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => setConfirmOpen(true)}
            nextLabel="Save Template"
            nextIcon={<Save className="h-4 w-4" />}
          />

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Alert!</DialogTitle>
                <DialogDescription>Are you sure you want to continue?</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setConfirmOpen(false);
                    toast.success("Template saved");
                    setStep(5);
                  }}
                >
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SectionCard>
      )}

      {step === 5 && (
        <SectionCard title="Next actions">
          <p className="text-sm text-muted-foreground">
            Template saved. Choose what to do next.
          </p>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Attached to this submission
            </p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Chip>Category · {config?.label ?? "—"}</Chip>
              {subType && <Chip>Sub Type · {subType}</Chip>}
              <Chip>Priority · {config?.priority ?? "—"}</Chip>
              <Chip>Attachment · {attachment}</Chip>
              <Chip>
                CTA · {cta}
                {cta === "Direct Link" && ctaLink ? ` (${ctaLink})` : ""}
              </Chip>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={submitReview} className="gap-1.5">
              <Send className="h-4 w-4" /> Request Review
            </Button>
            <Button variant="outline" onClick={saveDraft} className="gap-1.5">
              <Save className="h-4 w-4" /> Save as Draft only
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={notifySlack}
            className="w-full justify-center gap-1.5 text-muted-foreground"
          >
            <MessageSquare className="h-4 w-4" /> Optional — Notify on Slack
          </Button>
        </SectionCard>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Prototype, sample data only, this template is not persisted after refresh.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function Stepper({ step }: { step: number }) {
  const steps = ["Create", "Categorize", "Content", "Save", "Submit"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : n}
            </span>
            <span
              className={cn(
                "font-medium",
                active
                  ? "text-foreground"
                  : done
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {n < steps.length && <span className="text-muted-foreground/50">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-0.5 text-cat-red">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RadioRow({
  value,
  label,
  groupValue,
}: {
  value: string;
  label: string;
  groupValue: string;
}) {
  const active = value === groupValue;
  return (
    <Label
      htmlFor={`r-${value}`}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal transition-colors",
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      <RadioGroupItem id={`r-${value}`} value={value} />
      <span>{label}</span>
    </Label>
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
  nextIcon,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  nextIcon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={nextDisabled} className="gap-1.5">
        {nextLabel} {nextIcon ?? <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Approver queue                                                             */
/* -------------------------------------------------------------------------- */

interface PendingTemplate {
  id: string;
  name: string;
  submittedBy: string;
  submittedAgo: string;
  tenant: string;
  apolloCategory: string;
  category: CategoryId;
  subType?: string;
  attachment: AttachmentType;
  ctaType: CtaType;
  ctaLink?: string;
  segment: string;
  hasLowTechVendors: boolean;
}

const PENDING: PendingTemplate[] = [
  {
    id: "t1",
    name: "Weekly payout summary",
    submittedBy: "Priya S.",
    submittedAgo: "12m ago",
    tenant: "Blinkit",
    apolloCategory: "Important Updates",
    category: "finance_payments",
    subType: "Scheduled Push",
    attachment: "PDF",
    ctaType: "Direct Link",
    ctaLink: "https://partners.blinkit.com/payouts",
    segment: "All vendors",
    hasLowTechVendors: true,
  },
  {
    id: "t2",
    name: "PO acceptance reminder",
    submittedBy: "Rohit K.",
    submittedAgo: "1h ago",
    tenant: "Blinkit",
    apolloCategory: "Orders and Purchases",
    category: "reminders",
    attachment: "None",
    ctaType: "Autofilled Help & Support Ticket",
    segment: "Grocery – Tier 1",
    hasLowTechVendors: false,
  },
  {
    id: "t3",
    name: "Password rotation notice",
    submittedBy: "Aditi M.",
    submittedAgo: "3h ago",
    tenant: "Hyperpure",
    apolloCategory: "Internal",
    category: "account_access",
    attachment: "None",
    ctaType: "None",
    segment: "New vendors (< 90 days)",
    hasLowTechVendors: true,
  },
];

const CLUBBABLE_APOLLO = new Set(["Important Updates", "Orders and Purchases"]);

function ApproverQueue() {
  const [items, setItems] = useState<PendingTemplate[]>(PENDING);
  const [selectedId, setSelectedId] = useState<string | null>(PENDING[0]?.id ?? null);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const clubbable = useMemo(() => {
    if (!selected) return [];
    if (!CLUBBABLE_APOLLO.has(selected.apolloCategory)) return [];
    return items.filter(
      (i) =>
        i.id !== selected.id &&
        i.tenant === selected.tenant &&
        i.apolloCategory === selected.apolloCategory,
    );
  }, [items, selected]);

  const act = (id: string, verdict: "approved" | "rejected") => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId((prev) => {
      if (prev !== id) return prev;
      const remaining = items.filter((i) => i.id !== id);
      return remaining[0]?.id ?? null;
    });
    toast.success(`${item?.name ?? "Template"} ${verdict}`);
  };

  if (!selected) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No templates waiting for review.
      </div>
    );
  }

  const config = CONFIG[selected.category];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,240px)_1fr]">
      {/* Queue list */}
      <aside className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pending ({items.length})
        </p>
        <ul className="space-y-1.5">
          {items.map((i) => {
            const active = i.id === selectedId;
            const cfg = CONFIG[i.category];
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(i.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {i.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        colorClasses[cfg.color].badge,
                      )}
                    >
                      {cfg.label.split(" ")[0]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {i.submittedBy} · {i.submittedAgo}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Detail panel */}
      <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {selected.name}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Submitted by {selected.submittedBy} · {selected.submittedAgo}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                colorClasses[config.color].badge,
              )}
            >
              {config.label}
            </span>
            <Chip>Priority {config.priority}</Chip>
            {selected.subType && (
              <span className="rounded-full border border-dashed border-border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Sub Type · {selected.subType}
              </span>
            )}
          </div>
        </div>

        {/* Meta grid */}
        <dl className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
          <MetaRow label="Tenant" value={selected.tenant} />
          <MetaRow label="Apollo Category" value={selected.apolloCategory} />
          <MetaRow
            label="Attachment"
            value={selected.attachment}
            icon={selected.attachment !== "None" ? <Paperclip className="h-3 w-3" /> : undefined}
          />
          <MetaRow
            label="CTA Type"
            value={
              selected.ctaType === "Direct Link" && selected.ctaLink
                ? `${selected.ctaType} · ${selected.ctaLink}`
                : selected.ctaType
            }
            icon={selected.ctaType !== "None" ? <Link2 className="h-3 w-3" /> : undefined}
          />
          <MetaRow label="Target segment" value={selected.segment} />
        </dl>

        {selected.hasLowTechVendors && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Also delivers via WhatsApp to Low Tech vendors in this segment.
            </p>
          </div>
        )}

        {clubbable.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 dark:bg-amber-500/10">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Clubbing candidate — {clubbable.length} other pending{" "}
                {clubbable.length === 1 ? "template" : "templates"} in{" "}
                {selected.apolloCategory}.
              </p>
              <ul className="mt-1 space-y-0.5 text-amber-800/80 dark:text-amber-200/80">
                {clubbable.map((c) => (
                  <li key={c.id}>· {c.name}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Inherited config recap */}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-medium text-muted-foreground">
            Inherited from category
          </div>
          <dl className="divide-y divide-border">
            <ConfigRow label="Channel" value={config.channel} />
            <ConfigRow label="Batching" value={config.batching} />
            <ConfigRow label="Escalation" value={config.escalation} />
            <ConfigRow label="Portal Expiry" value={config.expiry} />
          </dl>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => act(selected.id, "rejected")}
            className="gap-1.5"
          >
            <XCircle className="h-4 w-4" /> Reject
          </Button>
          <Button onClick={() => act(selected.id, "approved")} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Approve
          </Button>
        </div>
      </section>
    </div>
  );
}

function MetaRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
        {icon}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

