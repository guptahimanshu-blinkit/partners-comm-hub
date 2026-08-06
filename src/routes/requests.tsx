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
  PauseCircle,
  Search,
  ExternalLink,
  MoreVertical,
  Pencil,
  Copy,
  CornerDownRight,
  Lock,
} from "lucide-react";
import { lookupApolloTemplate } from "@/lib/mock-data";
import {
  ApolloEmailPreview,
  ApolloPreviewControls,
  type PreviewChannel,
} from "@/components/requests/ApolloEmailPreview";
import { TemplatePreviewModal } from "@/components/requests/TemplatePreviewModal";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";
import { colorClasses, type CategoryId } from "@/lib/mock-data";
import {
  useRequests,
  addRequest,
  updateRequest,
  approveRequest,
  rejectRequest,
  holdRequest,
  nowStamp,
  timeWaiting,
  CATEGORY_PRIORITY,
  usePublishLogs,
  acknowledgeLog,
  flagLog,
  isValidEmail,
  inferCategoryRules,
  REJECTION_REASON_CATEGORIES,
  normalizeAttachmentConfig,
  MOCK_ENTITIES,
  PRE_APPROVED_QUERIES,
  type AttachmentMode,
  type PdfEntityConfig,
  type DynamicTableConfig,

  type InferredRules,
  type SubCategoryPurpose,
  type DomainType,
  type AttachmentConfig,
  type AttachmentItem,

  type PreflightChecks,
  type PublishLog,
  type TemplateRequest,
  type FrequencyOption,
  type AttachmentOption,
  type CtaOption,
  type CommTypeOption,
  type RejectionCategory,
  type RejectionReasonCategory,
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
  "All Vendors on PartnersBiz",
  "All Manufacturers on PartnersBiz",
  "Targeted Vendor IDs (Upload File)",
  "Targeted Manufacturer IDs (Upload File)",
];
const PURPOSE_OPTIONS = [
  "PO Cancellation Alert",
  "Weekly Fill Rate Scorecard",
  "Payment & Tax Deduction Reconciliation",
  "Warehouse Slot & Appointment Schedule Change",
  "Product / Process Launch",
  "Other / Custom Purpose",
];
const SUB_CATEGORY_OPTIONS: Array<{ value: SubCategoryPurpose; label: string }> = [
  { value: "Reports", label: "Reports (Periodic data exports & performance scorecards)" },
  { value: "Announcements", label: "Announcements (General policy updates & platform news)" },
  { value: "Campaigns", label: "Campaigns (Multi-step promotional & onboarding comms)" },
  {
    value: "Defect Flow Communications",
    label: "Defect Flow Communications (Urgent operational alerts requiring action)",
  },
  { value: "Other", label: "Other / Custom Category" },
];
const DOMAIN_OPTIONS: DomainType[] = [
  "Operations & Appointments",
  "Finance & Payments",
  "Assortment / MDM",
  "Warehouse Ops",
  "Monetization",
  "Product / Process Launch",
];
const CTA_MODULE_ROUTES = [
  { route: "/app/appointments", label: "PO Appointments (/app/appointments)" },
  { route: "/app/invoices", label: "Invoices (/app/invoices)" },
  { route: "/app/po-summary", label: "PO Summary (/app/po-summary)" },
  { route: "/app/fees-and-charges", label: "Fees & Charges (/app/fees-and-charges)" },
  { route: "/app/report-requests", label: "Report Requests (/app/report-requests)" },
  { route: "/app/tickets", label: "Support / Tickets (/app/tickets)" },
];
const SLACK_USERS = ["@arjun.k", "@meera.s", "@rahul.d", "@nikhil.r", "@kavya.m", "@priya.n"];
const FORMULA_OPTIONS = ["None", "Formula Attachment", "Table in Body"];
const FREQ_OPTIONS: FrequencyOption[] = ["Once", "Daily Digest", "Weekly", "Monthly"];
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

        {internalRole === "Template Submitter" ? <SubmitterView /> : <ApproverView />}
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
    "On Hold": { cls: "bg-cat-amber-soft text-cat-amber", label: "On Hold" },
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
    return <p className="text-xs text-muted-foreground">{emptyText ?? "None selected"}</p>;
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
            <div className="px-3 py-2 text-xs text-muted-foreground">All options selected</div>
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
                onChange={(e) => onMessage?.(e.target.value.slice(0, 300))}
                placeholder="Type WhatsApp message (max 300 chars)"
                className="w-full resize-none border-0 bg-transparent text-[14px] leading-snug text-[#111] outline-none placeholder:text-[#5c7a4a]/60"
                rows={4}
              />
              <div className="text-right text-[10px] text-[#075E54]/70">{message.length}/300</div>
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
export type FormIntent =
  | { mode: "new" }
  | { mode: "edit"; source: TemplateRequest }
  | { mode: "clone"; source: TemplateRequest; followUp: boolean };

function SubmitterView() {
  const [intent, setIntent] = useState<FormIntent | null>(null);
  const requests = useRequests();
  const mine = requests; // prototype: submitter sees all as "own history"
  const showForm = intent !== null;

  return (
    <div className="space-y-6">
      {!showForm && <PublishedFeed />}
      {!showForm && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Request Logs &amp; History</h2>
            <p className="text-xs text-muted-foreground">
              Root templates with their nested follow-ups. Use the ⋮ menu to edit or clone.
            </p>
          </div>
          <Button onClick={() => setIntent({ mode: "new" })} className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Request
          </Button>
        </div>
      )}

      {intent ? (
        <NewRequestForm key={JSON.stringify(intent)} intent={intent} onDone={() => setIntent(null)} />
      ) : (
        <MyRequestsTable requests={mine} onIntent={setIntent} />
      )}
    </div>
  );
}

function RequestRowMenu({
  request,
  onIntent,
}: {
  request: TemplateRequest;
  onIntent: (i: FormIntent) => void;
}) {
  const [cloneOpen, setCloneOpen] = useState(false);
  const [isFollowUp, setIsFollowUp] = useState<"yes" | "no">("no");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Actions for ${request.templateName}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => onIntent({ mode: "edit", source: request })}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Request
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCloneOpen(true)}>
            <Copy className="mr-2 h-4 w-4" /> Clone Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Is this a follow-up template?</DialogTitle>
            <DialogDescription>
              Cloning “{request.templateName}”. Follow-ups stay nested under the original and are
              hard-locked to the Follow-Up category.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={isFollowUp} onValueChange={(v) => setIsFollowUp(v as "yes" | "no")}>
            <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
              <RadioGroupItem value="yes" className="mt-0.5" />
              <span>
                <span className="font-medium">Yes — follow-up</span>
                <span className="block text-xs text-muted-foreground">
                  Nested under {request.templateName}. Only audience, attachments, Template ID,
                  team, owner/analyst emails, purpose and subject are editable.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
              <RadioGroupItem value="no" className="mt-0.5" />
              <span>
                <span className="font-medium">No — independent template</span>
                <span className="block text-xs text-muted-foreground">
                  Creates a brand new root request with the cloned data.
                </span>
              </span>
            </label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloneOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCloneOpen(false);
                onIntent({ mode: "clone", source: request, followUp: isFollowUp === "yes" });
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


function MyRequestsTable({
  requests,
  onIntent,
}: {
  requests: TemplateRequest[];
  onIntent: (i: FormIntent) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const roots = requests.filter((r) => !r.parentId);
  const orphans = requests.filter((r) => r.parentId && !requests.some((p) => p.id === r.parentId));
  const rootList = [...roots, ...orphans];

  const renderRow = (r: TemplateRequest, depth: number) => {
    const isExpanded = expanded === r.id;
    const isRejected = r.status === "Rejected" || r.status === "Rejected Post Publish";
    const canExpand = isRejected;
    const postPublish = r.status === "Rejected Post Publish";
    const children = requests.filter((c) => c.parentId === r.id);

    return (
      <Fragment key={r.id}>
        <TableRow
          className={cn(canExpand && "cursor-pointer", depth > 0 && "bg-muted/20")}
          onClick={() => canExpand && setExpanded(isExpanded ? null : r.id)}
        >
          <TableCell className="font-medium">
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: depth > 0 ? depth * 20 : undefined }}
            >
              {depth > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  <CornerDownRight className="h-3 w-3" /> Follow-Up:
                </span>
              )}
              <span>{r.templateName}</span>
              {postPublish && (
                <span className="inline-flex items-center rounded-full bg-cat-red-soft px-1.5 py-0.5 text-[10px] font-semibold text-cat-red">
                  Flagged after scheduling
                </span>
              )}
            </div>
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
          <TableCell className="w-10 text-right">
            <RequestRowMenu request={r} onIntent={onIntent} />
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
        {children.map((c) => renderRow(c, depth + 1))}
      </Fragment>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted At</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>{rootList.map((r) => renderRow(r, 0))}</TableBody>
      </Table>
    </div>
  );
}


// ------- Form -------
const apolloTemplateUrl = (templateId: string) =>
  `https://apollo.internal.blinkit.com/templates/${encodeURIComponent(templateId.trim())}`;

function CheckTemplateButton({
  templateId,
  variant = "outline",
  label = "Check Template",
  subject,
  bodyHtml,
}: {
  templateId: string;
  variant?: "outline" | "default";
  label?: string;
  subject?: string;
  bodyHtml?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = templateId.trim();

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={variant}
        disabled={!id}
        className="shrink-0 gap-1.5 whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>

      <TemplatePreviewModal
        open={open}
        onOpenChange={setOpen}
        templateId={id}
        subject={subject}
        bodyHtml={bodyHtml}
        apolloUrl={apolloTemplateUrl(id)}
      />
    </>
  );
}

/** Core persona signature used to detect re-approval-worthy audience switches. */
function personaSignature(sentTo: string[]): string {
  return sentTo
    .map((s) => {
      const targeted = /targeted/i.test(s);
      const persona = /manufactur/i.test(s) ? "manufacturer" : "vendor";
      return `${targeted ? "targeted" : "all"}:${persona}`;
    })
    .sort()
    .join("|");
}

function NewRequestForm({
  intent = { mode: "new" },
  onDone,
}: {
  intent?: FormIntent;
  onDone: () => void;
}) {
  const src = intent.mode === "new" ? null : intent.source;
  const isEdit = intent.mode === "edit";
  const isFollowUpClone = intent.mode === "clone" && intent.followUp;

  const [templateId, setTemplateId] = useState(src?.templateId ?? "");
  // Apollo Service auto-fetch simulation — the whole payload is fetched by Template ID.
  const apolloTemplate = useMemo(() => lookupApolloTemplate(templateId), [templateId]);
  const sameTemplateAsSource = !!src && src.templateId.trim() === templateId.trim();
  const templateName =
    apolloTemplate?.templateName ?? (sameTemplateAsSource ? (src?.templateName ?? "") : "");
  const AUTH_SUBMITTER_NAME = "Himanshu Gupta";
  const AUTH_SUBMITTER_EMAIL = "gupta.himanshu@grofers.com";
  const [team, setTeam] = useState<string>(src?.team ?? "");
  const [customTeam, setCustomTeam] = useState(src?.customTeam ?? "");
  const [mailOwner, setMailOwner] = useState(src?.mailOwner ?? "");
  const [purpose, setPurpose] = useState(src?.purpose ?? "");
  const [sentTo, setSentTo] = useState<string[]>(src?.sentTo ?? []);
  const [vendorListName, setVendorListName] = useState(
    src?.vendorListName && src.vendorListName !== "-" ? src.vendorListName : "",
  );
  const [mfrListName, setMfrListName] = useState(
    src?.manufacturerListName && src.manufacturerListName !== "-" ? src.manufacturerListName : "",
  );
  // Subject + body are auto-fetched from Apollo and are not editable here.
  const subject = apolloTemplate?.subject ?? (sameTemplateAsSource ? (src?.subject ?? "") : "");
  const body = apolloTemplate?.bodyHtml ?? (sameTemplateAsSource ? (src?.body ?? "") : "");
  const [subCategory, setSubCategory] = useState<SubCategoryPurpose | "">(src?.subCategory ?? "");
  const [customSubCategory, setCustomSubCategory] = useState(src?.customSubCategory ?? "");
  const [customCategory, setCustomCategory] = useState(src?.customCategory ?? "");
  const [domain, setDomain] = useState<DomainType | "Other" | "">(src?.domain ?? "");
  const [customDomain, setCustomDomain] = useState(src?.customDomain ?? "");
  const [actionRequired, setActionRequired] = useState<boolean | null>(src?.actionRequired ?? null);
  const [expectedActionType, setExpectedActionType] = useState(src?.expectedActionType ?? "");
  const [followUpRequired, setFollowUpRequired] = useState<boolean | null>(
    src?.followUpRequired ?? null,
  );
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>(
    src?.attachmentMode ?? "none",
  );
  const [pdfConfig, setPdfConfig] = useState<PdfEntityConfig>(
    () => src?.pdfConfig ?? emptyPdfConfig(),
  );
  const [tableConfigs, setTableConfigs] = useState<DynamicTableConfig[]>(
    src?.tableConfigs && src.tableConfigs.length > 0
      ? src.tableConfigs
      : [
          {
            id: "tbl-initial",
            queryId: "",
            queryName: "",
            selectedColumns: [],
            conditionalRules: {},
            hasSummaryRow: false,
          },
        ],
  );

  const [attachmentConfig, setAttachmentConfig] = useState<AttachmentConfig>(
    () => normalizeAttachmentConfig(src?.attachmentConfig) ?? { type: "none", items: [] },
  );
  const [attQueryDraft, setAttQueryDraft] = useState("");
  const [attFormulaDraft, setAttFormulaDraft] = useState("");
  const [chartQuery, setChartQuery] = useState(src?.inlineSqlChart ?? "");
  const [cta, setCta] = useState<CtaOption>(src?.cta ?? "None");
  const [ctaDest, setCtaDest] = useState(src?.ctaDestination ?? "");
  const [ctaModuleRoute, setCtaModuleRoute] = useState(src?.ctaModuleRoute ?? "");
  const [ctaQueryParams, setCtaQueryParams] = useState(src?.ctaQueryParams ?? "");
  const [ticketCategory, setTicketCategory] = useState(src?.ticketCategory ?? "");
  const [ticketSubcategory, setTicketSubcategory] = useState(src?.ticketSubcategory ?? "");

  const [frequency, setFrequency] = useState<FrequencyOption>(src?.frequency ?? "Once");
  const [scheduleDeadline, setScheduleDeadline] = useState(src?.scheduleDeadline ?? "");
  const [approvalCcEmails, setApprovalCcEmails] = useState<string[]>(src?.approvalCcEmails ?? []);
  const [analyst, setAnalyst] = useState(src?.analystPoc ?? "");
  const [waMessage, setWaMessage] = useState(src?.whatsapp?.message ?? "");
  const [waFreq, setWaFreq] = useState<FrequencyOption[]>(src?.whatsapp?.frequency ?? []);
  const [waCta, setWaCta] = useState(src?.whatsapp?.cta ?? "");
  const [waMetaId, setWaMetaId] = useState("");
  const [audienceCount, setAudienceCount] = useState(src?.preflightChecks?.audienceCount ?? 450);

  // ---- 2nd approval triggers (Edit flow) ----
  const templateIdChanged = isEdit && !!src && src.templateId.trim() !== templateId.trim();
  const personaChanged = isEdit && !!src && personaSignature(src.sentTo) !== personaSignature(sentTo);
  const requiresReapproval = templateIdChanged || personaChanged;

  const formTitle =
    intent.mode === "edit"
      ? `Edit Request · ${src?.id}`
      : intent.mode === "clone"
        ? isFollowUpClone
          ? `Follow-Up Template · nested under ${src?.templateName}`
          : `Clone of ${src?.templateName}`
        : "New Request";


  const inferred: InferredRules | null = useMemo(() => {
    if (!subCategory || !domain) return null;
    const resolvedDomain: DomainType = domain === "Other" ? "Operations & Appointments" : domain;
    return inferCategoryRules(subCategory, resolvedDomain);
  }, [subCategory, domain]);

  const showWhatsApp = sentTo.includes("Vendor");

  const preflight: PreflightChecks = {
    audienceCount,
    requiresApproval: audienceCount > 1000,
    isAtFrequencyCap: frequency.length >= 3,
    waValidated: showWhatsApp ? waMessage.trim().length > 0 : true,
  };





  const submit = () => {
    // 1) Auto-commit any uncommitted attachment draft text before auditing.
    const committedItems: AttachmentItem[] = [...(attachmentConfig.items ?? [])];
    if (attQueryDraft.trim())
      committedItems.push({ id: attachmentUid(), type: "query", name: attQueryDraft.trim() });
    if (attFormulaDraft.trim())
      committedItems.push({ id: attachmentUid(), type: "formula", name: attFormulaDraft.trim() });
    const finalAttachmentConfig: AttachmentConfig = {
      ...attachmentConfig,
      items: committedItems,
      type: committedItems.length === 0 ? "none" : (committedItems[0].type as "static"),
    };
    if (committedItems.length !== (attachmentConfig.items ?? []).length) {
      setAttachmentConfig(finalAttachmentConfig);
      setAttQueryDraft("");
      setAttFormulaDraft("");
    }
    const finalAttachmentOption: AttachmentOption =
      committedItems.length === 0
        ? "None"
        : /\.(xlsx|xls|csv)$/i.test(committedItems[0].name)
          ? "Excel Export"
          : "PDF";

    // 2) CTA-specific hard gates.
    if (cta === "Autofilled Help & Support Ticket" && (!ticketCategory || !ticketSubcategory)) {
      toast.error("⚠️ Please complete required fields: Ticket Category & Subcategory");
      return;
    }
    if (cta === "Direct Link" && !ctaModuleRoute) {
      toast.error("⚠️ Please complete required fields: Target Portal Module Route");
      return;
    }

    const missing: string[] = [];
    if (!templateId) missing.push("Template ID");
    if (!mailOwner || !/@(grofers|zomato)\.com$/i.test(mailOwner))
      missing.push("Mail Owner Email (internal)");
    if (!team) missing.push("Team");
    if (team === "Other" && !customTeam.trim()) missing.push("Custom Team Name");
    if (!analyst || !/@(grofers|zomato)\.com$/i.test(analyst))
      missing.push("Analyst POC Email (internal)");
    if (!purpose.trim()) missing.push("Purpose of Mail");
    if (!subCategory) missing.push("Sub-Category Purpose");
    if (subCategory === "Other" && !customSubCategory.trim())
      missing.push("Custom Sub-Category Name");
    if (!domain) missing.push("Domain");
    if (domain === "Other" && !customDomain.trim()) missing.push("Custom Domain Name");
    if (!subject) missing.push("Subject Line");
    if (!body) missing.push("Body Text");
    if (!frequency) missing.push("Frequency");
    if (!scheduleDeadline) missing.push("Schedule Deadline");
    if (sentTo.includes("Targeted Vendor IDs (Upload File)") && !vendorListName)
      missing.push("Vendor ID list file");
    if (sentTo.includes("Targeted Manufacturer IDs (Upload File)") && !mfrListName)
      missing.push("Manufacturer ID list file");

    // Manual action declaration — no matrix inference.
    const resolvedActionRequired = actionRequired === true;
    if (actionRequired === null && subCategory && domain)
      missing.push("Operational action required (Yes/No)");
    if (resolvedActionRequired && !expectedActionType.trim())
      missing.push("Expected Action from Audience");
    if (resolvedActionRequired && followUpRequired === null)
      missing.push("Follow-up template required (Yes/No)");

    if (missing.length > 0 || !inferred) {
      toast.error(
        `⚠️ Please complete the following required fields: ${missing.join(", ") || "Sub-Category and Domain"}`,
      );
      return;
    }

    // Dynamic attachment gates.
    if (attachmentMode === "dynamic_pdf") {
      if (!pdfConfig.queryId || !isPdfQueryValid(pdfConfig.queryId)) {
        toast.error(
          "⚠️ Query Validation Failed: Selected query is missing 'entity_name' or 'mfd_id'. Cannot proceed.",
        );
        return;
      }
      if (MOCK_ENTITIES.some((e) => pdfConfig.uploadedEntities[e] !== true)) {
        toast.error("⚠️ Please upload PDFs for all mapped entities.");
        return;
      }
    }
    if (attachmentMode === "dynamic_tables") {
      for (const tc of tableConfigs) {
        if (!tc.queryId || !isTableQueryValid(tc.queryId)) {
          toast.error(
            "⚠️ Query Validation Failed: Query missing identity column (vendor_id/manufacturer_id).",
          );
          return;
        }
        if (tc.selectedColumns.length === 0 && !tc.hasSummaryRow) {
          toast.error("⚠️ Assign at least one column to every dynamic table.");
          return;
        }
      }
    }


    const req: TemplateRequest = {
      id: isEdit && src ? src.id : `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      requestType: "Template Approval",
      templateId,
      templateName,
      primaryEmail: AUTH_SUBMITTER_EMAIL,
      mailOwner,
      approvalCcEmails,
      team,
      customTeam: team === "Other" ? customTeam.trim() : undefined,
      purpose,
      sentTo,
      emailAttachmentsName:
        committedItems.length > 0 ? committedItems.map((i) => i.name).join(", ") : "No Attachment",

      vendorListName: vendorListName || "-",
      manufacturerListName: mfrListName || "-",
      subject,
      body,
      inlineSqlChart: chartQuery || undefined,
      formulaFlags: committedItems.some((i) => i.type === "formula")
        ? ["Formula Attachment"]
        : ["None"],
      subCategory: subCategory as SubCategoryPurpose,
      customSubCategory: subCategory === "Other" ? customSubCategory.trim() : undefined,
      domain: domain as DomainType | "Other",
      customDomain: domain === "Other" ? customDomain.trim() : undefined,
      customCategory: isFollowUpClone ? "Follow-Up" : customCategory.trim() || undefined,
      categoryId: inferred.categoryId,
      priority: inferred.priority,
      attachment: finalAttachmentOption,
      attachmentConfig: finalAttachmentConfig,
      cta,
      ctaDestination: cta === "Direct Link" ? ctaDest : undefined,
      ctaModuleRoute: cta === "Direct Link" ? ctaModuleRoute : undefined,
      ctaQueryParams: cta === "Direct Link" ? ctaQueryParams : undefined,
      ticketCategory: cta === "Autofilled Help & Support Ticket" ? ticketCategory : undefined,
      ticketSubcategory: cta === "Autofilled Help & Support Ticket" ? ticketSubcategory : undefined,

      frequency,
      scheduleDeadline,
      analystPoc: analyst,
      whatsapp: showWhatsApp ? { message: waMessage, frequency: waFreq, cta: waCta } : undefined,
      preflightChecks: preflight,
      actionRequired: resolvedActionRequired,
      expectedActionType: resolvedActionRequired ? expectedActionType.trim() : undefined,
      expectedAction: resolvedActionRequired ? expectedActionType.trim() : undefined,
      followUpRequired: resolvedActionRequired ? followUpRequired === true : false,
      attachmentMode,
      pdfConfig: attachmentMode === "dynamic_pdf" ? pdfConfig : undefined,
      tableConfigs: attachmentMode === "dynamic_tables" ? tableConfigs : undefined,

      parentId: isFollowUpClone && src ? src.id : isEdit ? (src?.parentId ?? null) : null,
      isFollowUp: isFollowUpClone ? true : isEdit ? (src?.isFollowUp ?? false) : false,

      status: isEdit && src && !requiresReapproval ? src.status : "Pending",
      submittedBy: AUTH_SUBMITTER_NAME,
      submittedAt: isEdit && src ? src.submittedAt : new Date().toISOString(),
    };
    if (isEdit && src) {
      updateRequest(src.id, req);
      toast.success(
        requiresReapproval
          ? `Request ${req.id} updated — sent back to Pending for a 2nd central approval.`
          : `Request ${req.id} updated — approval status retained (${req.status}).`,
      );
      onDone();
      return;
    }
    addRequest(req);
    const ccPart =
      approvalCcEmails.length > 0
        ? ` and CC'd ${approvalCcEmails.length} reviewer${approvalCcEmails.length === 1 ? "" : "s"}`
        : " (no CCs)";
    toast.success(
      isFollowUpClone && src
        ? `Follow-up ${req.id} submitted — nested under ${src.templateName}${ccPart}.`
        : `Request ${req.id} submitted — Approval notification routed to ${AUTH_SUBMITTER_EMAIL}${ccPart}.`,
    );
    onDone();
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-base font-semibold">{formTitle}</h2>
        {isFollowUpClone && (
          <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
            <CornerDownRight className="h-3 w-3" /> Category: Follow-Up (locked)
          </Badge>
        )}
      </div>

      {isEdit && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-xs",
            requiresReapproval
              ? "border-cat-amber/40 bg-cat-amber/10 text-foreground"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              ℹ️ Changing Template ID or User Persona triggers a required re-approval flow.
            </p>
            <p className="mt-0.5">
              {requiresReapproval
                ? `Detected: ${[templateIdChanged && "new Apollo Template ID", personaChanged && "core persona switch"].filter(Boolean).join(" + ")}. On save this request returns to Pending for a 2nd central approval.`
                : `Edits to targeted list files or minor text within the same persona retain the current status (${src?.status}).`}
            </p>
          </div>
        </div>
      )}

      {isFollowUpClone && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Follow-up clone — restricted editing</p>
            <p className="mt-0.5 text-muted-foreground">
              Editable: Audience, Attachment Setup, Template ID, Team, Mail Owner, Analyst POC,
              Purpose and Subject. Categorization, CTA, frequency and schedule are inherited from
              the parent template.
            </p>
          </div>
        </div>
      )}



      {/* Core fields */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <FormRow label="Template ID" required>
          <div className="flex items-center gap-2">
            <Input
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Paste the Template ID copied from Apollo"
            />
            <CheckTemplateButton templateId={templateId} />
          </div>
          {apolloTemplate && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              ℹ️ Live template design auto-fetched from Apollo Service — use “Check Template” for the
              full Desktop / Tablet / Mobile preview.
            </p>
          )}
        </FormRow>

        <FormRow label="Template Name">
          <Input
            value={templateName}
            readOnly
            tabIndex={-1}
            className="cursor-not-allowed bg-muted/60 text-muted-foreground"
            placeholder="Auto-fetched once a Template ID is entered"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {templateId.trim()
              ? `ℹ️ Auto-fetched from Apollo Service for Template ID: ${templateId.trim()}`
              : "ℹ️ Will be auto-fetched from Apollo Service based on the Template ID entered above."}
          </p>

        </FormRow>
        <FormRow label="Submitted By">
          <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{AUTH_SUBMITTER_NAME}</span>
              <span className="text-muted-foreground">({AUTH_SUBMITTER_EMAIL})</span>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Authenticated
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Auto-detected from your Blinkit SSO session. Approval notifications route here.
          </p>
        </FormRow>
        <FormRow label="Mail Owner Email" required>
          <Input
            type="email"
            value={mailOwner}
            onChange={(e) => setMailOwner(e.target.value)}
            placeholder="owner.name@grofers.com"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Email ID of the accountable process owner or manager. Must end in @grofers.com or
            @zomato.com.
          </p>
        </FormRow>
        <FormRow label="Send Approval Request Copy To (CC Emails)">
          <EmailPillInput
            values={approvalCcEmails}
            onChange={setApprovalCcEmails}
            allowedDomains={["grofers.com", "zomato.com"]}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Approval notifications, status updates, and sign-off requests will be routed to these
            internal reviewers.
          </p>
        </FormRow>
        <FormRow label="Team" required>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {team === "Other" && (
            <div className="mt-2">
              <Label className="text-xs">
                Specify Custom Name<span className="ml-0.5 text-cat-red">*</span>
              </Label>
              <Input
                value={customTeam}
                onChange={(e) => setCustomTeam(e.target.value)}
                placeholder="e.g. Dark Store Logistics"
              />
            </div>
          )}
        </FormRow>
        <FormRow label="Analyst POC Email" required>
          <Input
            type="email"
            value={analyst}
            onChange={(e) => setAnalyst(e.target.value)}
            placeholder="analyst.name@grofers.com"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Must end in @grofers.com or @zomato.com.
          </p>
        </FormRow>
        <FormRow label="Purpose of Mail" required>
          <Textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value.slice(0, 1000))}
            rows={4}
            maxLength={1000}
            placeholder="Describe in your own words why this communication is being sent, what the vendor should understand from it, and any business context the approver needs."
          />
          <div className="mt-1 text-right text-[11px] text-muted-foreground">
            {purpose.length}/1000 characters
          </div>
        </FormRow>
        <FormRow label="Mail will be sent to" required>
          {attachmentMode === "dynamic_pdf" ? (
            <>
              <Input
                value="🔒 Pre-mapped by Entity (Locked)"
                readOnly
                disabled
                tabIndex={-1}
                className="cursor-not-allowed bg-muted/60 text-muted-foreground"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Entity-level dynamic PDFs resolve the audience from the mapped entity list — manual
                audience selection is disabled.
              </p>
            </>
          ) : (
            <MultiSelect
              options={SENT_TO_OPTIONS}
              values={sentTo}
              onChange={(next) => {
                const hasVendorUpload = next.includes("Targeted Vendor IDs (Upload File)");
                const hasMfrUpload = next.includes("Targeted Manufacturer IDs (Upload File)");
                if (!hasVendorUpload && vendorListName) setVendorListName("");
                if (!hasMfrUpload && mfrListName) setMfrListName("");
                setSentTo(next);
              }}
              max={2}
              placeholder="Pick audience"
            />
          )}
        </FormRow>
        {(() => {
          if (attachmentMode === "dynamic_pdf") return null;
          const hasVendorUpload = sentTo.includes("Targeted Vendor IDs (Upload File)");
          const hasMfrUpload = sentTo.includes("Targeted Manufacturer IDs (Upload File)");
          if (!hasVendorUpload && !hasMfrUpload) return null;

          return (
            <>
              {hasVendorUpload && (
                <FormRow label="Vendor ID list" required>
                  <FileField value={vendorListName} onChange={setVendorListName} />
                </FormRow>
              )}
              {hasMfrUpload && (
                <FormRow label="Manufacturer ID list" required>
                  <FileField value={mfrListName} onChange={setMfrListName} />
                </FormRow>
              )}
            </>
          );
        })()}
      </section>

      {/* Comms Categorization - Inference engine */}
      <section
        className={cn(
          "space-y-4 rounded-xl border border-border bg-card p-5",
          isFollowUpClone && "pointer-events-none opacity-60",
        )}
        aria-disabled={isFollowUpClone}
      >
        <div>
          <h3 className="text-sm font-semibold">Comms Categorization</h3>
          <p className="text-xs text-muted-foreground">
            Pick a purpose and domain — category, priority, channels, and expiry are inferred
            automatically.
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
                {SUB_CATEGORY_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subCategory === "Other" && (
              <div className="mt-2 space-y-2">
                <Label className="text-xs">
                  Specify Custom Name<span className="ml-0.5 text-cat-red">*</span>
                </Label>
                <Input
                  value={customSubCategory}
                  onChange={(e) => setCustomSubCategory(e.target.value)}
                  placeholder="e.g. Dark Store Replenishment Alerts"
                />
                <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                  ⚠️ Custom Category — Requires Manual Governance Review
                </div>
              </div>
            )}
          </FormRow>
          <FormRow label="Domain" required>
            <Select value={domain} onValueChange={(v) => setDomain(v as DomainType | "Other")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {domain === "Other" && (
              <div className="mt-2">
                <Label className="text-xs">
                  Specify Custom Name<span className="ml-0.5 text-cat-red">*</span>
                </Label>
                <Input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="e.g. Quick Commerce Logistics"
                />
              </div>
            )}
          </FormRow>
          <FormRow label="Category (override)">
            <Input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Leave blank to use the system-inferred category"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Only fill this if the inferred category below does not describe this communication.
              The approver reviews the custom name.
            </p>
          </FormRow>
        </div>

        {inferred && (
          <>
            <div className="text-[11px] text-muted-foreground">
              🔒 Inherited from mail category type, not editable here
            </div>
            <InferredRulesPanel
              rules={inferred}
              actionRequired={actionRequired}
              onActionRequiredChange={(v) => {
                setActionRequired(v);
                if (!v) {
                  setExpectedActionType("");
                  setFollowUpRequired(false);
                }
              }}
              expectedActionType={expectedActionType}
              onExpectedActionTypeChange={setExpectedActionType}
              followUpRequired={followUpRequired}
              onFollowUpRequiredChange={setFollowUpRequired}
            />

          </>
        )}
      </section>

      {/* Apollo auto-fetched template — read only */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">Template Design (Auto-fetched)</h3>
          <p className="text-xs text-muted-foreground">
            Content and design are authored in Apollo. Enter the Template ID above to load the live
            design — nothing is editable here.
          </p>
        </div>
        <FormRow label="Subject line" required>
          <Input
            value={subject}
            readOnly
            tabIndex={-1}
            className="cursor-not-allowed bg-muted/60 text-muted-foreground"
            placeholder="Auto-fetched once a Template ID is entered"
          />
          <LiquidVarPills text={subject} />
        </FormRow>
        <FormRow label="Inline SQL Chart binding (optional)">
          <Input
            value={chartQuery}
            onChange={(e) => setChartQuery(e.target.value)}
            placeholder="rebate_trend_by_vendor.sql"
          />
          {chartQuery && <InlineSqlChartPreview label={chartQuery} />}
        </FormRow>
      </section>

      <DynamicAttachmentSetup
        mode={attachmentMode}
        onModeChange={(m) => {
          setAttachmentMode(m);
          if (m === "dynamic_pdf") {
            setSentTo([]);
            setVendorListName("");
            setMfrListName("");
          }
        }}
        pdfConfig={pdfConfig}
        onPdfConfigChange={setPdfConfig}
        tableConfigs={tableConfigs}
        onTableConfigsChange={setTableConfigs}
      />

      {/* Smart attachment + CTA + Frequency */}

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <FormRow label="Attachment">
          <SmartAttachment
            value={attachmentConfig}
            onChange={setAttachmentConfig}
            queryDraft={attQueryDraft}
            onQueryDraftChange={setAttQueryDraft}
            formulaDraft={attFormulaDraft}
            onFormulaDraftChange={setAttFormulaDraft}
          />
        </FormRow>
        <div
          className={cn("space-y-4", isFollowUpClone && "pointer-events-none opacity-60")}
          aria-disabled={isFollowUpClone}
        >
        <FormRow label="Call to Action">
          <Select
            value={cta}
            onValueChange={(v) => {
              const next = v as CtaOption;
              setCta(next);
              if (next !== "Direct Link") {
                setCtaModuleRoute("");
                setCtaQueryParams("");
                setCtaDest("");
              }
              if (next !== "Autofilled Help & Support Ticket") {
                setTicketCategory("");
                setTicketSubcategory("");
              }
            }}
          >
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
            <div className="mt-2 space-y-2">
              <div>
                <Label className="text-xs">Target Portal Module Route *</Label>
                <Select
                  value={ctaModuleRoute}
                  onValueChange={(v) => {
                    setCtaModuleRoute(v);
                    setCtaDest(v);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select module route" />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_MODULE_ROUTES.map((r) => (
                      <SelectItem key={r.route} value={r.route}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Query Parameters (optional)</Label>
                <Input
                  value={ctaQueryParams}
                  onChange={(e) => setCtaQueryParams(e.target.value)}
                  placeholder="?po_id={{po_number}}"
                />
              </div>
            </div>
          )}
          {cta === "Autofilled Help & Support Ticket" && (
            <div className="mt-2 space-y-2">
              <div>
                <Label className="text-xs">
                  Ticket Category <span className="text-cat-red">*</span>
                </Label>
                <Select
                  value={ticketCategory}
                  onValueChange={(v) => {
                    setTicketCategory(v);
                    setTicketSubcategory("");
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select ticket category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(TICKET_TAXONOMY).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  Ticket Subcategory <span className="text-cat-red">*</span>
                </Label>
                <Select
                  value={ticketSubcategory}
                  onValueChange={setTicketSubcategory}
                  disabled={!ticketCategory}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue
                      placeholder={
                        ticketCategory ? "Select subcategory" : "Select a category first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(TICKET_TAXONOMY[ticketCategory] ?? []).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ℹ️ Autofills vendor ticket category to eliminate mistagged tickets and support SLA
                rejections.
              </p>
            </div>
          )}

        </FormRow>
        <FormRow label="Frequency of the mail to be sent" required>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as FrequencyOption)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {FREQ_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Schedule Deadline / Expiry Cap" required>
          <Input
            type="datetime-local"
            value={scheduleDeadline}
            onChange={(e) => setScheduleDeadline(e.target.value)}
          />
        </FormRow>
        </div>
      </section>


      {showWhatsApp && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Segment includes Low Tech vendors. A WhatsApp variant is required per Vendor Delivery
            Profiles.
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
            audienceCount > 1000 ? "bg-cat-amber text-white hover:bg-cat-amber/90" : undefined
          }
        >
          {isEdit
            ? requiresReapproval
              ? "Save & Send for Re-approval"
              : "Save Changes"
            : audienceCount > 1000
              ? "Request Admin Approval"
              : isFollowUpClone
                ? "Submit Follow-Up"
                : "Submit Request"}
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

  const remove = (email: string) => onChange(values.filter((e) => e !== email));

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
                valid ? "bg-primary/10 text-primary" : "bg-cat-red-soft text-cat-red",
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
          placeholder={values.length === 0 ? "Type an email and press Enter or comma" : ""}
          className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {errorIdx !== null && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-cat-red">
          <AlertTriangle className="h-3 w-3" />
          Invalid email — hover the red pill to remove it
        </p>
      )}
      {domainError && (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-cat-red">
          {domainError}
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">
        Add multiple with Enter or comma. Backspace removes the last tag.
      </p>
    </div>
  );
}

// ---------- Inferred Rules Panel ----------
function InferredRulesPanel({
  rules,
  actionRequired,
  onActionRequiredChange,
  expectedActionType,
  onExpectedActionTypeChange,
  followUpRequired,
  onFollowUpRequiredChange,
}: {
  rules: InferredRules;
  actionRequired: boolean | null;
  onActionRequiredChange: (v: boolean) => void;
  expectedActionType: string;
  onExpectedActionTypeChange: (v: string) => void;
  followUpRequired: boolean | null;
  onFollowUpRequiredChange: (v: boolean) => void;
}) {
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
        {rules.channels.map((c) => (
          <Badge key={c} variant="outline">
            {c}
          </Badge>
        ))}
        <Badge variant="secondary">Expiry: {rules.expiry}</Badge>
        <Badge
          className={cn(
            "hover:bg-inherit",
            rules.unsubscribe === "LOCKED_DISABLED"
              ? "bg-cat-red-soft text-cat-red"
              : "bg-cat-green-soft text-cat-green",
          )}
        >
          {rules.unsubscribe === "LOCKED_DISABLED" ? "Unsubscribe: Locked" : "Unsubscribe: Allowed"}
        </Badge>
      </div>

      <div className="space-y-2 rounded-md border border-border bg-background p-3">
        <p className="text-xs font-medium text-foreground">
          Is an operational action required from the vendor? <span className="text-cat-red">*</span>
        </p>
        <div className="flex items-center gap-4">
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map((opt) => (
            <label
              key={opt.label}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
            >
              <input
                type="radio"
                name="submitter-action-required"
                className="h-3.5 w-3.5 accent-primary"
                checked={actionRequired === opt.value}
                onChange={() => onActionRequiredChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Declared manually by the submitter — this flag drives the vendor-side action banner.
        </p>
      </div>

      {actionRequired === true && (
        <>
          <div className="space-y-1.5 rounded-md border border-cat-red/40 bg-background p-3">
            <Label className="text-xs font-medium">
              Expected Action from Audience <span className="text-cat-red">*</span>
            </Label>
            <Textarea
              rows={3}
              value={expectedActionType}
              onChange={(e) => onExpectedActionTypeChange(e.target.value)}
              placeholder="e.g. Acknowledge PO cancellation, Reconcile statement, Upload missing GRN"
            />
            <p className="text-[11px] text-muted-foreground">
              Specify the exact operational step required from the vendor or manufacturer.
            </p>
          </div>

          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium text-foreground">
              Is a follow-up template required for non-responders?{" "}
              <span className="text-cat-red">*</span>
            </p>
            <div className="flex items-center gap-4">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
                >
                  <input
                    type="radio"
                    name="submitter-followup-required"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={followUpRequired === opt.value}
                    onChange={() => onFollowUpRequiredChange(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              A nested follow-up request is auto-scaffolded on approval when set to Yes.
            </p>
          </div>
        </>
      )}

    </div>

  );
}

// ---------------------------------------------------------------------------
// Dynamic attachment engine (entity PDFs + multiple dynamic tables)
// ---------------------------------------------------------------------------

const NUMERIC_COLUMNS = new Set([
  "charges",
  "instances",
  "sales_volume",
  "growth_pct",
  "downtime_mins",
]);

export function findQuery(id: string) {
  return PRE_APPROVED_QUERIES.find((q) => q.id === id) ?? null;
}

/** Entity PDFs need entity_name AND an identity column. */
export function isPdfQueryValid(id: string): boolean {
  const q = findQuery(id);
  if (!q) return false;
  return (
    q.columns.includes("entity_name") &&
    (q.columns.includes("mfd_id") || q.columns.includes("vendor_id"))
  );
}

/** Dynamic tables need an identity column. */
export function isTableQueryValid(id: string): boolean {
  const q = findQuery(id);
  if (!q) return false;
  return (
    q.columns.includes("vendor_id") ||
    q.columns.includes("manufacturer_id") ||
    q.columns.includes("mfd_id")
  );
}

const HIGHLIGHT_COLORS = ["#DC2626", "#F59E0B", "#16A34A", "#2563EB"];

function tableUid() {
  return `tbl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyPdfConfig(): PdfEntityConfig {
  return {
    queryId: "",
    queryName: "",
    uploadedEntities: Object.fromEntries(MOCK_ENTITIES.map((e) => [e, false])),
  };
}

function DynamicAttachmentSetup({
  mode,
  onModeChange,
  pdfConfig,
  onPdfConfigChange,
  tableConfigs,
  onTableConfigsChange,
}: {
  mode: AttachmentMode;
  onModeChange: (m: AttachmentMode) => void;
  pdfConfig: PdfEntityConfig;
  onPdfConfigChange: (c: PdfEntityConfig) => void;
  tableConfigs: DynamicTableConfig[];
  onTableConfigsChange: (c: DynamicTableConfig[]) => void;
}) {
  const MODES: { value: AttachmentMode; label: string; hint: string }[] = [
    { value: "none", label: "None", hint: "No dynamic attachment" },
    {
      value: "dynamic_pdf",
      label: "Dynamic PDFs (Entity-Level)",
      hint: "One PDF per legal entity, mapped automatically",
    },
    {
      value: "dynamic_tables",
      label: "Dynamic Tables",
      hint: "Per-vendor tables rendered from a pre-approved query",
    },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold">Dynamic Attachment Setup</h3>
        <p className="text-xs text-muted-foreground">
          Attachments are generated per recipient at send time from a pre-approved query.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-xs transition",
              mode === m.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                : "border-border hover:border-primary/40",
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                name="dynamic-attachment-mode"
                className="h-3.5 w-3.5 accent-primary"
                checked={mode === m.value}
                onChange={() => onModeChange(m.value)}
              />
              {m.label}
            </span>
            <span className="pl-5 text-[11px] text-muted-foreground">{m.hint}</span>
          </label>
        ))}
      </div>

      {mode === "dynamic_pdf" && <PdfEntitySetup config={pdfConfig} onChange={onPdfConfigChange} />}

      {mode === "dynamic_tables" && (
        <div className="space-y-4">
          {tableConfigs.map((tc, idx) => (
            <DynamicTableCard
              key={tc.id}
              index={idx}
              config={tc}
              onChange={(next) =>
                onTableConfigsChange(tableConfigs.map((t) => (t.id === tc.id ? next : t)))
              }
              onRemove={
                tableConfigs.length > 1
                  ? () => onTableConfigsChange(tableConfigs.filter((t) => t.id !== tc.id))
                  : undefined
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              onTableConfigsChange([
                ...tableConfigs,
                {
                  id: tableUid(),
                  queryId: "",
                  queryName: "",
                  selectedColumns: [],
                  conditionalRules: {},
                  hasSummaryRow: false,
                },
              ])
            }
          >
            <PlusCircle className="h-4 w-4" /> Add Another Dynamic Table
          </Button>
        </div>
      )}
    </div>
  );
}

function PdfEntitySetup({
  config,
  onChange,
}: {
  config: PdfEntityConfig;
  onChange: (c: PdfEntityConfig) => void;
}) {
  const valid = config.queryId ? isPdfQueryValid(config.queryId) : null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
        🔒 Audience is pre-mapped by Entity — the audience selector above is locked for this mode.
      </div>

      <FormRow label="Pre-approved query" required>
        <Select
          value={config.queryId}
          onValueChange={(v) => {
            const q = findQuery(v);
            onChange({ ...config, queryId: v, queryName: q?.name ?? "" });
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a pre-approved query" />
          </SelectTrigger>
          <SelectContent>
            {PRE_APPROVED_QUERIES.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {config.queryId && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(findQuery(config.queryId)?.columns ?? []).map((c) => (
              <Badge key={c} variant="outline" className="font-mono text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </FormRow>

      {valid === false && (
        <div className="rounded-md border border-cat-red bg-cat-red-soft px-3 py-2 text-xs font-medium text-cat-red">
          ⚠️ Query Validation Failed: Selected query is missing 'entity_name' or 'mfd_id'. Cannot
          proceed.
        </div>
      )}

      {valid === true && (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ENTITIES.map((entity) => {
                const ready = config.uploadedEntities[entity] === true;
                return (
                  <TableRow key={entity}>
                    <TableCell className="font-medium">{entity}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          ready
                            ? "bg-cat-green-soft text-cat-green"
                            : "bg-cat-red-soft text-cat-red",
                        )}
                      >
                        {ready ? "🟢 PDF Ready" : "🔴 Upload needed"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={ready ? "ghost" : "outline"}
                        className="gap-1"
                        onClick={() =>
                          onChange({
                            ...config,
                            uploadedEntities: {
                              ...config.uploadedEntities,
                              [entity]: !ready,
                            },
                          })
                        }
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        {ready ? "Replace PDF" : "Upload PDF"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function DynamicTableCard({
  index,
  config,
  onChange,
  onRemove,
}: {
  index: number;
  config: DynamicTableConfig;
  onChange: (c: DynamicTableConfig) => void;
  onRemove?: () => void;
}) {
  const query = config.queryId ? findQuery(config.queryId) : null;
  const valid = config.queryId ? isTableQueryValid(config.queryId) : null;
  const available = (query?.columns ?? []).filter((c) => !config.selectedColumns.includes(c));

  const addColumn = (col: string) => {
    if (config.selectedColumns.includes(col)) return;
    onChange({ ...config, selectedColumns: [...config.selectedColumns, col] });
  };
  const removeColumn = (col: string) => {
    const rules = { ...(config.conditionalRules ?? {}) };
    delete rules[col];
    onChange({
      ...config,
      selectedColumns: config.selectedColumns.filter((c) => c !== col),
      conditionalRules: rules,
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Dynamic Table #{index + 1}</span>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="gap-1">
            <X className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>

      <FormRow label="Pre-approved query" required>
        <Select
          value={config.queryId}
          onValueChange={(v) => {
            const q = findQuery(v);
            onChange({
              ...config,
              queryId: v,
              queryName: q?.name ?? "",
              selectedColumns: [],
              conditionalRules: {},
            });
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a pre-approved query" />
          </SelectTrigger>
          <SelectContent>
            {PRE_APPROVED_QUERIES.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      {valid === false && (
        <div className="rounded-md border border-cat-red bg-cat-red-soft px-3 py-2 text-xs font-medium text-cat-red">
          ⚠️ Query Validation Failed: Query missing identity column (vendor_id/manufacturer_id).
        </div>
      )}

      {valid === true && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Available columns (click or drag)</Label>
            <div className="flex min-h-[64px] flex-wrap gap-1.5 rounded-md border border-dashed border-border p-2">
              {available.length === 0 && (
                <span className="text-[11px] text-muted-foreground">All columns assigned.</span>
              )}
              {available.map((col) => (
                <button
                  key={col}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", col)}
                  onClick={() => addColumn(col)}
                  className="cursor-grab rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 font-mono text-[11px] text-primary hover:bg-primary/10"
                >
                  {col}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Manual typing of column names is disabled — assign fields from the query schema only.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Table layout</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const col = e.dataTransfer.getData("text/plain");
                if (col) addColumn(col);
              }}
              className="min-h-[64px] space-y-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-2"
            >
              {config.selectedColumns.length === 0 && (
                <span className="text-[11px] text-muted-foreground">
                  Drop or click columns to build the table.
                </span>
              )}
              {config.selectedColumns.map((col) => {
                const rule = config.conditionalRules?.[col];
                return (
                  <div key={col} className="rounded-md border border-border bg-background p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium">{col}</span>
                      <button
                        type="button"
                        onClick={() => removeColumn(col)}
                        className="text-muted-foreground hover:text-cat-red"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {NUMERIC_COLUMNS.has(col) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-muted-foreground">Highlight if</span>
                        <Select
                          value={rule?.operator ?? "<"}
                          onValueChange={(v) =>
                            onChange({
                              ...config,
                              conditionalRules: {
                                ...(config.conditionalRules ?? {}),
                                [col]: {
                                  operator: v as "<" | ">",
                                  value: rule?.value ?? "",
                                  color: rule?.color ?? HIGHLIGHT_COLORS[0],
                                },
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-14">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<">{"<"}</SelectItem>
                            <SelectItem value=">">{">"}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-7 w-24"
                          value={rule?.value ?? ""}
                          onChange={(e) =>
                            onChange({
                              ...config,
                              conditionalRules: {
                                ...(config.conditionalRules ?? {}),
                                [col]: {
                                  operator: rule?.operator ?? "<",
                                  value: e.target.value,
                                  color: rule?.color ?? HIGHLIGHT_COLORS[0],
                                },
                              },
                            })
                          }
                          placeholder="value"
                        />
                        <div className="flex items-center gap-1">
                          {HIGHLIGHT_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              aria-label={`Highlight colour ${c}`}
                              onClick={() =>
                                onChange({
                                  ...config,
                                  conditionalRules: {
                                    ...(config.conditionalRules ?? {}),
                                    [col]: {
                                      operator: rule?.operator ?? "<",
                                      value: rule?.value ?? "",
                                      color: c,
                                    },
                                  },
                                })
                              }
                              style={{ backgroundColor: c }}
                              className={cn(
                                "h-4 w-4 rounded-full border",
                                rule?.color === c ? "ring-2 ring-foreground ring-offset-1" : "",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[11px]">
              <Checkbox
                checked={config.hasSummaryRow === true}
                onCheckedChange={(v) => onChange({ ...config, hasSummaryRow: v === true })}
              />
              Add Summary Row (exempt from vendor_id requirement)
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Full PartnersBiz support ticket taxonomy ----------
export const TICKET_TAXONOMY: Record<string, string[]> = {
  "Purchase Order": [
    "Need PO Copy (Response time ~3 Days)",
    "PO Header Amendment (Response time ~2 Days)",
    "PO Item Amendment (Response time ~2 Days)",
    "Vendor Outage (Response time ~2 Days)",
    "Other (Response time ~4 Days)",
  ],
  "GRN & Discrepancy Note": [
    "Need GRN Copy (Response time ~2 Days)",
    "Need DN details (Response time ~1 Day)",
    "DN Action - Request Return / Liquidation (Response time ~1 Day)",
    "Mismatch in DN Stock Returned (Response time ~3 Days)",
    "Require Proof for DN (Response time ~2 Days)",
    "Update Courier Details for DN (Response time ~3 Days)",
    "GRN Pending (Response time ~2 Days)",
    "Other (Response time ~4 Days)",
  ],
  Payment: [
    "Need Payment Advice (Response time ~1 Day)",
    "Understand My Payment Advice (Response time ~2 Days)",
    "Payment Pending against an Invoice (Response time ~1 Day)",
    "Short Payment (Response time ~1 Day)",
    "Reconciliation Request (Response time ~2 Days)",
    "Request Ledger (Response time ~2 Days)",
    "Debit Note Workings (Response time ~3 Days)",
    "Update Bank Details (Response time ~2 Days)",
    "TDS Certificate (Response time ~3 Days)",
    "Other (Response time ~4 Days)",
  ],
  Assortment: [
    "Update product images & videos (Response time ~2 Days)",
    "Update category of product (Response time ~2 Days)",
    "Update dimensions (Response time ~2 Days)",
    "Update Shelf Life (Response time ~2 Days)",
    "Update product name (Response time ~2 Days)",
    "Group/Ungroup PIDs (Response time ~2 Days)",
    "Update product attributes (Response time ~2 Days)",
    "Change brand logo (Response time ~2 Days)",
    "Update case size (inner/outer) (Response time ~2 Days)",
    "Update HSN code (Response time ~2 Days)",
    "Others (Response time ~4 Days)",
  ],
  Returns: [
    "Need POD (Response time ~1 Day)",
    "Update RTV Details (Response time ~1 Day)",
    "Discrepancy Form (Response time ~3 Days)",
    "Need PRN Details (Response time ~3 Days)",
    "Mismatch in debit notes (Response time ~3 Days)",
    "Others (Response time ~3 Days)",
  ],
  Onboarding: [
    "Warehouse details needed (Response time ~4 Days)",
    "Other (Response time ~4 Days)",
  ],
  "Login Issues": ["Not receiving OTP (Response time ~1 Day)", "Other"],
  "Fees & Charges": ["Dispute Charge (Response time ~2 Days)", "Other"],
  "Marketing & Brand Fund Invoices": [
    "Data Request - Sales (Response time ~3 Days)",
    "Data Request - Distributor wise invoices (Response time ~3 Days)",
    "Data Request - Invoice Copy (Response time ~3 Days)",
    "Update Brand Fund Communication Email (Response time ~2 Days)",
    "Brand Fund/ Marketing Invoice Issue (Response time ~2 Days)",
    "Other (Response time ~4 Days)",
  ],
  Other: ["Other (Response time ~4 Days)"],
};

// ---------- Smart attachment (multi-source engine) ----------
const ATTACHMENT_ICON: Record<AttachmentItem["type"], string> = {
  static: "📄",
  query: "🗄️",
  formula: "☁️",
};

function attachmentUid(): string {
  return `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type AttachmentTabKey = "none" | "static" | "query" | "formula";

function SmartAttachment({
  value,
  onChange,
  queryDraft,
  onQueryDraftChange,
  formulaDraft,
  onFormulaDraftChange,
}: {
  value: AttachmentConfig;
  onChange: (v: AttachmentConfig) => void;
  queryDraft: string;
  onQueryDraftChange: (v: string) => void;
  formulaDraft: string;
  onFormulaDraftChange: (v: string) => void;
}) {
  const items = value.items ?? [];
  const [tab, setTab] = useState<AttachmentTabKey>(items.length === 0 ? "none" : "static");

  const tabs: Array<{ key: AttachmentTabKey; label: string; icon: typeof Ban }> = [
    { key: "none", label: "No Attachment", icon: Ban },
    { key: "static", label: "Static Upload", icon: FileUp },
    { key: "query", label: "SQL Query Output", icon: Database },
    { key: "formula", label: "Dynamic Formula Attachment", icon: Cloud },
  ];

  const commit = (next: AttachmentItem[]) => {
    const primary = next[next.length - 1];
    onChange({
      ...value,
      items: next,
      type: next.length === 0 ? "none" : (primary?.type ?? "static"),
      fileName: next.find((i) => i.type === "static")?.name,
      queryKey: next.find((i) => i.type === "query")?.name,
      formulaSpec: next.find((i) => i.type === "formula")?.name,
    });
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = [...items];
    Array.from(files).forEach((f) => {
      next.push({
        id: attachmentUid(),
        type: "static",
        name: f.name,
        size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
      });
    });
    commit(next);
  };

  const addText = (type: "query" | "formula", raw: string) => {
    const name = raw.trim();
    if (!name) return;
    commit([...items, { id: attachmentUid(), type, name }]);
    if (type === "query") onQueryDraftChange("");
    else onFormulaDraftChange("");
  };

  const remove = (id: string) => commit(items.filter((i) => i.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const on = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
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

      {tab === "none" && (
        <p className="text-[11px] text-muted-foreground">
          No attachment will ship with this communication. Switch tabs to add one or more sources —
          adding a source never clears the ones already configured.
        </p>
      )}

      {tab === "static" && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground hover:bg-muted/50"
        >
          <FileUp className="h-5 w-5" />
          <span className="font-medium">Drag &amp; drop files, or click to browse</span>
          <span className="text-[10px]">Multiple files supported · .pdf / .xlsx / .csv</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}

      {tab === "query" && (
        <div className="flex items-start gap-2">
          <Input
            value={queryDraft}
            onChange={(e) => onQueryDraftChange(e.target.value)}
            placeholder="e.g. pending_rebates.sql — runs at send time, ships CSV/XLSX"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => addText("query", queryDraft)}
          >
            + Add SQL Query
          </Button>
        </div>
      )}

      {tab === "formula" && (
        <div className="space-y-1">
          <Label className="text-xs">Formula Attachment Specification</Label>
          <div className="flex items-start gap-2">
            <Input
              value={formulaDraft}
              onChange={(e) => onFormulaDraftChange(e.target.value)}
              placeholder="e.g. s3://blinkit-templates/formulas/vendor_penalty_recon_v2.xlsx"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => addText("formula", formulaDraft)}
            >
              + Add Formula Spec
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The formula file or script that generates the attachment at send time.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Configured Attachments ({items.length})
        </div>
        {items.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">No attachments configured yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
              >
                <span>{ATTACHMENT_ICON[item.type]}</span>
                <span className="font-medium">{item.name}</span>
                {item.size && <span className="text-[10px] text-muted-foreground">{item.size}</span>}
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(item.id)}
                  className="text-muted-foreground hover:text-cat-red"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ---------- Approver: multi-attachment inspection ----------
function AttachmentInspectionCard({ items }: { items: AttachmentItem[] }) {
  const [active, setActive] = useState<AttachmentItem | null>(null);

  const typeLabel = (t: AttachmentItem["type"]) =>
    t === "static" ? "Static Upload" : t === "query" ? "SQL Query Output" : "Dynamic Formula Spec";

  const metadata = (item: AttachmentItem) => {
    if (item.type === "query")
      return `-- ${item.name}\nSELECT vendor_id, po_number, amount_due\nFROM finance.pending_rebates\nWHERE status = 'PENDING'\n  AND send_date = CURRENT_DATE;`;
    if (item.type === "formula")
      return `# ${item.name}\nsource: s3 formula runner\nexecution: send-time (T-15 min)\noutput: xlsx (per-vendor sliced)\nowner: comms-automation@grofers.com`;
    return `file: ${item.name}\nsize: ${item.size ?? "412 KB"}\nuploaded_by: Himanshu Gupta\nchecksum: sha256:9f2c…a71b\nretention: 90 days`;
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Attachments &amp; Specifications ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="mt-1 text-[13px] text-muted-foreground">No Attachments Configured</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/10"
            >
              <span>{ATTACHMENT_ICON[item.type]}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attachment Inspection: {active?.name}</DialogTitle>
            <DialogDescription>
              {active ? `${typeLabel(active.type)} · ${active.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-cat-green/40 bg-cat-green-soft px-3 py-2 text-xs font-medium text-cat-green">
              ✅ Security Cleared · No Malware Detected
            </div>
            <pre className="max-h-56 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
              {active ? metadata(active) : ""}
            </pre>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                toast.success(
                  `Simulated download started — ${active?.name ?? "attachment"} (sandboxed preview)`,
                )
              }
            >
              Simulate Download / View Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground">Live SQL preview · sample data</span>
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
          <span className="font-semibold uppercase tracking-wider">
            Governance Interception:
          </span>{" "}
          Target audience ({audienceCount.toLocaleString("en-IN")}) exceeds the 1,000 recipient
          threshold. Direct dispatch is locked. Submission will route to Comms-Admin for approval.
        </div>
      )}
      {freqOverflow && (
        <div className="rounded-lg border border-yellow-400/60 bg-yellow-100/70 p-3 text-[12px] leading-relaxed text-yellow-900 dark:bg-yellow-500/10 dark:text-yellow-200">
          <span className="mr-1">⚠️</span>
          <span className="font-semibold uppercase tracking-wider">Frequency Cap Notice:</span>{" "}
          Target segment has reached max weekly frequency limit (3 non-P1 comms/week). This
          broadcast will be queued for next week's window.
        </div>
      )}
      {waInvalid && (
        <div className="rounded-lg border border-cat-red/50 bg-cat-red-soft p-3 text-[12px] leading-relaxed text-cat-red">
          <span className="mr-1">🛑</span>
          <span className="font-semibold uppercase tracking-wider">
            WhatsApp Registry Block:
          </span>{" "}
          Template not registered on Meta WhatsApp API. WhatsApp channel disabled for this drop.
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

function FileField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      onChange("");
      return;
    }
    const ok = /\.(csv|xlsx|xls)$/i.test(file.name);
    if (!ok) {
      toast.error(
        "🛑 Invalid file format. Only structured recipient lists (.csv, .xlsx, .xls) are allowed.",
      );
      if (inputRef.current) inputRef.current.value = "";
      onChange("");
      return;
    }
    onChange(file.name);
  };
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
      <Paperclip className="h-4 w-4" />
      <span className="truncate">{value || "Choose .csv, .xlsx, or .xls"}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handle}
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
    return <RequestDetail request={selected} onBack={() => setSelectedId(null)} />;
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
                <TableHead>Submitted By</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Time Waiting</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedId(r.id)}>
                  <TableCell className="font-medium">{r.templateName}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium text-foreground">{r.submittedBy}</div>
                    <div className="text-[11px] text-muted-foreground">{r.primaryEmail}</div>
                    <div className="text-[11px] text-muted-foreground">
                      CCs:{" "}
                      {(r.approvalCcEmails ?? [].length > 0)
                        ? (r.approvalCcEmails ?? [].join(", "))
                        : "None"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.team || "—"}</TableCell>
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
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
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
  {
    vendor: "Aashirvaad Foods",
    vendorId: "V-8821",
    contact: "scm-lead@aashirvaad.co",
    reason: "550 Mailbox Full",
  },
  {
    vendor: "Sunfeast Retail",
    vendorId: "V-4410",
    contact: "ops@sunfeast-retail.in",
    reason: "550 Mailbox Not Found",
  },
  {
    vendor: "Bingo Snacks Co.",
    vendorId: "V-6612",
    contact: "finance@bingosnacks.in",
    reason: "Domain Firewall Block",
  },
  {
    vendor: "Mangaldeep Traders",
    vendorId: "V-3320",
    contact: "accounts@mangaldeep.in",
    reason: "550 Mailbox Full",
  },
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
          <div key={s.label} className="rounded-md border border-border bg-background p-3">
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
              <li key={b.vendorId} className="flex items-center justify-between px-3 py-2 text-xs">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {b.vendor}
                    <span className="ml-2 text-[10px] text-muted-foreground">{b.vendorId}</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{b.contact}</span>
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

function formatDeadline(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} IST`;
}

function ReasonChecklist({
  selected,
  onToggle,
}: {
  selected: RejectionReasonCategory[];
  onToggle: (v: RejectionReasonCategory) => void;
}) {
  return (
    <div className="max-h-[220px] space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
      {REJECTION_REASON_CATEGORIES.map((c) => {
        const checked = selected.includes(c);
        return (
          <label
            key={c}
            className="flex cursor-pointer items-start gap-2 rounded p-1.5 text-[13px] hover:bg-muted/50"
          >
            <Checkbox checked={checked} onCheckedChange={() => onToggle(c)} className="mt-0.5" />
            <span className="leading-snug">{c}</span>
          </label>
        );
      })}
    </div>
  );
}

function RequestDetail({ request, onBack }: { request: TemplateRequest; onBack: () => void }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonCats, setReasonCats] = useState<RejectionReasonCategory[]>([]);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdCats, setHoldCats] = useState<RejectionReasonCategory[]>([]);
  const [holdComments, setHoldComments] = useState("");
  const [detailChannel, setDetailChannel] = useState<PreviewChannel>("email");
  const [detailSample, setDetailSample] = useState(true);

  const toggleReason = (c: RejectionReasonCategory) =>
    setReasonCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleHold = (c: RejectionReasonCategory) =>
    setHoldCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const approve = () => {
    approveRequest(request.id);
    toast.success(`${request.templateName} approved`);
    onBack();
  };
  const confirmReject = () => {
    if (reasonCats.length === 0) {
      toast.error("Select at least one reason category");
      return;
    }
    const otherPicked = reasonCats.includes("Other");
    if (otherPicked && !reason.trim()) {
      toast.error("Additional notes are required when selecting 'Other'");
      return;
    }
    rejectRequest(request.id, reasonCats, reason.trim());
    toast.success(`${request.templateName} rejected`);
    setRejectOpen(false);
    onBack();
  };
  const confirmHold = () => {
    if (holdCats.length === 0) {
      toast.error("Select at least one hold reason category");
      return;
    }
    if (!holdComments.trim()) {
      toast.error("Hold explanation is required");
      return;
    }
    holdRequest(request.id, holdCats, holdComments.trim());
    toast.success(`Request ${request.id} put on hold. Submitter notified.`);
    setHoldOpen(false);
    onBack();
  };

  // ID list resolution
  const sentToLower = request.sentTo.map((s) => s.toLowerCase());
  const vendorFieldValue = sentToLower.some((s) => s.includes("all vendors on partnersbiz"))
    ? "All Vendors Directory (Auto-fetched from DB)"
    : request.vendorListName && request.vendorListName !== "-"
      ? `📎 ${request.vendorListName}`
      : "Not Applicable";
  const mfrFieldValue = sentToLower.some((s) => s.includes("all manufacturers on partnersbiz"))
    ? "All Manufacturers Directory (Auto-fetched from DB)"
    : request.manufacturerListName && request.manufacturerListName !== "-"
      ? `📎 ${request.manufacturerListName}`
      : "Not Applicable";

  const frequencyValue = `${request.frequency || "—"} · Deadline: ${formatDeadline(request.scheduleDeadline)}`;
  const ccValue =
    (request.approvalCcEmails ?? []).length > 0
      ? (request.approvalCcEmails ?? []).join(", ")
      : "None";
  const purposeValue = request.purpose?.trim() ? request.purpose : request.purposeCustomText || "—";
  const teamValue = `${request.team || "—"}${
    request.customTeam ? ` (Custom: ${request.customTeam})` : ""
  }`;
  const subCategoryValue = `${request.subCategory || "—"}${
    request.customSubCategory || request.subCategoryCustomText
      ? ` (Custom: ${request.customSubCategory ?? request.subCategoryCustomText})`
      : ""
  }`;
  const domainValue = `${request.domain || "—"}${
    request.customDomain ? ` (Custom: ${request.customDomain})` : ""
  }`;
  const categoryValue = `${CATEGORY_CONFIG[request.categoryId].label}${
    request.customCategory ? ` (Custom: ${request.customCategory})` : ""
  }`;
  const ctaValue =
    request.cta === "Direct Link"
      ? `Direct Link ➔ Route: ${request.ctaModuleRoute || "—"} | Query: ${request.ctaQueryParams || "None"}`
      : request.cta === "Autofilled Help & Support Ticket"
        ? `Autofilled Support Ticket ➔ Category: ${request.ticketCategory || "—"} | Subcategory: ${request.ticketSubcategory || "—"}`
        : request.cta;
  const queryParamsValue = request.ctaQueryParams || "None";
  const attachmentValue =
    request.attachment && request.attachment !== "None" ? request.attachment : "No Attachment";
  const attachmentItems: AttachmentItem[] =
    normalizeAttachmentConfig(request.attachmentConfig).items ?? [];
  const actionRequiredYes = request.actionRequired === true;


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
              <span>Template ID: {request.templateId}</span>
              <span>·</span>
              <span>By {request.submittedBy}</span>
            </div>
            <div className="mt-2">
              <CheckTemplateButton
                templateId={request.templateId}
                variant="default"
                label="Check Template & Device Preview"
                subject={request.subject}
                bodyHtml={request.body}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "hover:bg-inherit",
                actionRequiredYes ? "bg-cat-red text-white" : "bg-slate-200 text-slate-700",
              )}
            >
              {actionRequiredYes ? "⚡ Action Required: YES" : "Action Required: NO"}
            </Badge>
            <CategoryTag id={request.categoryId} />
            <PriorityTag p={request.priority} />
            <StatusTag status={request.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailField
            label="Submitted By"
            value={`${request.submittedBy} (${request.primaryEmail})`}
            full
          />
          <DetailField label="Mail Owner" value={request.mailOwner || "—"} />
          <DetailField label="Team" value={teamValue} />
          <DetailField label="Analyst POC" value={request.analystPoc || "—"} />
          <DetailField label="Approval CCs" value={ccValue} full />
          <DetailField label="Mail sent to" value={request.sentTo.join(", ") || "—"} />
          <DetailField label="Vendor ID list" value={vendorFieldValue} />
          <DetailField label="Manufacturer ID list" value={mfrFieldValue} />
          <DetailField label="Sub-Category Purpose" value={subCategoryValue} />
          <DetailField label="Domain" value={domainValue} />
          <DetailField label="Inferred / Custom Category" value={categoryValue} />
          <DetailField
            label="Action Required from Vendor"
            value={actionRequiredYes ? "Yes" : "No"}
          />
          {actionRequiredYes && (
            <DetailField
              label="Expected Vendor Action"
              value={request.expectedActionType || "Action required — detail not specified"}
              full
            />
          )}
          <DetailField label="Subject line" value={request.subject} full />
          <DetailField
            label="Inline SQL Chart Binding"
            value={request.inlineSqlChart || "None"}
            full
          />
          {request.inlineSqlChart ? (
            <div className="sm:col-span-2">
              <InlineSqlChartPreview label={request.inlineSqlChart} />
            </div>
          ) : null}
          {request.commType && <DetailField label="Comm type" value={request.commType} />}
          <DetailField label="Attachment Type" value={attachmentValue} />
          <DetailField label="Target Portal CTA Route" value={ctaValue} full />
          <DetailField label="Query Parameters" value={queryParamsValue} />
          <DetailField label="Frequency & Schedule Deadline" value={frequencyValue} />
        </div>

        <AttachmentInspectionCard items={attachmentItems} />


        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Purpose of Mail
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">{purposeValue}</p>
        </div>

        <div className="mt-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Apollo Template Preview
          </div>
          <p className="text-[11px] text-muted-foreground">
            ℹ️ Live template design auto-fetched from Apollo Service
          </p>
          <ApolloPreviewControls
            channel={detailChannel}
            onChannelChange={setDetailChannel}
            sampleDataEnabled={detailSample}
            onSampleDataChange={setDetailSample}
          />
          <ApolloEmailPreview
            templateId={request.templateId}
            subject={request.subject}
            bodyHtml={request.body}
            sampleDataEnabled={detailSample}
            selectedChannel={detailChannel}
          />
        </div>

        <div className="mt-5">
          <InheritedPanel categoryId={request.categoryId} priority={request.priority} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            🔒 Inherited from mail category type, not editable here
          </p>
        </div>

        {request.status === "Approved" && (
          <div className="mt-5">
            <TemplateDeliverabilityCard templateId={request.templateId} />
          </div>
        )}

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
          onClick={() => setRejectOpen(true)}
          className="gap-2 border-cat-red/30 text-cat-red hover:bg-cat-red-soft"
        >
          <XCircle className="h-4 w-4" /> Reject
        </Button>
        <Button
          variant="outline"
          onClick={() => setHoldOpen(true)}
          className="gap-2 border-cat-amber/40 text-cat-amber hover:bg-cat-amber-soft"
        >
          <PauseCircle className="h-4 w-4" /> Hold
        </Button>
        <Button onClick={approve} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Approve
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Provide a reason category. The submitter will see this on their request row.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Reason Category<span className="ml-0.5 text-cat-red">*</span>
              </Label>
              <ReasonChecklist selected={reasonCats} onToggle={toggleReason} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Reason for Rejection / Additional Notes
                {reasonCats.includes("Other") && <span className="ml-0.5 text-cat-red">*</span>}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder={
                  reasonCats.includes("Other")
                    ? "Required — describe the rejection reason"
                    : "Optional notes for the submitter"
                }
              />
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

      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put Request on Hold</DialogTitle>
            <DialogDescription>
              Pause this request and notify the submitter about the action required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Hold Reason Category<span className="ml-0.5 text-cat-red">*</span>
              </Label>
              <ReasonChecklist selected={holdCats} onToggle={toggleHold} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">
                Hold Explanation / Action Required from Submitter
                <span className="ml-0.5 text-cat-red">*</span>
              </Label>
              <Textarea
                value={holdComments}
                onChange={(e) => setHoldComments(e.target.value)}
                rows={4}
                placeholder="Describe what the submitter needs to do to unblock this request"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHoldOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmHold}>Confirm Hold</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({ label, value, full }: { label: string; value: string; full?: boolean }) {
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
    reasons: ["Same vendor cohort", "Same category", "Overlapping send window"],
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
    reasons: ["Same send window", "Overlapping recipients", "Similar CTA"],
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
  const label = strong ? "Good chance of clubbing" : "Medium chance of clubbing";

  const quality = getContentQuality(requestId);
  const rework = quality.score < 9;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm",
        strong ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card",
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        <Layers className={cn("h-4 w-4", strong ? "text-amber-600" : "text-muted-foreground")} />
        <h3 className="text-base font-semibold text-foreground">Clubbing Match</h3>
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
          <span className="font-semibold tabular-nums">{quality.score.toFixed(1)}/10</span>
        </span>
        {rework ? (
          <Badge className="bg-cat-red-soft text-cat-red hover:bg-cat-red-soft">Needs Rework</Badge>
        ) : (
          <Badge className="bg-cat-green-soft text-cat-green hover:bg-cat-green-soft">
            Publish ready
          </Badge>
        )}
        {rework && quality.reason && (
          <span className="text-xs text-muted-foreground">— {quality.reason}</span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{match.templateName}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{match.templateId}</span>
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
    ? (requests.find((r) => r.id === detailTarget.requestId) ?? null)
    : null;
  const pendingCount = logs.filter((l) => l.status === "Pending Review").length;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Published Templates</h2>
          <p className="text-xs text-muted-foreground">
            Post-publish activity from Submitters. Click any entry to view full details, then
            acknowledge or flag after review.
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
                  <span className="font-semibold">{l.submitterName}</span> published{" "}
                  <span className="font-semibold">{l.templateName}</span> to{" "}
                  <span className="font-medium">{l.segment}</span>, scheduled for{" "}
                  <span className="font-medium">{l.scheduledFor}</span>.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {l.templateId} · published {timeWaiting(l.publishedAt)} ago · click to view
                  details
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

      <FlagForReviewDialog log={flagTarget} onClose={() => setFlagId(null)} />
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
            {log.templateId} · published by {log.submitterName} · {timeWaiting(log.publishedAt)} ago
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
                  <DetailRow label="Frequency" value={request.frequency} />
                  <DetailRow label="Attachment" value={request.attachment} />
                  <DetailRow label="CTA" value={request.cta} />
                  <DetailRow
                    label="Submitted By"
                    value={`${request.submittedBy} (${request.primaryEmail})`}
                  />
                  <DetailRow
                    label="Approval CCs"
                    value={
                      (request.approvalCcEmails ?? []).length > 0
                        ? (request.approvalCcEmails ?? []).join(", ")
                        : "None"
                    }
                  />
                  <DetailRow label="Team" value={request.team} />
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
                <p className="mt-1 text-[10px] text-muted-foreground">Flagged at {log.flaggedAt}</p>
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

function FlagForReviewDialog({ log, onClose }: { log: PublishLog | null; onClose: () => void }) {
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
                Flagging <span className="font-medium">{log.templateName}</span> will reject the
                linked request post-publish and notify the submitter.
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
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">
              Reason Category<span className="ml-0.5 text-cat-red">*</span>
            </Label>
            <Select value={reasonCat} onValueChange={(v) => setReasonCat(v as RejectionCategory)}>
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
