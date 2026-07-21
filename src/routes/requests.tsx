import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  PlusCircle,
  X,
  ArrowLeft,
  Info,
  Paperclip,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";
import { colorClasses, type CategoryId } from "@/lib/mock-data";
import {
  useRequests,
  addRequest,
  approveRequest,
  rejectRequest,
  nowStamp,
  timeWaiting,
  COMM_TYPE_TO_CATEGORY,
  CATEGORY_PRIORITY,
  type TemplateRequest,
  type FrequencyOption,
  type AttachmentOption,
  type CtaOption,
  type CommTypeOption,
  type RejectionCategory,
} from "@/lib/requests-store";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [{ title: "Requests — PartnersBiz Comms Centre" }],
  }),
  component: RequestsPage,
});

// ------- Shared config data -------
interface CategoryConfig {
  label: string;
  color: "red" | "amber" | "green" | "blue" | "purple" | "grey";
  channel: string;
  batching: string;
  escalation: string;
  expiry: string;
}

const CATEGORY_CONFIG: Record<CategoryId, CategoryConfig> = {
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

const TEAM_OPTIONS = [
  "Supply Chain",
  "Ops",
  "Finance",
  "Analytics",
  "Security",
  "Product",
  "Category",
];
const SENT_TO_OPTIONS = [
  "Tech Enabled Vendors",
  "Low Tech Vendors",
  "Manufacturers",
  "Warehouse Leads",
];
const SLACK_USERS = [
  "@arjun.k",
  "@meera.s",
  "@rahul.d",
  "@nikhil.r",
  "@kavya.m",
  "@priya.n",
];
const FORMULA_OPTIONS = ["None", "Formula Attachment", "Table in Body"];
const FREQ_OPTIONS: FrequencyOption[] = ["Once", "Daily", "Weekly", "Monthly"];
const COMM_TYPES: CommTypeOption[] = [
  "Financial",
  "Periodic",
  "High frequency",
  "Pre emptive",
  "Security",
];
const REJECTION_CATEGORIES: RejectionCategory[] = [
  "Content Issue",
  "Wrong Category or Config",
  "Clubbing Conflict",
  "Missing Info",
  "Compliance Concern",
];

// ------- Page -------
function RequestsPage() {
  const { role, internalRole } = useRole();
  if (role !== "internal_ops") return <Navigate to="/notifications" replace />;

  return (
    <AppShell>
      <div className="workdesk mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
          <p className="text-sm text-muted-foreground">Simulating: Workdesk</p>
        </header>

        {internalRole === "Template Submitter" ? (
          <SubmitterView />
        ) : (
          <ApproverView />
        )}
      </div>
    </AppShell>
  );
}

// ------- Small helpers -------
function StatusTag({ status }: { status: TemplateRequest["status"] }) {
  const map: Record<TemplateRequest["status"], { cls: string; label: string }> = {
    Pending: { cls: "bg-cat-amber-soft text-cat-amber", label: "Pending" },
    Approved: { cls: "bg-cat-green-soft text-cat-green", label: "Approved" },
    Rejected: { cls: "bg-cat-red-soft text-cat-red", label: "Rejected" },
    "Rejected Post Publish": {
      cls: "bg-cat-red-soft text-cat-red",
      label: "Rejected",
    },
  };
  const { cls, label } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function PriorityTag({ p }: { p: TemplateRequest["priority"] }) {
  const map = {
    P1: "bg-cat-red-soft text-cat-red",
    P2: "bg-cat-amber-soft text-cat-amber",
    P3: "bg-cat-blue-soft text-cat-blue",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        map[p],
      )}
    >
      {p}
    </span>
  );
}

function CategoryTag({ id }: { id: CategoryId }) {
  const cfg = CATEGORY_CONFIG[id];
  const cc = colorClasses[cfg.color];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        cc.badge,
      )}
    >
      {cfg.label}
    </span>
  );
}

function TagChips({
  values,
  onRemove,
  emptyText,
}: {
  values: string[];
  onRemove?: (v: string) => void;
  emptyText?: string;
}) {
  if (values.length === 0)
    return (
      <p className="text-xs text-muted-foreground">
        {emptyText ?? "None selected"}
      </p>
    );
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
        >
          {v}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(v)}
              className="rounded-full hover:bg-primary/20"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

function MultiSelect({
  options,
  values,
  onChange,
  max,
  placeholder,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  max: number;
  placeholder: string;
}) {
  const add = (v: string) => {
    if (values.includes(v)) return;
    if (values.length >= max) {
      toast.error(`Maximum ${max} selections allowed`);
      return;
    }
    onChange([...values, v]);
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));
  const available = options.filter((o) => !values.includes(o));
  return (
    <div className="space-y-2">
      <Select value="" onValueChange={add}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {available.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              All options selected
            </div>
          ) : (
            available.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <TagChips values={values} onRemove={remove} />
    </div>
  );
}

function WhatsAppBubble({
  message,
  onMessage,
  frequency,
  onFrequency,
  cta,
  onCta,
  readOnly,
}: {
  message: string;
  onMessage?: (v: string) => void;
  frequency: FrequencyOption[];
  onFrequency?: (v: FrequencyOption[]) => void;
  cta: string;
  onCta?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#ECE5DD] p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#075E54]">
        WhatsApp Message Preview
      </div>
      <div className="ml-auto max-w-md space-y-2 rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-3 shadow-sm">
        <div style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
          {readOnly ? (
            <p className="whitespace-pre-wrap text-[14px] leading-snug text-[#111]">
              {message || <span className="text-muted-foreground">(empty)</span>}
            </p>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) =>
                  onMessage?.(e.target.value.slice(0, 300))
                }
                placeholder="Type WhatsApp message (max 300 chars)"
                className="w-full resize-none border-0 bg-transparent text-[14px] leading-snug text-[#111] outline-none placeholder:text-[#5c7a4a]/60"
                rows={4}
              />
              <div className="text-right text-[10px] text-[#075E54]/70">
                {message.length}/300
              </div>
            </>
          )}
        </div>
        <div className="space-y-1 border-t border-[#c8e6a3] pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#075E54]">
            Frequency
          </div>
          {readOnly ? (
            <TagChips values={frequency} emptyText="—" />
          ) : (
            <FrequencyPicker values={frequency} onChange={onFrequency!} />
          )}
        </div>
        <div className="space-y-1 border-t border-[#c8e6a3] pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#075E54]">
            Link or Phone CTA
          </div>
          {readOnly ? (
            <p className="text-[13px] text-[#111]">{cta || "—"}</p>
          ) : (
            <input
              type="text"
              value={cta}
              onChange={(e) => onCta?.(e.target.value)}
              placeholder="https://... or +91..."
              className="w-full border-0 bg-transparent text-[13px] outline-none placeholder:text-[#5c7a4a]/60"
            />
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <span className="inline-flex items-center rounded-full bg-[#075E54] px-2.5 py-1 text-[10px] font-semibold text-white">
          Requires separate approval from WhatsApp Business API
        </span>
      </div>
    </div>
  );
}

function FrequencyPicker({
  values,
  onChange,
}: {
  values: FrequencyOption[];
  onChange: (v: FrequencyOption[]) => void;
}) {
  const toggle = (v: FrequencyOption) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      if (values.length >= 2) {
        toast.error("Maximum 2 selections allowed");
        return;
      }
      onChange([...values, v]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {FREQ_OPTIONS.map((f) => {
        const on = values.includes(f);
        return (
          <button
            type="button"
            key={f}
            onClick={() => toggle(f)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
              on
                ? "bg-primary text-primary-foreground"
                : "bg-white/60 text-[#075E54] hover:bg-white",
            )}
          >
            {f}
            {on && <X className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );
}

// ------- Submitter -------
function SubmitterView() {
  const [showForm, setShowForm] = useState(false);
  const requests = useRequests();
  const mine = requests; // prototype: submitter sees all as "own history"

  return (
    <div className="space-y-6">
      {!showForm && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">My Requests</h2>
            <p className="text-xs text-muted-foreground">
              Track approval status of submitted templates.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Request
          </Button>
        </div>
      )}

      {showForm ? (
        <NewRequestForm onDone={() => setShowForm(false)} />
      ) : (
        <MyRequestsTable requests={mine} />
      )}
    </div>
  );
}

function MyRequestsTable({ requests }: { requests: TemplateRequest[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template Name</TableHead>
            <TableHead>Request Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => {
            const isExpanded = expanded === r.id;
            const canExpand = r.status === "Rejected";
            return (
              <>
                <TableRow
                  key={r.id}
                  className={cn(canExpand && "cursor-pointer")}
                  onClick={() =>
                    canExpand && setExpanded(isExpanded ? null : r.id)
                  }
                >
                  <TableCell className="font-medium">{r.templateName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.requestType}
                  </TableCell>
                  <TableCell>
                    <StatusTag status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.submittedAt.includes("T")
                      ? new Date(r.submittedAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : r.submittedAt}
                  </TableCell>
                </TableRow>
                {isExpanded && canExpand && (
                  <TableRow key={r.id + "-exp"}>
                    <TableCell colSpan={4} className="bg-muted/30">
                      <div className="space-y-2 p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Reason Category:
                          </span>
                          <Badge variant="outline">{r.rejectionCategory}</Badge>
                        </div>
                        <p className="text-sm">{r.rejectionReason}</p>
                        <p className="text-xs text-muted-foreground">
                          Rejected at {r.rejectedAt}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ------- Form -------
function NewRequestForm({ onDone }: { onDone: () => void }) {
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState<string[]>([]);
  const [slackPoc, setSlackPoc] = useState("");
  const [purpose, setPurpose] = useState("");
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [attachName, setAttachName] = useState("");
  const [vendorListName, setVendorListName] = useState("");
  const [mfrListName, setMfrListName] = useState("");
  const [subject, setSubject] = useState("");
  const [formulaFlags, setFormulaFlags] = useState<string[]>([]);
  const [losesMoneyOrTime, setLoses] = useState<"Yes" | "No" | "">("");
  const [commType, setCommType] = useState<CommTypeOption | "">("");
  const [attachment, setAttachment] = useState<AttachmentOption>("None");
  const [cta, setCta] = useState<CtaOption>("None");
  const [ctaDest, setCtaDest] = useState("");
  const [frequency, setFrequency] = useState<FrequencyOption[]>([]);
  const [cc, setCc] = useState("");
  const [analyst, setAnalyst] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waFreq, setWaFreq] = useState<FrequencyOption[]>([]);
  const [waCta, setWaCta] = useState("");

  const resolved = useMemo<{ category: CategoryId; priority: "P1" | "P2" | "P3" } | null>(() => {
    if (losesMoneyOrTime === "Yes") {
      return { category: "action_required", priority: "P1" };
    }
    if (losesMoneyOrTime === "No" && commType) {
      const cat = COMM_TYPE_TO_CATEGORY[commType];
      return { category: cat, priority: CATEGORY_PRIORITY[cat] };
    }
    return null;
  }, [losesMoneyOrTime, commType]);

  const showWhatsApp = sentTo.includes("Low Tech Vendors");

  const submit = () => {
    if (!templateId || !templateName || !email || !subject || !purpose) {
      toast.error("Please fill required fields");
      return;
    }
    if (!resolved) {
      toast.error("Please complete Comms Categorization");
      return;
    }
    const req: TemplateRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      requestType: "Template Approval",
      templateId,
      templateName,
      email,
      team,
      slackPoc,
      purpose,
      sentTo,
      emailAttachmentsName: attachName || "-",
      vendorListName: vendorListName || "-",
      manufacturerListName: mfrListName || "-",
      subject,
      formulaFlags,
      losesMoneyOrTime: losesMoneyOrTime as "Yes" | "No",
      commType: commType || undefined,
      categoryId: resolved.category,
      priority: resolved.priority,
      attachment,
      cta,
      ctaDestination: cta === "Direct Link" ? ctaDest : undefined,
      frequency,
      ccEmail: cc || undefined,
      analystPoc: analyst || undefined,
      whatsapp: showWhatsApp
        ? { message: waMessage, frequency: waFreq, cta: waCta }
        : undefined,
      status: "Pending",
      submittedBy: "You",
      submittedAt: new Date().toISOString(),
    };
    addRequest(req);
    toast.success(`Request submitted, status: Pending — ${nowStamp()}`);
    onDone();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-base font-semibold">New Request</h2>
      </div>

      {/* Core fields */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <FormRow label="Request Type" required>
          <Select value="Template Approval">
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Template Approval">Template Approval</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            More request types can be added here later.
          </p>
        </FormRow>

        <FormRow label="Template ID" required>
          <Input
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="Paste the Template ID copied from Apollo"
          />
        </FormRow>
        <FormRow label="Template Name" required>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
        </FormRow>
        <FormRow label="Email" required>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="abc@zomato.com"
          />
        </FormRow>
        <FormRow label="Team (max 2)">
          <MultiSelect
            options={TEAM_OPTIONS}
            values={team}
            onChange={setTeam}
            max={2}
            placeholder="Pick your options"
          />
        </FormRow>
        <FormRow label="Slack ID of internal POC owning the process">
          <Select value={slackPoc} onValueChange={setSlackPoc}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {SLACK_USERS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Purpose of the mailer" required>
          <Textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
          />
        </FormRow>
        <FormRow label="Mail will be sent to (max 2)">
          <MultiSelect
            options={SENT_TO_OPTIONS}
            values={sentTo}
            onChange={setSentTo}
            max={2}
            placeholder="Pick vendor segment"
          />
        </FormRow>
        <FormRow label="Email Attachments">
          <FileField value={attachName} onChange={setAttachName} />
        </FormRow>
        <FormRow label="Vendor ID list">
          <FileField value={vendorListName} onChange={setVendorListName} />
        </FormRow>
        <FormRow label="Manufacturer ID list">
          <FileField value={mfrListName} onChange={setMfrListName} />
        </FormRow>
        <FormRow label="Subject line on the mail" required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </FormRow>
        <FormRow label="Does this include any formula generated attachment or table in mail body (max 2)">
          <MultiSelect
            options={FORMULA_OPTIONS}
            values={formulaFlags}
            onChange={setFormulaFlags}
            max={2}
            placeholder="Pick options"
          />
        </FormRow>
      </section>

      {/* Comms Categorization */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">Comms Categorization</h3>
          <p className="text-xs text-muted-foreground">
            Determines category, priority, and inherited configuration.
          </p>
        </div>
        <FormRow label="Is this an actionable task?" required>
          <div className="flex gap-2">
            {(["Yes", "No"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setLoses(v);
                  if (v === "Yes") setCommType("");
                }}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  losesMoneyOrTime === v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </FormRow>

        {losesMoneyOrTime === "No" && (
          <FormRow label="What type of communication is this?" required>
            <Select
              value={commType}
              onValueChange={(v) => setCommType(v as CommTypeOption)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {COMM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        )}

        {resolved && <InheritedPanel categoryId={resolved.category} priority={resolved.priority} />}
      </section>

      {/* Attachment + CTA + Frequency */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <FormRow label="Attachment">
          <Select value={attachment} onValueChange={(v) => setAttachment(v as AttachmentOption)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["None", "PDF", "Image", "Excel Export"] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Call to Action">
          <Select value={cta} onValueChange={(v) => setCta(v as CtaOption)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["None", "Direct Link", "Autofilled Help & Support Ticket"] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cta === "Direct Link" && (
            <Input
              className="mt-2"
              value={ctaDest}
              onChange={(e) => setCtaDest(e.target.value)}
              placeholder="Destination URL"
            />
          )}
        </FormRow>
        <FormRow label="Frequency of the mail to be sent (max 2)">
          <FrequencyPickerLight values={frequency} onChange={setFrequency} />
        </FormRow>
        <FormRow label="Email ID to add in CC (optional)">
          <Input value={cc} onChange={(e) => setCc(e.target.value)} />
        </FormRow>
        <FormRow label="Analyst POC (optional)">
          <Select value={analyst} onValueChange={setAnalyst}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {SLACK_USERS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
      </section>

      {showWhatsApp && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Segment includes Low Tech vendors. A WhatsApp variant is required per Vendor Delivery Profiles.
          </div>
          <WhatsAppBubble
            message={waMessage}
            onMessage={setWaMessage}
            frequency={waFreq}
            onFrequency={setWaFreq}
            cta={waCta}
            onCta={setWaCta}
          />
        </section>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit}>Submit Request</Button>
      </div>
    </div>
  );
}

function FormRow({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px]">
        {label}
        {required && <span className="ml-0.5 text-cat-red">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FileField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
      <Paperclip className="h-4 w-4" />
      <span className="truncate">{value || "Choose file"}</span>
      <input
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
      />
    </label>
  );
}

function FrequencyPickerLight({
  values,
  onChange,
}: {
  values: FrequencyOption[];
  onChange: (v: FrequencyOption[]) => void;
}) {
  const toggle = (v: FrequencyOption) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
      return;
    }
    if (values.length >= 2) {
      toast.error("Maximum 2 selections allowed");
      return;
    }
    onChange([...values, v]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {FREQ_OPTIONS.map((f) => {
        const on = values.includes(f);
        return (
          <button
            key={f}
            type="button"
            onClick={() => toggle(f)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
              on
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {f}
            {on && <X className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );
}

function InheritedPanel({
  categoryId,
  priority,
}: {
  categoryId: CategoryId;
  priority: "P1" | "P2" | "P3";
}) {
  const cfg = CATEGORY_CONFIG[categoryId];
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryTag id={categoryId} />
          <PriorityTag p={priority} />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          Inherited from category, not editable here
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <ConfigItem label="Channel" value={cfg.channel} />
        <ConfigItem label="Batching" value={cfg.batching} />
        <ConfigItem label="Escalation" value={cfg.escalation} />
        <ConfigItem label="Portal Expiry" value={cfg.expiry} />
      </div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-[13px]">{value}</div>
    </div>
  );
}

// ------- Approver -------
function ApproverView() {
  const requests = useRequests();
  const pending = requests.filter((r) => r.status === "Pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pending.find((r) => r.id === selectedId) ?? null;

  if (selected) {
    return (
      <RequestDetail
        request={selected}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Pending Approvals</h2>
        <p className="text-xs text-muted-foreground">
          {pending.length} request{pending.length === 1 ? "" : "s"} waiting for review.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Request Type</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead>Time Waiting</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(r.id)}
              >
                <TableCell className="font-medium">{r.templateName}</TableCell>
                <TableCell className="text-sm">{r.requestType}</TableCell>
                <TableCell className="text-sm">{r.submittedBy}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.team.join(", ") || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.submittedAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    <Clock className="h-3 w-3" /> {timeWaiting(r.submittedAt)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No pending requests.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RequestDetail({
  request,
  onBack,
}: {
  request: TemplateRequest;
  onBack: () => void;
}) {
  const hasClubbingMatch = getClubbingMatch(request.id) !== null;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonCat, setReasonCat] = useState<RejectionCategory | "">(
    hasClubbingMatch ? "Clubbing Conflict" : "",
  );

  const openReject = () => {
    if (hasClubbingMatch && !reasonCat) setReasonCat("Clubbing Conflict");
    setRejectOpen(true);
  };

  const approve = () => {
    approveRequest(request.id);
    toast.success(`${request.templateName} approved`);
    onBack();
  };
  const confirmReject = () => {
    if (!reason.trim() || !reasonCat) {
      toast.error("Reason and category are required");
      return;
    }
    rejectRequest(request.id, reason.trim(), reasonCat as RejectionCategory);
    toast.success(`${request.templateName} rejected`);
    setRejectOpen(false);
    onBack();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{request.templateName}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{request.requestType}</span>
              <span>·</span>
              <span>{request.templateId}</span>
              <span>·</span>
              <span>By {request.submittedBy}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CategoryTag id={request.categoryId} />
            <PriorityTag p={request.priority} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailField label="Email" value={request.email} />
          <DetailField label="Slack POC" value={request.slackPoc || "—"} />
          <DetailField label="Team" value={request.team.join(", ") || "—"} />
          <DetailField label="Mail sent to" value={request.sentTo.join(", ") || "—"} />
          <DetailField label="Subject line" value={request.subject} />
          <DetailField label="Purpose" value={request.purpose} full />
          <DetailField label="Email Attachments" value={request.emailAttachmentsName} />
          <DetailField label="Vendor ID list" value={request.vendorListName} />
          <DetailField label="Manufacturer ID list" value={request.manufacturerListName} />
          <DetailField label="Formula / Table flags" value={request.formulaFlags.join(", ") || "—"} />
          <DetailField
            label="Vendor loses money/time?"
            value={request.losesMoneyOrTime}
          />
          {request.commType && (
            <DetailField label="Comm type" value={request.commType} />
          )}
          <DetailField label="Attachment" value={request.attachment} />
          <DetailField
            label="Call to Action"
            value={
              request.cta === "Direct Link"
                ? `Direct Link → ${request.ctaDestination ?? "—"}`
                : request.cta
            }
          />
          <DetailField label="Frequency" value={request.frequency.join(", ") || "—"} />
          <DetailField label="CC email" value={request.ccEmail || "—"} />
          <DetailField label="Analyst POC" value={request.analystPoc || "—"} />
        </div>

        <div className="mt-5">
          <InheritedPanel categoryId={request.categoryId} priority={request.priority} />
        </div>

        {request.whatsapp && (
          <div className="mt-5">
            <WhatsAppBubble
              message={request.whatsapp.message}
              frequency={request.whatsapp.frequency}
              cta={request.whatsapp.cta}
              readOnly
            />
          </div>
        )}
      </div>

      <ClubbingMatchPanel requestId={request.id} />



      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={openReject}
          className="gap-2 border-cat-red/30 text-cat-red hover:bg-cat-red-soft"
        >
          <XCircle className="h-4 w-4" /> Reject
        </Button>
        <Button onClick={approve} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Approve
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>
              Provide a clear reason. The submitter will see this on their request row.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Reason for Rejection<span className="ml-0.5 text-cat-red">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Reason Category<span className="ml-0.5 text-cat-red">*</span>
              </Label>
              <Select
                value={reasonCat}
                onValueChange={(v) => setReasonCat(v as RejectionCategory)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/40 p-3", full && "sm:col-span-2")}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[13px]">{value}</div>
    </div>
  );
}

// ---------- Clubbing Match panel ----------

interface ClubbingMatch {
  match: number;
  templateName: string;
  templateId: string;
  reasons: string[];
}

// Preloaded matches keyed by request ID. Requests not listed here have no
// match and the panel stays hidden — this keeps the preview deterministic.
const PRELOADED_MATCHES: Record<string, ClubbingMatch> = {
  "REQ-1001": {
    match: 68,
    templateName: "PO Extension Approved",
    templateId: "APOLLO-100234",
    reasons: [
      "Same vendor cohort (Kolkata K4)",
      "Same category: Action Required",
      "Overlapping send window",
    ],
  },
  "REQ-1002": {
    match: 87,
    templateName: "Weekly Fill Rate Digest",
    templateId: "APOLLO-100311",
    reasons: [
      "Same vendor cohort",
      "Same category: Reports & Analytics",
      "Overlapping send window",
    ],
  },
};

export function getClubbingMatch(requestId: string): ClubbingMatch | null {
  const m = PRELOADED_MATCHES[requestId];
  return m && m.match >= 40 ? m : null;
}

function ClubbingMatchPanel({ requestId }: { requestId: string }) {
  const match = getClubbingMatch(requestId);
  if (!match) return null;

  const strong = match.match >= 80;
  const label = strong
    ? "Strong match, consider clubbing"
    : "Partial overlap, review before approving";

  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm",
        strong
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border bg-card",
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers
            className={cn(
              "h-4 w-4",
              strong ? "text-amber-600" : "text-muted-foreground",
            )}
          />
          <h3 className="text-base font-semibold text-foreground">
            Clubbing Match
          </h3>
        </div>
        <span
          className={cn(
            "text-lg font-semibold tabular-nums",
            strong ? "text-amber-600" : "text-foreground",
          )}
        >
          {match.match}%
        </span>
      </header>

      <p
        className={cn(
          "mb-3 text-sm font-medium",
          strong ? "text-amber-700" : "text-muted-foreground",
        )}
      >
        {label}
      </p>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {match.templateName}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {match.templateId}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.reasons.map((r) => (
            <span
              key={r}
              className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Match is a preview based on sample data, not a live comparison.
      </p>
    </div>
  );
}

