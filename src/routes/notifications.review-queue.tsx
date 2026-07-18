import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  Inbox,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
  Paperclip,
  Link2,
  Layers,
  Smartphone,
  Copy,
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
type WhatsAppCtaKind = "None" | "Link" | "Phone";

const SEGMENTS = [
  "All vendors",
  "Grocery – Tier 1",
  "Fashion vendors",
  "New vendors < 90 days",
] as const;
type Segment = (typeof SEGMENTS)[number];

const SEGMENT_HAS_LOW_TECH: Record<Segment, boolean> = {
  "All vendors": true,
  "Grocery – Tier 1": false,
  "Fashion vendors": false,
  "New vendors < 90 days": true,
};

/* -------------------------------------------------------------------------- */
/* Template Submitter flow — Apollo simulation only                           */
/* -------------------------------------------------------------------------- */

function generateTemplateId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `APOLLO-${rand}`;
}

function TemplateSubmitterFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tenant, setTenant] = useState("Blinkit");
  const [templateType, setTemplateType] = useState("Transactional");
  const [apolloCategory, setApolloCategory] = useState("Important Updates");
  const [rateLimit, setRateLimit] = useState("");
  const [variables, setVariables] = useState("{}");

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [idDialogOpen, setIdDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const step1Valid = name.trim().length > 0 && description.trim().length > 0;

  const reset = () => {
    setStep(1);
    setName("");
    setDescription("");
    setTenant("Blinkit");
    setTemplateType("Transactional");
    setApolloCategory("Important Updates");
    setRateLimit("");
    setVariables("{}");
    setTemplateId(null);
  };

  const createTemplate = () => {
    setTemplateId(generateTemplateId());
    setIdDialogOpen(true);
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

          <Field label="Apollo Category" required>
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

          <div className="flex justify-end pt-2">
            <Button
              onClick={createTemplate}
              disabled={!step1Valid}
              className="gap-1.5"
            >
              Create Template <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={idDialogOpen} onOpenChange={setIdDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Template created</DialogTitle>
                <DialogDescription>
                  Your template has been created. Copy the Template ID and open the
                  content editor to add the body.
                </DialogDescription>
              </DialogHeader>
              <IdCopyRow id={templateId ?? ""} />
              <DialogFooter>
                <Button
                  onClick={() => {
                    setIdDialogOpen(false);
                    setStep(2);
                  }}
                  className="gap-1.5"
                >
                  Open content editor <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SectionCard>
      )}

      {step === 2 && (
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

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setConfirmOpen(true)} className="gap-1.5">
              <Save className="h-4 w-4" /> Save Template
            </Button>
          </div>

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
                    setStep(3);
                  }}
                >
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard title="Template saved">
          <div className="flex items-start gap-3 rounded-xl border border-cat-green/40 bg-cat-green-soft/40 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cat-green" />
            <div className="min-w-0 space-y-3">
              <p className="text-sm text-foreground">
                Template saved. Copy this ID to raise an approval request on Workdesk.
              </p>
              <IdCopyRow id={templateId ?? ""} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={reset}>
              Create another template
            </Button>
          </div>
        </SectionCard>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Prototype, sample data only, this template is not persisted after refresh.
      </p>
    </div>
  );
}

function IdCopyRow({ id }: { id: string }) {
  const copy = () => {
    if (!id) return;
    void navigator.clipboard?.writeText(id);
    toast.success("Template ID copied");
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Template ID
      </span>
      <span className="flex-1 truncate font-mono text-sm font-semibold text-foreground">
        {id || "—"}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={copy}
        className="h-7 gap-1.5 px-2 text-xs"
        aria-label="Copy Template ID"
      >
        <Copy className="h-3.5 w-3.5" /> Copy
      </Button>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function Stepper({ step }: { step: number }) {
  const steps = ["Create", "Content", "Saved"];
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
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
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
  whatsappBody?: string;
  whatsappCtaKind?: WhatsAppCtaKind;
  whatsappCtaValue?: string;
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
    whatsappBody:
      "Hi {{vendor_name}}, your weekly payout summary for {{week}} is ready. View the full breakdown on the partner portal.",
    whatsappCtaKind: "Link",
    whatsappCtaValue: "https://partners.blinkit.com/payouts",
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
    segment: "New vendors < 90 days",
    hasLowTechVendors: true,
    whatsappBody:
      "Reminder: please rotate your PartnersBiz password within 7 days to keep access active. Call support if you need help.",
    whatsappCtaKind: "Phone",
    whatsappCtaValue: "+91 80 4567 1200",
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
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" />
              WhatsApp preview
            </div>
            <div className="flex justify-end">
              <WhatsAppBubble
                body={selected.whatsappBody ?? ""}
                ctaKind={selected.whatsappCtaKind ?? "None"}
                ctaValue={selected.whatsappCtaValue ?? ""}
              />
            </div>
            <p className="text-right text-[11px] text-muted-foreground">
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

/* -------------------------------------------------------------------------- */
/* WhatsApp bubble (styled as an actual WhatsApp message, not app card style) */
/* -------------------------------------------------------------------------- */

interface WhatsAppBubbleProps {
  body: string;
  ctaKind: WhatsAppCtaKind;
  ctaValue: string;
  editable?: boolean;
  onBodyChange?: (v: string) => void;
  onCtaKindChange?: (v: WhatsAppCtaKind) => void;
  onCtaValueChange?: (v: string) => void;
}

function WhatsAppBubble({
  body,
  ctaKind,
  ctaValue,
  editable = false,
  onBodyChange,
  onCtaKindChange,
  onCtaValueChange,
}: WhatsAppBubbleProps) {
  const count = body.length;
  const ctaLabel =
    ctaKind === "Link" ? "Visit website" : ctaKind === "Phone" ? "Call business" : null;

  return (
    <div
      className="w-full max-w-sm rounded-2xl rounded-br-sm bg-[#DCF8C6] p-3 text-[#111B21] shadow-sm"
      style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >
      {editable ? (
        <>
          <textarea
            value={body}
            maxLength={300}
            onChange={(e) => onBodyChange?.(e.target.value)}
            placeholder="Type the WhatsApp message vendors will receive…"
            rows={4}
            className="w-full resize-none border-0 bg-transparent p-0 text-sm leading-snug text-[#111B21] placeholder:text-[#54656F]/60 focus:outline-none focus:ring-0"
          />
          <div className="mt-1 text-right text-[10px] text-[#54656F]">
            {count}/300
          </div>
        </>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-snug text-[#111B21]">
          {body || <span className="italic text-[#54656F]">No message body</span>}
        </p>
      )}

      {editable && (
        <div className="mt-2 space-y-1.5 border-t border-[#B8E0A0] pt-2">
          <div className="flex items-center gap-1.5">
            {(["None", "Link", "Phone"] as WhatsAppCtaKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onCtaKindChange?.(k)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                  ctaKind === k
                    ? "bg-[#25D366] text-white"
                    : "bg-white/70 text-[#54656F] hover:bg-white",
                )}
              >
                {k === "None" ? "No action" : k === "Link" ? "Visit link" : "Call number"}
              </button>
            ))}
          </div>
          {ctaKind !== "None" && (
            <input
              value={ctaValue}
              onChange={(e) => onCtaValueChange?.(e.target.value)}
              placeholder={ctaKind === "Link" ? "https://…" : "+91 …"}
              className="w-full border-0 bg-transparent p-0 text-xs text-[#111B21] placeholder:text-[#54656F]/60 focus:outline-none focus:ring-0"
            />
          )}
        </div>
      )}

      {ctaLabel && (
        <div className="mt-2 border-t border-[#B8E0A0] pt-2 text-center">
          <div className="text-sm font-medium text-[#027EB5]">{ctaLabel}</div>
          {!editable && ctaValue && (
            <div className="mt-0.5 text-[11px] text-[#54656F]">{ctaValue}</div>
          )}
        </div>
      )}
    </div>
  );
}


