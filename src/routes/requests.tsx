import { Fragment, useMemo, useState, useRef, type KeyboardEvent } from "react";
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
  AlertTriangle,
  ShieldCheck,
  Database,
  Cloud,
  FileUp,
  Ban,
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
  CATEGORY_PRIORITY,
  usePublishLogs,
  acknowledgeLog,
  flagLog,
  isValidEmail,
  inferCategoryRules,
  type InferredRules,
  type SubCategoryPurpose,
  type DomainType,
  type AttachmentConfig,
  type PreflightChecks,
  type PublishLog,
  type TemplateRequest,
  type FrequencyOption,
  type AttachmentOption,
  type CtaOption,
  type CommTypeOption,
  type RejectionCategory,
} from "@/lib/requests-store";

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
  "Manufacture",
  "Vendor",
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
  "Wrong Config",
  "Clubbing Conflict",
  "Compliance Concern",
  "Missing Info",
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
      {!showForm && <PublishedFeed />}
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
            const isRejected =
              r.status === "Rejected" || r.status === "Rejected Post Publish";
            const canExpand = isRejected;
            const postPublish = r.status === "Rejected Post Publish";
            return (
              <Fragment key={r.id}>
                <TableRow
                  className={cn(canExpand && "cursor-pointer")}
                  onClick={() =>
                    canExpand && setExpanded(isExpanded ? null : r.id)
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{r.templateName}</span>
                      {postPublish && (
                        <span className="inline-flex items-center rounded-full bg-cat-red-soft px-1.5 py-0.5 text-[10px] font-semibold text-cat-red">
                          Flagged after scheduling
                        </span>
                      )}
                    </div>
                  </TableCell>
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
                  <TableRow>
                    <TableCell colSpan={4} className="bg-muted/30">
                      <div className="space-y-2 p-2">
                        {postPublish && (
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-cat-red">
                            Flagged after scheduling
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Reason Category:
                          </span>
                          <Badge variant="outline">{r.rejectionCategory}</Badge>
                        </div>
                        <p className="text-sm">{r.rejectionReason}</p>
                        <p className="text-xs text-muted-foreground">
                          {postPublish ? "Flagged" : "Rejected"} at {r.rejectedAt}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
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
  const AUTH_SUBMITTER_NAME = "Himanshu Gupta";
  const AUTH_SUBMITTER_EMAIL = "gupta.himanshu@grofers.com";
  const [team, setTeam] = useState<string[]>([]);
  const [slackPoc, setSlackPoc] = useState("");
  const [purpose, setPurpose] = useState("");
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [vendorListName, setVendorListName] = useState("");
  const [mfrListName, setMfrListName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(
    "Hi {{vendor_name}}, your PO {{po_number}} of {{amount_due}} is due on {{due_date}}.",
  );
  const [formulaFlags, setFormulaFlags] = useState<string[]>([]);
  const [subCategory, setSubCategory] = useState<SubCategoryPurpose | "">("");
  const [domain, setDomain] = useState<DomainType | "">("");
  const [attachmentConfig, setAttachmentConfig] = useState<AttachmentConfig>({
    type: "none",
  });
  const [chartQuery, setChartQuery] = useState("");
  const [cta, setCta] = useState<CtaOption>("None");
  const [ctaDest, setCtaDest] = useState("");
  const [frequency, setFrequency] = useState<FrequencyOption[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [analyst, setAnalyst] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waFreq, setWaFreq] = useState<FrequencyOption[]>([]);
  const [waCta, setWaCta] = useState("");
  const [waMetaId, setWaMetaId] = useState("");
  const [audienceCount, setAudienceCount] = useState(450);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [customVarInput, setCustomVarInput] = useState("");
  const [customVariables, setCustomVariables] = useState<string[]>([]);

  const sanitizeVarName = (raw: string) =>
    raw.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

  const insertAtCursor = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      const pos = start + token.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const addCustomVariable = () => {
    const clean = sanitizeVarName(customVarInput);
    if (!clean) return;
    insertAtCursor(`{{${clean}}}`);
    setCustomVariables((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setCustomVarInput("");
  };

  const inferred: InferredRules | null = useMemo(() => {
    if (!subCategory || !domain) return null;
    return inferCategoryRules(subCategory, domain);
  }, [subCategory, domain]);

  const showWhatsApp = sentTo.includes("Vendor");

  const preflight: PreflightChecks = {
    audienceCount,
    requiresApproval: audienceCount > 1000,
    isAtFrequencyCap: frequency.length >= 3,
    waValidated: showWhatsApp ? waMessage.trim().length > 0 : true,
  };

  const attachmentOption: AttachmentOption = useMemo(() => {
    if (attachmentConfig.type === "none") return "None";
    const name = (
      attachmentConfig.fileName ||
      attachmentConfig.queryKey ||
      attachmentConfig.s3Path ||
      ""
    ).toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv"))
      return "Excel Export";
    if (name.endsWith(".pdf")) return "PDF";
    return "PDF";
  }, [attachmentConfig]);

  const submit = () => {
    if (!templateId || !templateName || !subject || !purpose) {
      toast.error("Please fill required fields");
      return;
    }
    if (!inferred || !subCategory || !domain) {
      toast.error("Please select Sub-Category and Domain");
      return;
    }
    const req: TemplateRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      requestType: "Template Approval",
      templateId,
      templateName,
      primaryEmail: AUTH_SUBMITTER_EMAIL,
      team,
      slackPoc,
      purpose,
      sentTo,
      emailAttachmentsName: attachmentConfig.fileName || "-",
      vendorListName: vendorListName || "-",
      manufacturerListName: mfrListName || "-",
      subject,
      body,
      inlineSqlChart: chartQuery || undefined,
      formulaFlags,
      subCategory,
      domain,
      categoryId: inferred.categoryId,
      priority: inferred.priority,
      attachment: attachmentOption,
      attachmentConfig,
      cta,
      ctaDestination: cta === "Direct Link" ? ctaDest : undefined,
      frequency,
      ccEmails,
      analystPoc: analyst || undefined,
      whatsapp: showWhatsApp
        ? { message: waMessage, frequency: waFreq, cta: waCta }
        : undefined,
      preflightChecks: preflight,
      status: "Pending",
      submittedBy: AUTH_SUBMITTER_NAME,
      submittedAt: new Date().toISOString(),
    };
    addRequest(req);
    const ccPart =
      ccEmails.length > 0 ? ` and CC'd ${ccEmails.length} reviewer${ccEmails.length === 1 ? "" : "s"}` : " (no CCs)";
    toast.success(
      `Request ${req.id} submitted — Approval notification routed to ${AUTH_SUBMITTER_EMAIL}${ccPart}.`,
    );
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
        <FormRow label="Submitted By">
          <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                {AUTH_SUBMITTER_NAME}
              </span>
              <span className="text-muted-foreground">
                ({AUTH_SUBMITTER_EMAIL})
              </span>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Authenticated
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Auto-detected from your Blinkit SSO session. Approval notifications route here.
          </p>
        </FormRow>
        <FormRow label="Send Approval Request Copy To (CC Emails)">
          <EmailPillInput
            values={ccEmails}
            onChange={setCcEmails}
            allowedDomains={["grofers.com", "zomato.com"]}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Approval notifications, status updates, and sign-off requests will be routed to these internal reviewers.
          </p>
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
        <FormRow label="Estimated audience size">
          <Input
            type="number"
            value={audienceCount}
            onChange={(e) =>
              setAudienceCount(Math.max(0, Number(e.target.value) || 0))
            }
          />
        </FormRow>
        <FormRow label="Vendor ID list">
          <FileField value={vendorListName} onChange={setVendorListName} />
        </FormRow>
        <FormRow label="Manufacturer ID list">
          <FileField value={mfrListName} onChange={setMfrListName} />
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

      {/* Comms Categorization - Inference engine */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">Comms Categorization</h3>
          <p className="text-xs text-muted-foreground">
            Pick a purpose and domain — category, priority, channels, and
            expiry are inferred automatically.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Sub-Category Purpose" required>
            <Select
              value={subCategory}
              onValueChange={(v) => setSubCategory(v as SubCategoryPurpose)}
            >
              <SelectTrigger className="h-9">
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
          </FormRow>
          <FormRow label="Domain" required>
            <Select
              value={domain}
              onValueChange={(v) => setDomain(v as DomainType)}
            >
              <SelectTrigger className="h-9">
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
          </FormRow>
        </div>

        {inferred && <InferredRulesPanel rules={inferred} />}
      </section>

      {/* Template Editor with liquid variables + triple preview */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">Template Editor</h3>
          <p className="text-xs text-muted-foreground">
            Use Liquid variables like{" "}
            <code className="rounded bg-muted px-1">{"{{vendor_name}}"}</code>{" "}
            — detected variables highlight below.
          </p>
        </div>
        <FormRow label="Subject line" required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          <LiquidVarPills text={subject} />
        </FormRow>
        <FormRow label="Body">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-2">
              <Input
                value={customVarInput}
                onChange={(e) => setCustomVarInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomVariable();
                  }
                }}
                placeholder="Type variable name..."
                className="h-8 max-w-[240px] text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addCustomVariable}
                disabled={!sanitizeVarName(customVarInput)}
                className="h-8"
              >
                + Add Variable
              </Button>
              {customVarInput && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  → <code className="rounded bg-background px-1">{`{{${sanitizeVarName(customVarInput) || "…"}}}`}</code>
                </span>
              )}
              {customVariables.length > 0 && (
                <div className="flex w-full flex-wrap items-center gap-1 border-t border-border/60 pt-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Quick insert
                  </span>
                  {customVariables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertAtCursor(`{{${v}}}`)}
                      className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700 hover:bg-amber-500/25"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
            />
            <LiquidVarPills text={body} />
          </div>
        </FormRow>
        <FormRow label="Inline SQL Chart binding (optional)">
          <Input
            value={chartQuery}
            onChange={(e) => setChartQuery(e.target.value)}
            placeholder="rebate_trend_by_vendor.sql"
          />
          {chartQuery && <InlineSqlChartPreview label={chartQuery} />}
        </FormRow>

        <TriplePreviewPane
          subject={subject}
          body={body}
          waMessage={waMessage || body.slice(0, 300)}
          templateId={templateId || "PMT-04"}
        />
      </section>

      {/* Smart attachment + CTA + Frequency */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <FormRow label="Attachment">
          <SmartAttachment value={attachmentConfig} onChange={setAttachmentConfig} />
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
          <FormRow label="Meta WhatsApp Template ID">
            <Input
              value={waMetaId}
              onChange={(e) => setWaMetaId(e.target.value)}
              placeholder="e.g. blk_po_ack_v3"
            />
          </FormRow>
        </section>
      )}

      <GovernanceInterception
        audienceCount={audienceCount}
        priority={inferred?.priority}
        atFrequencyCap={frequency.length >= 3}
        whatsappRequired={showWhatsApp}
        waMetaId={waMetaId}
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          className={
            audienceCount > 1000
              ? "bg-cat-amber text-white hover:bg-cat-amber/90"
              : undefined
          }
        >
          {audienceCount > 1000 ? "Request Admin Approval" : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}

// ---------- Email pill input ----------
function EmailPillInput({
  values,
  onChange,
  allowedDomains,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  allowedDomains?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [errorIdx, setErrorIdx] = useState<number | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const domainOk = (email: string) => {
    if (!allowedDomains || allowedDomains.length === 0) return true;
    const at = email.lastIndexOf("@");
    if (at < 0) return false;
    const d = email.slice(at + 1).toLowerCase();
    return allowedDomains.some((allowed) => d === allowed.toLowerCase());
  };

  const commit = (raw: string) => {
    const parts = raw
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...values];
    const rejected: string[] = [];
    for (const p of parts) {
      if (!domainOk(p)) {
        rejected.push(p);
        continue;
      }
      if (!next.includes(p)) next.push(p);
    }
    if (rejected.length > 0 && allowedDomains) {
      setDomainError(
        `⚠️ Internal approval CCs must end in ${allowedDomains.map((d) => "@" + d).join(" or ")}.`,
      );
    } else {
      setDomainError(null);
    }
    onChange(next);
    setDraft("");
  };

  const remove = (email: string) =>
    onChange(values.filter((e) => e !== email));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      remove(values[values.length - 1]);
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0"
      >
        {values.map((v, i) => {
          const valid = isValidEmail(v);
          return (
            <span
              key={v}
              onMouseEnter={() => !valid && setErrorIdx(i)}
              onMouseLeave={() => setErrorIdx(null)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium",
                valid
                  ? "bg-primary/10 text-primary"
                  : "bg-cat-red-soft text-cat-red",
              )}
            >
              {!valid && <AlertTriangle className="h-3 w-3" />}
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="rounded-full hover:bg-black/10"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && commit(draft)}
          placeholder={
            values.length === 0
              ? "Type an email and press Enter or comma"
              : ""
          }
          className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {errorIdx !== null && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-cat-red">
          <AlertTriangle className="h-3 w-3" />
          Invalid email — hover the red pill to remove it
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">
        Add multiple with Enter or comma. Backspace removes the last tag.
      </p>
    </div>
  );
}

// ---------- Inferred Rules Panel ----------
function InferredRulesPanel({ rules }: { rules: InferredRules }) {
  const cfg = CATEGORY_CONFIG[rules.categoryId];
  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            System-Inferred Rules
          </span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          Locked — derived from purpose × domain
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge className={cn("hover:bg-inherit", colorClasses[cfg.color].badge)}>
          Category: {cfg.label}
        </Badge>
        <Badge className="bg-cat-red-soft text-cat-red hover:bg-cat-red-soft">
          Priority: {rules.priority}
        </Badge>
        {rules.channels.map((c) => (
          <Badge key={c} variant="outline">
            {c}
          </Badge>
        ))}
        <Badge variant="secondary">Batching: {rules.batching}</Badge>
        <Badge variant="secondary">Expiry: {rules.expiry}</Badge>
        <Badge
          className={cn(
            "hover:bg-inherit",
            rules.unsubscribe === "LOCKED_DISABLED"
              ? "bg-cat-red-soft text-cat-red"
              : "bg-cat-green-soft text-cat-green",
          )}
        >
          {rules.unsubscribe === "LOCKED_DISABLED"
            ? "Unsubscribe: Locked"
            : "Unsubscribe: Allowed"}
        </Badge>
      </div>
    </div>
  );
}

// ---------- Smart attachment ----------
function SmartAttachment({
  value,
  onChange,
}: {
  value: AttachmentConfig;
  onChange: (v: AttachmentConfig) => void;
}) {
  const tabs: Array<{
    key: AttachmentConfig["type"];
    label: string;
    icon: typeof Ban;
  }> = [
    { key: "none", label: "No Attachment", icon: Ban },
    { key: "static", label: "Static Upload", icon: FileUp },
    { key: "query", label: "SQL Query Output", icon: Database },
    { key: "s3", label: "S3 Path Pattern", icon: Cloud },
  ];

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onChange({ type: "static", fileName: f.name });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const on = value.type === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange({ type: t.key })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {value.type === "static" && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground hover:bg-muted/50"
        >
          <FileUp className="h-5 w-5" />
          <span className="font-medium">
            {value.fileName ?? "Drag & drop a file, or click to browse"}
          </span>
          <span className="text-[10px]">
            Auto-detects .pdf / .xlsx extension
          </span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange({ type: "static", fileName: f.name });
            }}
          />
        </label>
      )}

      {value.type === "query" && (
        <Input
          value={value.queryKey ?? ""}
          onChange={(e) =>
            onChange({ type: "query", queryKey: e.target.value })
          }
          placeholder="e.g. pending_rebates.sql — runs at send time, ships CSV/XLSX"
        />
      )}

      {value.type === "s3" && (
        <Input
          value={value.s3Path ?? ""}
          onChange={(e) => onChange({ type: "s3", s3Path: e.target.value })}
          placeholder="s3://reports/{mfr_id}_Q2.pdf"
        />
      )}
    </div>
  );
}

// ---------- Liquid variable pills ----------
function extractLiquidVars(text: string): string[] {
  const out = new Set<string>();
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1]);
  return [...out];
}

function LiquidVarPills({ text }: { text: string }) {
  const vars = extractLiquidVars(text);
  if (vars.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {vars.map((v) => (
        <span
          key={v}
          className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700"
        >
          {`{{${v}}}`}
        </span>
      ))}
    </div>
  );
}

function fillSample(text: string): string {
  const samples: Record<string, string> = {
    vendor_name: "Kwality Foods",
    amount_due: "₹42,300",
    due_date: "18 Aug 2026",
    po_number: "PO-88213",
  };
  return text.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, k: string) => {
    if (samples[k]) return samples[k];
    const key = k.toLowerCase();
    if (key.includes("grn_date") || key.includes("date")) return "27 Jul 2026";
    if (key.includes("vehicle") || key.includes("truck")) return "DL-01-EV-4412";
    if (key.includes("dock") || key.includes("bay")) return "Dock Bay 04";
    const title = k
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return `[${title}]`;
  });
}

// ---------- Inline SQL chart preview ----------
function InlineSqlChartPreview({ label }: { label: string }) {
  const bars = [42, 68, 55, 81, 34, 90, 62];
  const max = Math.max(...bars);
  return (
    <div className="mt-2 rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Live SQL preview · sample data
        </span>
      </div>
      <svg viewBox="0 0 210 80" className="w-full">
        {bars.map((b, i) => {
          const h = (b / max) * 60;
          return (
            <rect
              key={i}
              x={i * 30 + 6}
              y={70 - h}
              width={20}
              height={h}
              rx={2}
              className="fill-primary/70"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ---------- Triple preview pane ----------
function TriplePreviewPane({
  subject,
  body,
  waMessage,
  templateId,
}: {
  subject: string;
  body: string;
  waMessage: string;
  templateId: string;
}) {
  const [tab, setTab] = useState<"email" | "whatsapp" | "dashboard">("email");
  const [sample, setSample] = useState(true);
  const s = (t: string) => (sample ? fillSample(t) : t);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(["email", "whatsapp", "dashboard"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize",
                tab === k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {k === "email"
                ? "Email"
                : k === "whatsapp"
                  ? "WhatsApp"
                  : "PartnersBiz Dashboard"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={sample}
            onChange={(e) => setSample(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Toggle Sample Data
        </label>
      </div>

      {tab === "email" && (
        <div className="mx-auto max-w-lg rounded-md border border-border bg-background p-4 text-sm shadow-sm">
          <div className="border-b border-border pb-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Subject
            </div>
            <div className="font-semibold">
              {s(subject) || <span className="text-muted-foreground">(empty)</span>}
            </div>
          </div>
          <p className="whitespace-pre-wrap pt-3 text-[13px] leading-relaxed">
            {s(body) || <span className="text-muted-foreground">(empty)</span>}
          </p>
        </div>
      )}

      {tab === "whatsapp" && (
        <div className="mx-auto max-w-md rounded-2xl bg-[#ECE5DD] p-3">
          <div className="ml-auto max-w-full space-y-1 rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-3 shadow-sm">
            <div className="text-[10px] font-semibold text-[#075E54]">
              #{templateId}
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-snug text-[#111]">
              {s(waMessage) ||
                <span className="text-muted-foreground">(empty)</span>}
            </p>
          </div>
        </div>
      )}

      {tab === "dashboard" && (
        <div className="mx-auto max-w-md rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              PartnersBiz Notification
            </span>
          </div>
          <div className="text-sm font-semibold">
            {s(subject) || "(empty)"}
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
            {s(body)}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- Real-time active governance interception ----------
function GovernanceInterception({
  audienceCount,
  priority,
  atFrequencyCap,
  whatsappRequired,
  waMetaId,
}: {
  audienceCount: number;
  priority?: string;
  atFrequencyCap: boolean;
  whatsappRequired: boolean;
  waMetaId: string;
}) {
  const overAudience = audienceCount > 1000;
  const nonP1 = priority && priority !== "P1";
  const freqOverflow = !!nonP1 && atFrequencyCap;
  const waInvalid =
    whatsappRequired && (!waMetaId.trim() || !/^[a-z0-9_]{6,}$/i.test(waMetaId.trim()));

  if (!overAudience && !freqOverflow && !waInvalid) return null;

  return (
    <div className="space-y-2">
      {overAudience && (
        <div className="rounded-lg border border-cat-amber/50 bg-cat-amber-soft p-3 text-[12px] leading-relaxed text-cat-amber">
          <span className="mr-1">🚨</span>
          <span className="font-semibold uppercase tracking-wider">Governance Interception:</span>{" "}
          Target audience ({audienceCount.toLocaleString("en-IN")}) exceeds the
          1,000 recipient threshold. Direct dispatch is locked. Submission will
          route to Comms-Admin for approval.
        </div>
      )}
      {freqOverflow && (
        <div className="rounded-lg border border-yellow-400/60 bg-yellow-100/70 p-3 text-[12px] leading-relaxed text-yellow-900 dark:bg-yellow-500/10 dark:text-yellow-200">
          <span className="mr-1">⚠️</span>
          <span className="font-semibold uppercase tracking-wider">Frequency Cap Notice:</span>{" "}
          Target segment has reached max weekly frequency limit (3 non-P1
          comms/week). This broadcast will be queued for next week's window.
        </div>
      )}
      {waInvalid && (
        <div className="rounded-lg border border-cat-red/50 bg-cat-red-soft p-3 text-[12px] leading-relaxed text-cat-red">
          <span className="mr-1">🛑</span>
          <span className="font-semibold uppercase tracking-wider">WhatsApp Registry Block:</span>{" "}
          Template not registered on Meta WhatsApp API. WhatsApp channel
          disabled for this drop.
        </div>
      )}
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
    <div className="space-y-6">
      <PublishedFeed />
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
    </div>
  );
}

// -------- Template deliverability health (per-template) --------

const TEMPLATE_BOUNCERS: {
  vendor: string;
  vendorId: string;
  contact: string;
  reason: string;
}[] = [
  { vendor: "Aashirvaad Foods", vendorId: "V-8821", contact: "scm-lead@aashirvaad.co", reason: "550 Mailbox Full" },
  { vendor: "Sunfeast Retail", vendorId: "V-4410", contact: "ops@sunfeast-retail.in", reason: "550 Mailbox Not Found" },
  { vendor: "Bingo Snacks Co.", vendorId: "V-6612", contact: "finance@bingosnacks.in", reason: "Domain Firewall Block" },
  { vendor: "Mangaldeep Traders", vendorId: "V-3320", contact: "accounts@mangaldeep.in", reason: "550 Mailbox Full" },
];

function tplHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function TemplateDeliverabilityCard({ templateId }: { templateId: string }) {
  const seed = tplHash(templateId);
  // Derived, stable per template
  const deliveredPct = (95 + seed * 4.9).toFixed(1); // 95.0 – 99.9
  const bounceRate = (0.4 + seed * 3.2).toFixed(2); // 0.40 – 3.60
  const unsubRate = (0.05 + seed * 0.9).toFixed(2); // 0.05 – 0.95
  const bouncingCount = Math.max(0, Math.round(seed * 4)); // 0–4
  const bouncers = TEMPLATE_BOUNCERS.slice(0, bouncingCount);

  const [showList, setShowList] = useState(false);

  const stats = [
    { label: "Delivered %", value: `${deliveredPct}%`, tone: "ok" as const },
    {
      label: "Bounce Rate %",
      value: `${bounceRate}%`,
      tone: parseFloat(bounceRate) >= 2 ? ("warn" as const) : ("ok" as const),
    },
    {
      label: "Unsubscribe Rate %",
      value: `${unsubRate}%`,
      tone: parseFloat(unsubRate) >= 0.5 ? ("warn" as const) : ("ok" as const),
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Template deliverability
          </div>
          <div className="text-[11px] text-muted-foreground">
            Last 30 days · sample telemetry for {templateId}
          </div>
        </div>
        {bouncingCount > 0 && (
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-cat-red-soft px-2.5 py-1 text-[11px] font-semibold text-cat-red hover:brightness-95"
          >
            <AlertTriangle className="h-3 w-3" />
            {bouncingCount} vendor{bouncingCount === 1 ? "" : "s"} currently bouncing this template
            <span className="text-[10px] font-normal opacity-70">
              {showList ? "· hide" : "· view"}
            </span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-md border border-border bg-background p-3"
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div
              className={
                "mt-1 text-lg font-semibold tabular-nums " +
                (s.tone === "warn" ? "text-cat-red" : "text-foreground")
              }
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {showList && bouncingCount > 0 && (
        <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
          <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            Affected vendors
          </div>
          <ul className="divide-y divide-border">
            {bouncers.map((b) => (
              <li
                key={b.vendorId}
                className="flex items-center justify-between px-3 py-2 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {b.vendor}
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {b.vendorId}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {b.contact}
                  </span>
                </div>
                <span className="rounded-md bg-cat-red-soft px-2 py-0.5 text-[10px] font-semibold text-cat-red">
                  {b.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
          <DetailField label="Email" value={request.primaryEmail} />
          <DetailField label="Slack POC" value={request.slackPoc || "—"} />
          <DetailField label="Team" value={request.team.join(", ") || "—"} />
          <DetailField label="Mail sent to" value={request.sentTo.join(", ") || "—"} />
          <DetailField label="Subject line" value={request.subject} />
          <DetailField label="Purpose" value={request.purpose} full />
          <DetailField label="Email Attachments" value={request.emailAttachmentsName} />
          <DetailField label="Vendor ID list" value={request.vendorListName} />
          <DetailField label="Manufacturer ID list" value={request.manufacturerListName} />
          <DetailField label="Formula / Table flags" value={request.formulaFlags.join(", ") || "—"} />
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
          <DetailField label="CC email" value={request.ccEmails.join(", ") || "—"} />

          <DetailField label="Analyst POC" value={request.analystPoc || "—"} />
        </div>

        <div className="mt-5">
          <InheritedPanel categoryId={request.categoryId} priority={request.priority} />
        </div>

        <div className="mt-5">
          <TemplateDeliverabilityCard templateId={request.templateId} />
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

interface ContentQuality {
  score: number;
  reason?: string;
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

// Deterministic pseudo-random from a string seed
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) / 2 ** 31;
}

const AUTO_MATCH_POOL: Omit<ClubbingMatch, "match">[] = [
  {
    templateName: "PO Extension Approved",
    templateId: "APOLLO-100234",
    reasons: [
      "Same vendor cohort",
      "Same category",
      "Overlapping send window",
    ],
  },
  {
    templateName: "Weekly Fill Rate Digest",
    templateId: "APOLLO-100311",
    reasons: [
      "Same vendor cohort",
      "Same category: Reports & Analytics",
      "Overlapping send window",
    ],
  },
  {
    templateName: "Daily PO Reminder",
    templateId: "APOLLO-100455",
    reasons: [
      "Same send window",
      "Overlapping recipients",
      "Similar CTA",
    ],
  },
];

const REWORK_REASONS = [
  "Subject line too long",
  "CTA unclear or missing",
  "Tone mismatch",
  "Low readability",
  "Excessive punctuation",
];

export function getClubbingMatch(requestId: string): ClubbingMatch | null {
  const preloaded = PRELOADED_MATCHES[requestId];
  if (preloaded) return preloaded.match >= 40 ? preloaded : null;

  // Auto-suggest for newly submitted requests so the Approver sees a
  // suggestion the first time they open the request. Deterministic per id.
  const r = hashSeed(requestId);
  const score = Math.floor(r * 100); // 0..99
  if (score < 40) return null;
  const pick = AUTO_MATCH_POOL[Math.floor(r * 1000) % AUTO_MATCH_POOL.length];
  return { match: score, ...pick };
}

export function getContentQuality(requestId: string): ContentQuality {
  const preloaded: Record<string, ContentQuality> = {
    "REQ-1001": { score: 8.2, reason: "Subject line too long" },
    "REQ-1002": { score: 9.4 },
  };
  if (preloaded[requestId]) return preloaded[requestId];

  const r = hashSeed(`quality:${requestId}`);
  const score = Math.round((6 + r * 4) * 10) / 10; // 6.0 to 10.0
  if (score >= 9) return { score };
  return {
    score,
    reason: REWORK_REASONS[Math.floor(r * REWORK_REASONS.length)],
  };
}

function ClubbingMatchPanel({ requestId }: { requestId: string }) {
  const match = getClubbingMatch(requestId);
  if (!match) return null;

  const strong = match.match >= 80;
  const label = strong
    ? "Good chance of clubbing"
    : "Medium chance of clubbing";

  const quality = getContentQuality(requestId);
  const rework = quality.score < 9;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm",
        strong
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border bg-card",
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        <Layers
          className={cn(
            "h-4 w-4",
            strong ? "text-amber-600" : "text-muted-foreground",
          )}
        />
        <h3 className="text-base font-semibold text-foreground">
          Clubbing Match
        </h3>
      </header>

      <p
        className={cn(
          "mb-3 text-sm font-semibold",
          strong ? "text-amber-700" : "text-muted-foreground",
        )}
      >
        {label}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-foreground">
          Content Quality Score:{" "}
          <span className="font-semibold tabular-nums">
            {quality.score.toFixed(1)}/10
          </span>
        </span>
        {rework ? (
          <Badge className="bg-cat-red-soft text-cat-red hover:bg-cat-red-soft">
            Needs Rework
          </Badge>
        ) : (
          <Badge className="bg-cat-green-soft text-cat-green hover:bg-cat-green-soft">
            Publish ready
          </Badge>
        )}
        {rework && quality.reason && (
          <span className="text-xs text-muted-foreground">
            — {quality.reason}
          </span>
        )}
      </div>

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
        Suggestion based on sample data, not a live comparison.
      </p>
    </div>
  );
}




// ---------- Published feed (post-publish confirmation loop) ----------

function PublishedFeed() {
  const logs = usePublishLogs();
  const requests = useRequests();
  const [flagId, setFlagId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const flagTarget = logs.find((l) => l.id === flagId) ?? null;
  const detailTarget = logs.find((l) => l.id === detailId) ?? null;
  const detailRequest = detailTarget
    ? requests.find((r) => r.id === detailTarget.requestId) ?? null
    : null;
  const pendingCount = logs.filter((l) => l.status === "Pending Review").length;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Published Templates</h2>
          <p className="text-xs text-muted-foreground">
            Post-publish activity from Submitters. Click any entry to view full
            details, then acknowledge or flag after review.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-cat-amber-soft px-2 py-0.5 text-[11px] font-semibold text-cat-amber">
            {pendingCount} pending review
          </span>
        )}
      </div>

      <ul className="divide-y divide-border">
        {logs.map((l) => (
          <li key={l.id} className="py-3">
            <button
              type="button"
              onClick={() => setDetailId(l.id)}
              className="flex w-full flex-wrap items-start justify-between gap-3 rounded-md text-left transition-colors hover:bg-muted/40 -mx-2 px-2 py-1"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{l.submitterName}</span>{" "}
                  published{" "}
                  <span className="font-semibold">{l.templateName}</span> to{" "}
                  <span className="font-medium">{l.segment}</span>, scheduled for{" "}
                  <span className="font-medium">{l.scheduledFor}</span>.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {l.templateId} · published {timeWaiting(l.publishedAt)} ago · click to view details
                </p>
                {l.status === "Flagged" && (
                  <div className="mt-2 rounded-lg border border-cat-red/30 bg-cat-red-soft/40 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-wider text-cat-red text-[10px]">
                        Flagged
                      </span>
                      <Badge variant="outline">{l.flagCategory}</Badge>
                    </div>
                    <p className="mt-1 text-foreground">{l.flagReason}</p>
                    {l.flaggedAt && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Flagged at {l.flaggedAt} · request marked Rejected Post Publish
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {l.status === "Pending Review" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cat-amber-soft px-2 py-0.5 text-[11px] font-semibold text-cat-amber">
                    <Clock className="h-3 w-3" /> Pending Review
                  </span>
                ) : l.status === "Acknowledged" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cat-green-soft px-2 py-0.5 text-[11px] font-semibold text-cat-green">
                    <CheckCircle2 className="h-3 w-3" /> Acknowledged
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cat-red-soft px-2 py-0.5 text-[11px] font-semibold text-cat-red">
                    <XCircle className="h-3 w-3" /> Rejected Post Publish
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
        {logs.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No published templates yet.
          </li>
        )}
      </ul>

      <PublishedDetailDialog
        log={detailTarget}
        request={detailRequest}
        onClose={() => setDetailId(null)}
        onFlag={() => {
          if (detailTarget) {
            setFlagId(detailTarget.id);
            setDetailId(null);
          }
        }}
      />

      <FlagForReviewDialog
        log={flagTarget}
        onClose={() => setFlagId(null)}
      />
    </section>
  );
}

function PublishedDetailDialog({
  log,
  request,
  onClose,
  onFlag,
}: {
  log: PublishLog | null;
  request: TemplateRequest | null;
  onClose: () => void;
  onFlag: () => void;
}) {
  if (!log) return null;
  const cfg = request ? CATEGORY_CONFIG[request.categoryId] : null;
  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{log.templateName}</DialogTitle>
          <DialogDescription>
            {log.templateId} · published by {log.submitterName} ·{" "}
            {timeWaiting(log.publishedAt)} ago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <DetailRow label="Submitter" value={log.submitterName} />
            <DetailRow label="Scheduled for" value={log.scheduledFor} />
            <DetailRow label="Segment" value={log.segment} />
            <DetailRow label="Status" value={log.status} />
          </div>

          {request && cfg && (
            <>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Template details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow label="Category" value={cfg.label} />
                  <DetailRow label="Priority" value={request.priority} />
                  <DetailRow label="Subject" value={request.subject} />
                  <DetailRow
                    label="Frequency"
                    value={request.frequency.join(", ")}
                  />
                  <DetailRow label="Attachment" value={request.attachment} />
                  <DetailRow label="CTA" value={request.cta} />
                  <DetailRow
                    label="Submitted by"
                    value={`${request.submittedBy} (${request.primaryEmail})`}
                  />
                  <DetailRow label="Team" value={request.team.join(", ")} />
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Purpose
                  </p>
                  <p className="mt-1 text-foreground">{request.purpose}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Inherited config
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow label="Channel" value={cfg.channel} />
                  <DetailRow label="Batching" value={cfg.batching} />
                  <DetailRow label="Escalation" value={cfg.escalation} />
                  <DetailRow label="Expiry" value={cfg.expiry} />
                </div>
              </div>
            </>
          )}

          {log.status === "Flagged" && (
            <div className="rounded-lg border border-cat-red/30 bg-cat-red-soft/40 p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cat-red">
                  Flagged
                </span>
                <Badge variant="outline">{log.flagCategory}</Badge>
              </div>
              <p className="mt-1 text-foreground">{log.flagReason}</p>
              {log.flaggedAt && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Flagged at {log.flaggedAt}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {log.status === "Pending Review" ? (
            <>
              <Button
                variant="outline"
                onClick={onFlag}
                className="gap-1 border-cat-red/30 text-cat-red hover:bg-cat-red-soft"
              >
                <XCircle className="h-4 w-4" /> Flag for Review
              </Button>
              <Button
                onClick={() => {
                  acknowledgeLog(log.id);
                  toast.success("Acknowledged");
                  onClose();
                }}
                className="gap-1"
              >
                <CheckCircle2 className="h-4 w-4" /> Acknowledge
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-foreground">{value || "—"}</p>
    </div>
  );
}

function FlagForReviewDialog({
  log,
  onClose,
}: {
  log: PublishLog | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [reasonCat, setReasonCat] = useState<RejectionCategory | "">("");

  const submit = () => {
    if (!log) return;
    if (!reason.trim() || !reasonCat) {
      toast.error("Reason and category are required");
      return;
    }
    flagLog(log.id, reason.trim(), reasonCat as RejectionCategory);
    toast.success("Flagged — request marked Rejected Post Publish");
    setReason("");
    setReasonCat("");
    onClose();
  };

  return (
    <Dialog
      open={!!log}
      onOpenChange={(o) => {
        if (!o) {
          setReason("");
          setReasonCat("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag for Review</DialogTitle>
          <DialogDescription>
            {log ? (
              <>
                Flagging <span className="font-medium">{log.templateName}</span>{" "}
                will reject the linked request post-publish and notify the
                submitter.
              </>
            ) : (
              "Provide a rejection reason."
            )}
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
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Confirm Flag</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
