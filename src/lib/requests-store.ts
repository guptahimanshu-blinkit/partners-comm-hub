import { useEffect, useState } from "react";
import type { CategoryId } from "./mock-data";

export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Rejected Post Publish";
export type RequestType = "Template Approval";
export type PriorityLevel = "P1" | "P2" | "P3";
export type FrequencyOption = "Once" | "Daily Digest" | "Weekly" | "Monthly";
export type AttachmentOption = "None" | "PDF" | "Image" | "Excel Export";
export type CtaOption = "None" | "Direct Link" | "Autofilled Help & Support Ticket";
export type CommTypeOption =
  | "Financial"
  | "Periodic"
  | "High frequency"
  | "Pre emptive"
  | "Security";
export type RejectionCategory =
  | "Content Issue"
  | "Wrong Config"
  | "Clubbing Conflict"
  | "Compliance Concern"
  | "Missing Info";

// -------- New category / rule inference types --------

export type SubCategoryPurpose =
  | "Reports"
  | "Announcements"
  | "Campaigns"
  | "Defect Flow Communications"
  | "Other";

export type DomainType =
  | "Operations & Appointments"
  | "Finance & Payments"
  | "Assortment / MDM"
  | "Warehouse Ops"
  | "Monetization"
  | "Product / Process Launch";

export type SequenceTier = "FYI" | "Standard" | "Critical";

export type AttachmentSourceType = "none" | "static" | "query" | "s3";

export interface AttachmentConfig {
  type: AttachmentSourceType;
  queryKey?: string;
  s3Path?: string;
  fileName?: string;
}

export interface PreflightChecks {
  audienceCount: number;
  requiresApproval: boolean;
  isAtFrequencyCap: boolean;
  waValidated: boolean;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  channel: string;
  event: string;
  status: string;
}

export interface InferredRules {
  categoryId: CategoryId;
  priority: PriorityLevel;
  channels: Array<"Portal" | "Mail" | "WhatsApp">;
  batching: string;
  expiry: string;
  unsubscribe: "LOCKED_DISABLED" | "ALLOWED";
}

// RFC 5322 (simplified, practical) email regex.
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function inferCategoryRules(
  subCategory: SubCategoryPurpose,
  domain: DomainType,
): InferredRules {
  if (subCategory === "Other") {
    return {
      categoryId: "daily_ops",
      priority: "P3",
      channels: ["Portal", "Mail"],
      batching: "Manual review required",
      expiry: "Set by Comms-Admin",
      unsubscribe: "ALLOWED",
    };
  }

  const isActionable =
    subCategory === "Defect Flow Communications" ||
    subCategory === "Campaigns";

  if (isActionable) {
    const categoryId: CategoryId =
      domain === "Finance & Payments" ? "finance_payments" : "action_required";
    return {
      categoryId,
      priority: "P1",
      channels: ["Portal", "Mail", "WhatsApp"],
      batching: "Real-time (No Batching)",
      expiry: "Persists until resolved",
      unsubscribe: "LOCKED_DISABLED",
    };
  }

  const categoryId: CategoryId =
    subCategory === "Reports" ? "reports_analytics" : "daily_ops";
  return {
    categoryId,
    priority: "P3",
    channels: ["Portal", "Mail"],
    batching: "Daily Digest (18:00 IST)",
    expiry: "48-72 hours / Next cycle",
    unsubscribe: "ALLOWED",
  };
}

export interface WhatsAppDraft {
  message: string;
  frequency: FrequencyOption[];
  cta: string;
}

export interface TemplateRequest {
  id: string;
  requestType: RequestType;
  templateId: string;
  templateName: string;
  primaryEmail: string;
  mailOwner: string;
  approvalCcEmails?: string[];
  team: string;
  purpose: string;
  purposeCustomText?: string;
  sentTo: string[];
  emailAttachmentsName: string;
  vendorListName: string;
  manufacturerListName: string;
  subject: string;
  body?: string;
  inlineSqlChart?: string;
  formulaFlags: string[];
  subCategory?: SubCategoryPurpose;
  subCategoryCustomText?: string;
  domain?: DomainType;
  commType?: CommTypeOption;
  categoryId: CategoryId;
  priority: PriorityLevel;
  attachment: AttachmentOption;
  attachmentConfig?: AttachmentConfig;
  cta: CtaOption;
  ctaDestination?: string;
  ctaModuleRoute?: string;
  ctaQueryParams?: string;
  frequency: FrequencyOption;
  scheduleDeadline: string;
  analystPoc: string;
  whatsapp?: WhatsAppDraft;
  sequenceTier?: SequenceTier;
  preflightChecks?: PreflightChecks;
  telemetryLogs?: TelemetryLog[];
  status: RequestStatus;
  submittedBy: string;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  rejectionCategory?: RejectionCategory;
}

// HMR-safe singletons: keep state on globalThis so hot reloads and any
// duplicated module evaluation share the same arrays and listener sets.
type StoreGlobal = {
  __PB_REQUESTS?: TemplateRequest[];
  __PB_REQ_LISTENERS?: Set<() => void>;
  __PB_PUBLISH_LOGS?: PublishLog[];
  __PB_LOG_LISTENERS?: Set<() => void>;
  __PB_CAMPAIGNS?: Campaign[];
  __PB_CMP_LISTENERS?: Set<() => void>;
  __PB_ACTIONS?: ActionItem[];
  __PB_ACT_LISTENERS?: Set<() => void>;
  __PB_STORE_HYDRATED?: boolean;
};
const g = globalThis as unknown as StoreGlobal;

const STORAGE_KEYS = {
  requests: "pbcc_requests_v4",
  publishLogs: "pbcc_publish_logs_v4",
  campaigns: "pbcc_campaigns_v4",
  actions: "pbcc_actions_v4",
} as const;

function readStoredArray<T>(key: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function writeStoredArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Prototype storage is best-effort; keep the in-memory flow working.
  }
}

function hydrateStoreFromStorage(force = false) {
  if (typeof window === "undefined") return;
  if (g.__PB_STORE_HYDRATED && !force) return;
  g.__PB_STORE_HYDRATED = true;

  const storedRequests = readStoredArray<TemplateRequest>(STORAGE_KEYS.requests);
  if (storedRequests) {
    REQUESTS = storedRequests;
    g.__PB_REQUESTS = storedRequests;
    emit();
  }

  const storedLogs = readStoredArray<PublishLog>(STORAGE_KEYS.publishLogs);
  if (storedLogs) {
    PUBLISH_LOGS = storedLogs;
    g.__PB_PUBLISH_LOGS = storedLogs;
    emitLogs();
  }

  const storedCampaigns = readStoredArray<Campaign>(STORAGE_KEYS.campaigns);
  if (storedCampaigns) {
    CAMPAIGNS = storedCampaigns;
    g.__PB_CAMPAIGNS = storedCampaigns;
    emitCampaigns();
  }

  const storedActions = readStoredArray<ActionItem>(STORAGE_KEYS.actions);
  if (storedActions) {
    ACTIONS = storedActions;
    g.__PB_ACTIONS = storedActions;
    emitActions();
  }
}

let REQUESTS: TemplateRequest[] = g.__PB_REQUESTS ?? (g.__PB_REQUESTS = seed());
const listeners: Set<() => void> =
  g.__PB_REQ_LISTENERS ?? (g.__PB_REQ_LISTENERS = new Set());

function emit() {
  listeners.forEach((l) => l());
}


export function getRequests(): TemplateRequest[] {
  hydrateStoreFromStorage();
  return REQUESTS;
}

function setRequests(next: TemplateRequest[]) {
  REQUESTS = next;
  g.__PB_REQUESTS = next;
  writeStoredArray(STORAGE_KEYS.requests, next);
  emit();
}

export function addRequest(r: TemplateRequest) {
  hydrateStoreFromStorage();
  setRequests([r, ...REQUESTS]);
}

export function approveRequest(id: string) {
  hydrateStoreFromStorage();
  setRequests(
    REQUESTS.map((r) =>
      r.id === id
        ? { ...r, status: "Approved" as const, approvedAt: nowStamp() }
        : r,
    ),
  );
}

export function rejectRequest(
  id: string,
  reason: string,
  category: RejectionCategory,
) {
  hydrateStoreFromStorage();
  setRequests(
    REQUESTS.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "Rejected" as const,
            rejectedAt: nowStamp(),
            rejectionReason: reason,
            rejectionCategory: category,
          }
        : r,
    ),
  );
}


export function useRequests(): TemplateRequest[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    hydrateStoreFromStorage();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return REQUESTS;
}

// -------- Publish log (post-publish confirmation loop) --------

export type PublishLogStatus = "Pending Review" | "Acknowledged" | "Flagged";

export interface PublishLog {
  id: string;
  requestId: string;
  templateId: string;
  templateName: string;
  segment: string;
  scheduledFor: string; // display string
  submitterName: string;
  publishedAt: string; // iso
  status: PublishLogStatus;
  flagReason?: string;
  flagCategory?: RejectionCategory;
  flaggedAt?: string;
}

let PUBLISH_LOGS: PublishLog[] =
  g.__PB_PUBLISH_LOGS ?? (g.__PB_PUBLISH_LOGS = seedPublishLogs());
const logListeners: Set<() => void> =
  g.__PB_LOG_LISTENERS ?? (g.__PB_LOG_LISTENERS = new Set());
function emitLogs() {
  logListeners.forEach((l) => l());
}


export function getPublishLogs(): PublishLog[] {
  hydrateStoreFromStorage();
  return PUBLISH_LOGS;
}

function setPublishLogs(next: PublishLog[]) {
  PUBLISH_LOGS = next;
  g.__PB_PUBLISH_LOGS = next;
  writeStoredArray(STORAGE_KEYS.publishLogs, next);
  emitLogs();
}

export function addPublishLog(log: PublishLog) {
  hydrateStoreFromStorage();
  setPublishLogs([log, ...PUBLISH_LOGS]);
}

export function acknowledgeLog(id: string) {
  hydrateStoreFromStorage();
  const log = PUBLISH_LOGS.find((l) => l.id === id);
  setPublishLogs(
    PUBLISH_LOGS.map((l) =>
      l.id === id ? { ...l, status: "Acknowledged" as const } : l,
    ),
  );
  if (log) {
    const req = REQUESTS.find((r) => r.id === log.requestId);
    const campaignId = `CMP-${log.id.replace(/^PUB-/, "")}`;
    if (req && !CAMPAIGNS.some((c) => c.id === campaignId)) {
      setCampaigns([deriveCampaign(req, log, nowStamp()), ...CAMPAIGNS]);
    }
  }
}


export function flagLog(
  id: string,
  reason: string,
  category: RejectionCategory,
) {
  hydrateStoreFromStorage();
  const log = PUBLISH_LOGS.find((l) => l.id === id);
  setPublishLogs(
    PUBLISH_LOGS.map((l) =>
      l.id === id
        ? {
            ...l,
            status: "Flagged" as const,
            flagReason: reason,
            flagCategory: category,
            flaggedAt: nowStamp(),
          }
        : l,
    ),
  );
  if (log) {
    setRequests(
      REQUESTS.map((r) =>
        r.id === log.requestId
          ? {
              ...r,
              status: "Rejected Post Publish" as const,
              rejectedAt: nowStamp(),
              rejectionReason: reason,
              rejectionCategory: category,
            }
          : r,
      ),
    );
  }
}


export function usePublishLogs(): PublishLog[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    logListeners.add(l);
    hydrateStoreFromStorage();
    return () => {
      logListeners.delete(l);
    };
  }, []);
  return PUBLISH_LOGS;
}

/* ------------------------------------------------------------------ */
/* Vendor action telemetry — cross-surface events                     */
/* ------------------------------------------------------------------ */

export interface VendorActionEvent {
  id: string;
  when: string; // ISO
  text: string;
  vendorName: string;
  poNumber?: string;
  kind: "acknowledge" | "dispute" | "snooze" | "reconcile";
}

export interface VendorActionTelemetry {
  id: string;
  timestamp: string; // e.g. "24 Jul 2026, 05:54 PM IST"
  vendorName: string;
  vendorId: string;
  templateId: string;
  templateName: string;
  campaignId: string;
  poInvoiceNo: string;
  actionType:
    | "Acknowledged & Stopped"
    | "Reconciled Statement"
    | "Disputed"
    | "Snoozed";
  statusTransition: string;
  clearedRiskFlag: string;
  channel: "PartnersBiz Portal" | "Email" | "WhatsApp";
}

const VENDOR_EVENTS: VendorActionEvent[] = [
  {
    id: "VE-SEED-1",
    when: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    text: "Vendor Kwality Foods acknowledged cancellation for PO #KF-77120",
    vendorName: "Kwality Foods",
    poNumber: "KF-77120",
    kind: "acknowledge",
  },
  {
    id: "VE-SEED-2",
    when: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    text: "Vendor Haldiram's reconciled GST credit note CN-88214",
    vendorName: "Haldiram's",
    poNumber: "CN-88214",
    kind: "reconcile",
  },
  {
    id: "VE-SEED-3",
    when: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    text: "Vendor Britannia disputed price mismatch on PO #BR-55901",
    vendorName: "Britannia",
    poNumber: "BR-55901",
    kind: "dispute",
  },
];
const VENDOR_TELEMETRY: VendorActionTelemetry[] = [
  {
    id: "VT-SEED-1",
    timestamp: "24 Jul 2026, 05:54 PM IST",
    vendorName: "Kwality Foods",
    vendorId: "V-8821",
    templateId: "APOLLO-8410F2",
    templateName: "PO Cancellation Notice",
    campaignId: "c-001",
    poInvoiceNo: "PO #KF-77120",
    actionType: "Acknowledged & Stopped",
    statusTransition: "Pending Vendor Ack ──► Acknowledged & Stopped",
    clearedRiskFlag: "In-transit dispatch risk cleared",
    channel: "PartnersBiz Portal",
  },
  {
    id: "VT-SEED-2",
    timestamp: "24 Jul 2026, 05:50 PM IST",
    vendorName: "ITC Limited",
    vendorId: "M-4412",
    templateId: "APOLLO-2291",
    templateName: "Q2 Rebate Statement",
    campaignId: "c-002",
    poInvoiceNo: "INV-BB-55921",
    actionType: "Reconciled Statement",
    statusTransition: "Pending Reconciliation ──► Reconciled",
    clearedRiskFlag: "Financial discrepancy cleared",
    channel: "PartnersBiz Portal",
  },
  {
    id: "VT-SEED-3",
    timestamp: "24 Jul 2026, 04:32 PM IST",
    vendorName: "Britannia",
    vendorId: "V-3310",
    templateId: "APOLLO-5511AB",
    templateName: "Price Mismatch Alert",
    campaignId: "c-003",
    poInvoiceNo: "PO #BR-55901",
    actionType: "Disputed",
    statusTransition: "Pending Vendor Ack ──► Disputed",
    clearedRiskFlag: "Escalated to Category Manager",
    channel: "Email",
  },
  {
    id: "VT-SEED-4",
    timestamp: "24 Jul 2026, 03:12 PM IST",
    vendorName: "Haldiram's",
    vendorId: "V-7788",
    templateId: "APOLLO-8410F2",
    templateName: "PO Cancellation Notice",
    campaignId: "c-001",
    poInvoiceNo: "PO #HD-66210",
    actionType: "Acknowledged & Stopped",
    statusTransition: "Pending Vendor Ack ──► Acknowledged & Stopped",
    clearedRiskFlag: "In-transit dispatch risk cleared",
    channel: "WhatsApp",
  },
];
const vendorEventListeners: Set<() => void> = new Set();
const vendorTelemetryListeners: Set<() => void> = new Set();

function notifyVendorEvents() {
  vendorEventListeners.forEach((l) => l());
}
function notifyVendorTelemetry() {
  vendorTelemetryListeners.forEach((l) => l());
}

export function logVendorAction(evt: Omit<VendorActionEvent, "id" | "when"> & { when?: string }) {
  VENDOR_EVENTS.unshift({
    id: `VE-${Date.now().toString(36).toUpperCase()}`,
    when: evt.when ?? new Date().toISOString(),
    ...evt,
  });
  notifyVendorEvents();
}

export function getVendorActionEvents(): VendorActionEvent[] {
  return VENDOR_EVENTS;
}

export function useVendorActionEvents(): VendorActionEvent[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    vendorEventListeners.add(l);
    return () => {
      vendorEventListeners.delete(l);
    };
  }, []);
  return VENDOR_EVENTS;
}

function formatIstStamp(d: Date): string {
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return `${date}, ${time} IST`;
}

const ACTION_KIND: Record<VendorActionTelemetry["actionType"], VendorActionEvent["kind"]> = {
  "Acknowledged & Stopped": "acknowledge",
  "Reconciled Statement": "reconcile",
  Disputed: "dispute",
  Snoozed: "snooze",
};

/** Central vendor-action recorder. Writes to telemetry + the vendor event feed. */
export function recordVendorAction(
  input: Omit<VendorActionTelemetry, "id" | "timestamp"> & { timestamp?: string },
): VendorActionTelemetry {
  const entry: VendorActionTelemetry = {
    id: `VT-${Date.now().toString(36).toUpperCase()}`,
    timestamp: input.timestamp ?? formatIstStamp(new Date()),
    vendorName: input.vendorName,
    vendorId: input.vendorId,
    templateId: input.templateId,
    templateName: input.templateName,
    campaignId: input.campaignId,
    poInvoiceNo: input.poInvoiceNo,
    actionType: input.actionType,
    statusTransition: input.statusTransition,
    clearedRiskFlag: input.clearedRiskFlag,
    channel: input.channel,
  };
  VENDOR_TELEMETRY.unshift(entry);
  notifyVendorTelemetry();

  logVendorAction({
    vendorName: input.vendorName,
    poNumber: input.poInvoiceNo.replace(/^\D+/, ""),
    kind: ACTION_KIND[input.actionType],
    text: `Vendor ${input.vendorName} — ${input.actionType} on ${input.poInvoiceNo} (${input.channel})`,
  });

  return entry;
}

export function getVendorTelemetry(): VendorActionTelemetry[] {
  return VENDOR_TELEMETRY;
}

export function useVendorTelemetry(): VendorActionTelemetry[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    vendorTelemetryListeners.add(l);
    return () => {
      vendorTelemetryListeners.delete(l);
    };
  }, []);
  return VENDOR_TELEMETRY;
}




function seedPublishLogs(): PublishLog[] {
  return [
    {
      id: "PUB-2003",
      requestId: "REQ-1003",
      templateId: "APOLLO-9E5B22",
      templateName: "Payment on Hold — Invoice Rejection",
      segment: "Tech Enabled Vendors",
      scheduledFor: "18 Jul 2026, 09:00 AM",
      submitterName: "Nikhil Rao",
      publishedAt: iso(120),
      status: "Pending Review",
    },
    {
      id: "PUB-2002",
      requestId: "REQ-SEED-A",
      templateId: "APOLLO-8410F2",
      templateName: "Fill Rate Weekly Digest — North",
      segment: "Tech Enabled Vendors",
      scheduledFor: "16 Jul 2026, 10:30 AM",
      submitterName: "Rahul Deshmukh",
      publishedAt: iso(600),
      status: "Acknowledged",
    },
    {
      id: "PUB-2001",
      requestId: "REQ-SEED-B",
      templateId: "APOLLO-77BC09",
      templateName: "Weekend PO Reminder — Bulk",
      segment: "All vendors",
      scheduledFor: "14 Jul 2026, 08:00 AM",
      submitterName: "Priya Nair",
      publishedAt: iso(2400),
      status: "Flagged",
      flagReason:
        "Overlaps with the daily PO reminder already going out — please consolidate.",
      flagCategory: "Clubbing Conflict",
      flaggedAt: "14 Jul 2026, 11:20 AM",
    },
  ];
}

// -------- Campaigns (auto-created when Approver acknowledges a publish log) --------

export type CampaignStatus =
  | "Running"
  | "Paused"
  | "Scheduled"
  | "Pending approval"
  | "Failing"
  | "Completed";

export type CampaignChannel = "Email" | "WhatsApp" | "Dashboard";

export interface Campaign {
  id: string;
  requestId: string;
  templateId: string;
  name: string;
  categoryId: CategoryId;
  priority: PriorityLevel;
  purpose: string;
  commType?: CommTypeOption;
  channels: CampaignChannel[];
  segment: string;
  audienceCount: number;
  triggerType: "One time" | "Recurring";
  frequency: FrequencyOption;
  reminders: number;
  status: CampaignStatus;
  attachment: AttachmentOption;
  cta: CtaOption;
  ctaDestination?: string;
  formulaFlags: string[];
  whatsappMessage?: string;
  approvedBy: string;
  acknowledgedAt: string;
  firstSend: string;
  submitterName: string;
  requestApprovedAt?: string;
  publishedAt: string;
  failureNote?: string;
  sensitivity?: "FYI" | "Standard" | "Critical";
  extraVendorIds?: string[];
  lastEditedAt?: string;
  goalCompletedCount?: number;
  goalTarget?: number;
}

const AUDIENCE_BY_SEGMENT: Record<string, number> = {
  "Tech Enabled Vendors": 1240,
  "Low Tech Vendors": 640,
  "All vendors": 3880,
};

function audienceFor(segment: string): number {
  return AUDIENCE_BY_SEGMENT[segment] ?? 1000;
}

function remindersFor(priority: PriorityLevel): number {
  return priority === "P1" ? 2 : priority === "P2" ? 1 : 0;
}

function computeCampaignStatus(
  isOnce: boolean,
  scheduledFor: string,
): CampaignStatus {
  if (!isOnce) return "Running";
  const parsed = Date.parse(scheduledFor.replace(",", ""));
  if (Number.isNaN(parsed)) return "Scheduled";
  return parsed <= Date.now() ? "Running" : "Scheduled";
}


export function deriveCampaign(
  req: TemplateRequest,
  log: PublishLog,
  ackAt: string,
  overrides: Partial<Campaign> = {},
): Campaign {
  const channels: CampaignChannel[] = ["Email"];
  if (req.whatsapp) channels.push("WhatsApp");
  channels.push("Dashboard");
  const freq: FrequencyOption = req.frequency ?? "Once";
  const isOnce = freq === "Once";
  return {
    id: `CMP-${log.id.replace(/^PUB-/, "")}`,
    requestId: req.id,
    templateId: log.templateId,
    name: req.templateName,
    categoryId: req.categoryId,
    priority: req.priority,
    purpose: req.purpose,
    commType: req.commType,
    channels,
    segment: log.segment,
    audienceCount: audienceFor(log.segment),
    triggerType: isOnce ? "One time" : "Recurring",
    frequency: freq,
    reminders: remindersFor(req.priority),
    status: computeCampaignStatus(isOnce, log.scheduledFor),
    attachment: req.attachment,
    cta: req.cta,
    ctaDestination: req.ctaDestination,
    formulaFlags: req.formulaFlags,
    whatsappMessage: req.whatsapp?.message,
    approvedBy: "Aisha Khan",
    acknowledgedAt: ackAt,
    firstSend: log.scheduledFor,
    submitterName: log.submitterName,
    requestApprovedAt: req.approvedAt,
    publishedAt: log.publishedAt,
    ...overrides,
  };
}

let CAMPAIGNS: Campaign[] =
  g.__PB_CAMPAIGNS ?? (g.__PB_CAMPAIGNS = seedCampaigns());
const campaignListeners: Set<() => void> =
  g.__PB_CMP_LISTENERS ?? (g.__PB_CMP_LISTENERS = new Set());
function emitCampaigns() {
  campaignListeners.forEach((l) => l());
}
function setCampaigns(next: Campaign[]) {
  CAMPAIGNS = next;
  g.__PB_CAMPAIGNS = next;
  writeStoredArray(STORAGE_KEYS.campaigns, next);
  emitCampaigns();
}


export function getCampaigns(): Campaign[] {
  hydrateStoreFromStorage();
  return CAMPAIGNS;
}

export function addCampaign(c: Campaign) {
  hydrateStoreFromStorage();
  if (CAMPAIGNS.some((existing) => existing.id === c.id)) return;
  const withGoal: Campaign = {
    ...c,
    goalCompletedCount: c.goalCompletedCount ?? 0,
    goalTarget: c.goalTarget ?? c.audienceCount,
  };
  setCampaigns([withGoal, ...CAMPAIGNS]);
  // Fan-out: auto-mint a matching vendor notification card on PartnersBiz.
  syncCampaignToNotifications(withGoal);
}

export function updateCampaign(id: string, patch: Partial<Campaign>) {
  hydrateStoreFromStorage();
  const next = CAMPAIGNS.map((c) =>
    c.id === id ? { ...c, ...patch, lastEditedAt: new Date().toISOString() } : c,
  );
  setCampaigns(next);
}

export function updateCampaignStatus(id: string, status: CampaignStatus) {
  updateCampaign(id, { status });
}

export function incrementCampaignGoal(id: string, delta = 1) {
  hydrateStoreFromStorage();
  const next = CAMPAIGNS.map((c) =>
    c.id === id
      ? {
          ...c,
          goalCompletedCount: (c.goalCompletedCount ?? 0) + delta,
        }
      : c,
  );
  setCampaigns(next);
}


export function useCampaigns(): Campaign[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    campaignListeners.add(l);
    hydrateStoreFromStorage();
    return () => {
      campaignListeners.delete(l);
    };
  }, []);
  return CAMPAIGNS;
}

function seedCampaigns(): Campaign[] {
  const list: Campaign[] = [];

  const reqA = REQUESTS.find((r) => r.id === "REQ-SEED-A");
  const logA = PUBLISH_LOGS.find((l) => l.id === "PUB-2002");
  if (reqA && logA) {
    list.push(
      deriveCampaign(reqA, logA, "16 Jul 2026, 11:05 AM", {
        status: "Running",
      }),
    );
  }

  list.push({
    id: "CMP-1901",
    requestId: "REQ-CMP-COMPLETED",
    templateId: "APOLLO-5511AB",
    name: "Appointment Slot Confirmation — South",
    categoryId: "daily_ops",
    priority: "P2",
    purpose:
      "Confirm booked inbound appointment slots for South zone vendors each morning.",
    commType: "High frequency",
    channels: ["Email", "Dashboard"],
    segment: "Tech Enabled Vendors",
    audienceCount: 880,
    triggerType: "Recurring",
    frequency: "Daily Digest",
    reminders: 0,
    status: "Completed",
    attachment: "None",
    cta: "Direct Link",
    ctaDestination: "https://partnersbiz.blinkit.com/appointments",
    formulaFlags: ["None"],
    approvedBy: "Aisha Khan",
    acknowledgedAt: "01 Jul 2026, 09:15 AM",
    firstSend: "02 Jul 2026, 07:00 AM",
    submitterName: "Rahul Deshmukh",
    requestApprovedAt: "30 Jun 2026, 05:40 PM",
    publishedAt: iso(20160),
  });

  list.push({
    id: "CMP-1902",
    requestId: "REQ-CMP-FAILING",
    templateId: "APOLLO-77E3D1",
    name: "GST Filing Reminder — Q2",
    categoryId: "reminders",
    priority: "P2",
    purpose:
      "Remind vendors about the upcoming Q2 GST filing deadline via email and WhatsApp.",
    commType: "Pre emptive",
    channels: ["Email", "WhatsApp", "Dashboard"],
    segment: "All vendors",
    audienceCount: 3880,
    triggerType: "One time",
    frequency: "Once",
    reminders: 1,
    status: "Failing",
    attachment: "PDF",
    cta: "Direct Link",
    ctaDestination: "https://partnersbiz.blinkit.com/gst",
    formulaFlags: ["None"],
    whatsappMessage:
      "Reminder: Q2 GST filing is due on 20 Jul. Upload your invoices on PartnersBiz to avoid penalty.",
    approvedBy: "Aisha Khan",
    acknowledgedAt: "17 Jul 2026, 02:30 PM",
    firstSend: "18 Jul 2026, 09:00 AM",
    submitterName: "Nikhil Rao",
    requestApprovedAt: "17 Jul 2026, 01:10 PM",
    publishedAt: iso(720),
    failureNote:
      "3 WhatsApp deliveries bounced (invalid numbers). Retry queued.",
  });

  list.push({
    id: "CMP-1903",
    requestId: "REQ-CMP-WA",
    templateId: "APOLLO-3320CD",
    name: "Weekend Store Closure Alert",
    categoryId: "daily_ops",
    priority: "P2",
    purpose:
      "One-off WhatsApp alert to Low Tech vendors about weekend DC closure windows.",
    commType: "High frequency",
    channels: ["WhatsApp"],
    segment: "Low Tech Vendors",
    audienceCount: 640,
    triggerType: "One time",
    frequency: "Once",
    reminders: 1,
    status: "Scheduled",
    attachment: "None",
    cta: "None",
    formulaFlags: ["None"],
    whatsappMessage:
      "Heads up: Sector 63 DC will be closed this Sunday (20 Jul). Please reschedule inbound appointments via PartnersBiz.",
    approvedBy: "Aisha Khan",
    acknowledgedAt: "18 Jul 2026, 04:10 PM",
    firstSend: "19 Jul 2026, 08:00 AM",
    submitterName: "Priya Nair",
    requestApprovedAt: "18 Jul 2026, 03:30 PM",
    publishedAt: iso(300),
  });

  list.push({
    id: "CMP-1904",
    requestId: "REQ-CMP-PENDING",
    templateId: "APOLLO-6644EE",
    name: "MoM Spend Report — July Cohort",
    categoryId: "reports_analytics",
    priority: "P3",
    purpose:
      "Monthly spend digest with Excel attachment, currently awaiting Approver acknowledgement.",
    commType: "Periodic",
    channels: ["Email", "Dashboard"],
    segment: "Tech Enabled Vendors",
    audienceCount: 1240,
    triggerType: "Recurring",
    frequency: "Monthly",
    reminders: 0,
    status: "Pending approval",
    attachment: "Excel Export",
    cta: "Direct Link",
    ctaDestination: "https://partnersbiz.blinkit.com/reports/spend",
    formulaFlags: ["None"],
    approvedBy: "—",
    acknowledgedAt: "Awaiting acknowledgement",
    firstSend: "22 Jul 2026, 09:00 AM",
    submitterName: "Rahul Deshmukh",
    requestApprovedAt: "17 Jul 2026, 06:00 PM",
    publishedAt: iso(60),
  });

  return list;
}

// -------- Action Deck (PartnersBiz vendor-facing action items) --------

export type ActionItemStatus = "pending" | "accepted" | "disputed" | "snoozed";

export interface ActionItem {
  id: string;
  poInvoiceNo: string;
  title: string;
  category: string;
  amountDue: string;
  dueHours: number;
  status: ActionItemStatus;
  vendorName?: string;
  attachmentName?: string;
}

let ACTIONS: ActionItem[] =
  g.__PB_ACTIONS ?? (g.__PB_ACTIONS = seedActionItems());
const actionListeners: Set<() => void> =
  g.__PB_ACT_LISTENERS ?? (g.__PB_ACT_LISTENERS = new Set());
function emitActions() {
  actionListeners.forEach((l) => l());
}
function setActions(next: ActionItem[]) {
  ACTIONS = next;
  g.__PB_ACTIONS = next;
  writeStoredArray(STORAGE_KEYS.actions, next);
  emitActions();
}

export function getActionItems(): ActionItem[] {
  hydrateStoreFromStorage();
  return ACTIONS;
}

export function useActionItems(): ActionItem[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    actionListeners.add(l);
    hydrateStoreFromStorage();
    return () => {
      actionListeners.delete(l);
    };
  }, []);
  return ACTIONS;
}

export function resolveActionItem(
  id: string,
  action: "accept" | "dispute" | "snooze",
): void {
  hydrateStoreFromStorage();
  const nextStatus: ActionItemStatus =
    action === "accept"
      ? "accepted"
      : action === "dispute"
        ? "disputed"
        : "snoozed";
  setActions(
    ACTIONS.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)),
  );
}

function seedActionItems(): ActionItem[] {
  return [
    {
      id: "ACT-5001",
      poInvoiceNo: "INV-KF-88214",
      title: "Invoice mismatch — GRN vs invoice value",
      category: "Finance & Payments",
      amountDue: "₹1,42,860",
      dueHours: 12,
      status: "pending",
      vendorName: "Kwality Foods",
      attachmentName: "grn_diff_kf_88214.pdf",
    },
    {
      id: "ACT-5002",
      poInvoiceNo: "PO-KF-77120",
      title: "PO cancellation — please stop dispatch",
      category: "Action Required",
      amountDue: "—",
      dueHours: 4,
      status: "pending",
      vendorName: "Kwality Foods",
    },
    {
      id: "ACT-5003",
      poInvoiceNo: "INV-DF-22019",
      title: "Debit note raised for short supply",
      category: "Finance & Payments",
      amountDue: "₹38,420",
      dueHours: 36,
      status: "pending",
      vendorName: "Dairy Fresh Pvt Ltd",
      attachmentName: "debit_note_22019.pdf",
    },
    {
      id: "ACT-5004",
      poInvoiceNo: "APT-99881",
      title: "Missed appointment slot — reschedule required",
      category: "Operations & Appointments",
      amountDue: "—",
      dueHours: 24,
      status: "pending",
      vendorName: "Aashirvaad Supplies",
    },
    {
      id: "ACT-5005",
      poInvoiceNo: "INV-KF-88101",
      title: "Payment on hold — resubmit tax invoice",
      category: "Finance & Payments",
      amountDue: "₹2,04,750",
      dueHours: 48,
      status: "pending",
      vendorName: "Kwality Foods",
      attachmentName: "tax_invoice_hold.pdf",
    },
    {
      id: "ACT-5006",
      poInvoiceNo: "INV-BB-55921",
      title: "GST credit note pending acceptance",
      category: "Finance & Payments",
      amountDue: "₹56,300",
      dueHours: 8,
      status: "pending",
      vendorName: "Britannia Bakers",
      attachmentName: "credit_note_55921.pdf",
    },
    {
      id: "ACT-5007",
      poInvoiceNo: "PO-AS-64410",
      title: "Price mismatch on PO — confirm revised rate",
      category: "Action Required",
      amountDue: "₹87,120",
      dueHours: 6,
      status: "pending",
      vendorName: "Aashirvaad Supplies",
      attachmentName: "po_revision_64410.pdf",
    },
    {
      id: "ACT-5008",
      poInvoiceNo: "INV-DF-22044",
      title: "TDS deduction dispute — reconcile now",
      category: "Finance & Payments",
      amountDue: "₹19,880",
      dueHours: 3,
      status: "pending",
      vendorName: "Dairy Fresh Pvt Ltd",
      attachmentName: "tds_recon_22044.pdf",
    },
    {
      id: "ACT-5009",
      poInvoiceNo: "PO-KF-77140",
      title: "Urgent quantity revision — acknowledge",
      category: "Action Required",
      amountDue: "—",
      dueHours: 10,
      status: "pending",
      vendorName: "Kwality Foods",
    },
  ];
}


export function nowStamp(): string {
  const d = new Date();
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeWaiting(fromISO: string): string {
  const then = new Date(fromISO).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

export const COMM_TYPE_TO_CATEGORY: Record<CommTypeOption, CategoryId> = {
  Financial: "finance_payments",
  Periodic: "reports_analytics",
  "High frequency": "daily_ops",
  "Pre emptive": "reminders",
  Security: "account_access",
};

export const CATEGORY_PRIORITY: Record<CategoryId, PriorityLevel> = {
  action_required: "P1",
  finance_payments: "P1",
  reports_analytics: "P3",
  daily_ops: "P2",
  reminders: "P2",
  account_access: "P1",
};

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60000).toISOString();
}

function seed(): TemplateRequest[] {
  return [
    {
      id: "REQ-1001",
      requestType: "Template Approval",
      templateId: "APOLLO-4A2F91",
      templateName: "PO Cancellation Alert — Kolkata K4",
      primaryEmail: "priya.n@zomato.com",
      mailOwner: "priya.n@zomato.com",
      approvalCcEmails: ["ops-north@zomato.com"],
      team: "Supply Chain",
      purpose:
        "Alert vendors when their PO gets cancelled at short notice so they can stop dispatch.",
      sentTo: ["Tech Enabled Vendors", "Low Tech Vendors"],
      emailAttachmentsName: "po_cancel_v3.pdf",
      vendorListName: "vendors_kolkata.csv",
      manufacturerListName: "mfrs_north.csv",
      subject: "Urgent: PO Cancellation for your dispatch",
      formulaFlags: ["Table in Body"],
      subCategory: "Defect Flow Communications",
      domain: "Operations & Appointments",
      categoryId: "action_required",
      priority: "P1",
      attachment: "PDF",
      cta: "Autofilled Help & Support Ticket",
      frequency: "Once",
      analystPoc: "@meera.s",
      sequenceTier: "Critical",
      whatsapp: {
        message:
          "Your PO has been cancelled. Please stop dispatch immediately. Contact your CM for details.",
        frequency: ["Once"],
        cta: "https://partnersbiz.blinkit.com/po",
      },
      scheduleDeadline: "2026-08-15T09:30",
      status: "Pending",
      submittedBy: "Priya Nair",
      submittedAt: iso(35),
    },
    {
      id: "REQ-1002",
      requestType: "Template Approval",
      templateId: "APOLLO-7C1D08",
      templateName: "Weekly Fill Rate Scorecard",
      primaryEmail: "rahul.d@zomato.com",
      mailOwner: "rahul.d@zomato.com",
      approvalCcEmails: [],
      team: "Analytics",
      purpose: "Share weekly fill rate performance with vendor supply chain leads.",
      sentTo: ["Tech Enabled Vendors"],
      emailAttachmentsName: "fillrate_wk28.xlsx",
      vendorListName: "vendors_all.csv",
      manufacturerListName: "mfrs_all.csv",
      subject: "Your Weekly Fill Rate Scorecard is ready",
      formulaFlags: ["Formula Attachment"],
      subCategory: "Reports",
      domain: "Operations & Appointments",
      commType: "Periodic",
      categoryId: "reports_analytics",
      priority: "P3",
      attachment: "Excel Export",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/reports/fill-rate",
      frequency: "Weekly",
      sequenceTier: "Standard",
      scheduleDeadline: "2026-08-15T09:30",
      analystPoc: "analyst@grofers.com",
      status: "Pending",
      submittedBy: "Rahul Deshmukh",
      submittedAt: iso(180),
    },
    {
      id: "REQ-1003",
      requestType: "Template Approval",
      templateId: "APOLLO-9E5B22",
      templateName: "Payment on Hold — Invoice Rejection",
      primaryEmail: "finance-comms@zomato.com",
      mailOwner: "finance-comms@zomato.com",
      approvalCcEmails: [],
      team: "Finance",
      analystPoc: "analyst@grofers.com",
      scheduleDeadline: "2026-08-15T09:30",
      purpose:
        "Notify vendors when payment is placed on hold due to invoice mismatch.",
      sentTo: ["Tech Enabled Vendors"],
      emailAttachmentsName: "invoice_ref.pdf",
      vendorListName: "vendors_finance.csv",
      manufacturerListName: "mfrs_finance.csv",
      subject: "Action needed: Payment on hold for {{po_number}}",
      body:
        "Hi {{vendor_name}}, invoice against {{po_number}} of {{amount_due}} is on hold pending debit-note reconciliation. Please respond by {{due_date}} to release payment.",
      inlineSqlChart: "invoice_hold_ageing_by_vendor.sql",
      formulaFlags: ["None"],
      subCategory: "Defect Flow Communications",
      domain: "Finance & Payments",
      categoryId: "action_required",
      priority: "P1",
      attachment: "PDF",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/invoices",
      frequency: "Once",
      sequenceTier: "Critical",
      status: "Approved",
      submittedBy: "Nikhil Rao",
      submittedAt: iso(1440),
      approvedAt: "12 Jul 2026, 04:20 PM",
    },
    {
      id: "REQ-1004",
      requestType: "Template Approval",
      templateId: "APOLLO-2B8410",
      templateName: "Near-Expiry PO Reminder",
      primaryEmail: "priya.n@zomato.com",
      mailOwner: "priya.n@zomato.com",
      approvalCcEmails: [],
      team: "Supply Chain",
      purpose: "Remind vendors of POs approaching expiry within 48 hours.",
      sentTo: ["Tech Enabled Vendors"],
      emailAttachmentsName: "reminder.pdf",
      vendorListName: "vendors_expiring.csv",
      manufacturerListName: "mfrs_all.csv",
      subject: "Reminder: PO expiring soon",
      formulaFlags: ["None"],
      subCategory: "Announcements",
      domain: "Operations & Appointments",
      commType: "Pre emptive",
      categoryId: "reminders",
      priority: "P2",
      attachment: "None",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/po",
      frequency: "Daily Digest",
      sequenceTier: "Standard",
      scheduleDeadline: "2026-08-15T09:30",
      analystPoc: "analyst@grofers.com",
      status: "Rejected",
      submittedBy: "Priya Nair",
      submittedAt: iso(2880),
      rejectedAt: "11 Jul 2026, 10:05 AM",
      rejectionReason:
        "Duplicate of existing daily reminder template — please consolidate with APOLLO-1120AA before resubmitting.",
      rejectionCategory: "Clubbing Conflict",
    },
    {
      id: "REQ-1005",
      requestType: "Template Approval",
      templateId: "APOLLO-6F30C7",
      templateName: "OTP for Vendor Portal Login",
      primaryEmail: "security@zomato.com",
      approvalCcEmails: [],
      team: "Security",
      purpose: "Send login OTP to vendor portal users.",
      sentTo: ["Tech Enabled Vendors", "Low Tech Vendors"],
      emailAttachmentsName: "-",
      vendorListName: "vendors_all.csv",
      manufacturerListName: "-",
      subject: "Your Blinkit Vendor Portal OTP",
      formulaFlags: ["None"],
      commType: "Security",
      categoryId: "account_access",
      priority: "P1",
      attachment: "None",
      cta: "None",
      frequency: "Once",
      sequenceTier: "Critical",
      whatsapp: {
        message: "Your Blinkit Vendor Portal OTP is {{otp}}. Do not share with anyone.",
        frequency: "Once",
        cta: "+911800-000-000",
      },
      status: "Pending",
      submittedBy: "Kavya Menon",
      submittedAt: iso(12),
    },
    {
      id: "REQ-SEED-A",
      requestType: "Template Approval",
      templateId: "APOLLO-8410F2",
      templateName: "Fill Rate Weekly Digest — North",
      primaryEmail: "rahul.d@zomato.com",
      approvalCcEmails: [],
      team: "Analytics",
      purpose: "Weekly fill rate digest for North region vendors.",
      sentTo: ["Tech Enabled Vendors"],
      emailAttachmentsName: "fillrate_north.xlsx",
      vendorListName: "vendors_north.csv",
      manufacturerListName: "-",
      subject: "Your weekly fill rate digest — {{vendor_name}}",
      body:
        "Hi {{vendor_name}}, your weekly fill rate scorecard is attached. Trend chart below highlights top defect SKUs. Review by {{due_date}}.",
      inlineSqlChart: "fill_rate_trend_by_vendor.sql",
      formulaFlags: ["Formula Attachment"],
      subCategory: "Reports",
      domain: "Operations & Appointments",
      commType: "Periodic",
      categoryId: "reports_analytics",
      priority: "P3",
      attachment: "Excel Export",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/reports/fill-rate",
      frequency: "Weekly",
      sequenceTier: "Standard",
      status: "Approved",
      submittedBy: "Rahul Deshmukh",
      submittedAt: iso(4320),
      approvedAt: "15 Jul 2026, 03:10 PM",
    },
    {
      id: "REQ-SEED-B",
      requestType: "Template Approval",
      templateId: "APOLLO-77BC09",
      templateName: "Weekend PO Reminder — Bulk",
      primaryEmail: "priya.n@zomato.com",
      mailOwner: "priya.n@zomato.com",
      approvalCcEmails: [],
      team: "Supply Chain",
      purpose: "Weekend bulk reminder for open POs across all vendors.",
      sentTo: ["Tech Enabled Vendors", "Low Tech Vendors"],
      emailAttachmentsName: "-",
      vendorListName: "vendors_all.csv",
      manufacturerListName: "-",
      subject: "Weekend PO Reminder",
      formulaFlags: ["None"],
      subCategory: "Announcements",
      domain: "Operations & Appointments",
      commType: "Pre emptive",
      categoryId: "reminders",
      priority: "P2",
      attachment: "None",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/po",
      frequency: "Once",
      sequenceTier: "Standard",
      scheduleDeadline: "2026-08-15T09:30",
      analystPoc: "analyst@grofers.com",
      status: "Rejected Post Publish",
      submittedBy: "Priya Nair",
      submittedAt: iso(5760),
      rejectedAt: "14 Jul 2026, 11:20 AM",
      rejectionReason:
        "Overlaps with the daily PO reminder already going out — please consolidate.",
      rejectionCategory: "Clubbing Conflict",
    },
  ];
}

// ============================================================================
// Workdesk ⇄ PartnersBiz synchronized notification feed
// When a campaign is launched (or a new comm is submitted) we mint a matching
// vendor-facing notification card. Vendor actions on that card flow back to
// the campaign via incrementCampaignGoal + recordVendorAction.
// ============================================================================

import type { AppNotification, NotificationAttachment, AttachmentType } from "./mock-data";

type SyncGlobal = { __PB_SYNC_NOTIFS?: AppNotification[]; __PB_SYNC_LISTENERS?: Set<() => void> };
const sg = globalThis as unknown as SyncGlobal;

const SYNC_STORAGE_KEY = "pbcc_synced_notifs_v1";

let SYNCED_NOTIFS: AppNotification[] =
  sg.__PB_SYNC_NOTIFS ?? (sg.__PB_SYNC_NOTIFS = []);
const syncListeners: Set<() => void> =
  sg.__PB_SYNC_LISTENERS ?? (sg.__PB_SYNC_LISTENERS = new Set());

function emitSync() {
  syncListeners.forEach((l) => l());
}

function persistSync() {
  writeStoredArray(SYNC_STORAGE_KEY, SYNCED_NOTIFS);
}

function hydrateSyncOnce() {
  if (typeof window === "undefined") return;
  const stored = readStoredArray<AppNotification>(SYNC_STORAGE_KEY);
  if (stored && stored.length && SYNCED_NOTIFS.length === 0) {
    SYNCED_NOTIFS = stored;
    sg.__PB_SYNC_NOTIFS = stored;
  }
}

function categoryToAudience(cat: CategoryId): AppNotification["audience"] {
  if (cat === "finance_payments") return "Finance";
  return "Supply Chain Manager";
}

function nowRelative(): string {
  return "Just now";
}

function nowShortStamp(): string {
  const d = new Date();
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

/** Idempotent: mints one synced notification per campaign id. */
export function syncCampaignToNotifications(c: Campaign): AppNotification | null {
  hydrateSyncOnce();
  if (SYNCED_NOTIFS.some((n) => n.linkedCampaignId === c.id)) return null;

  const audience = categoryToAudience(c.categoryId);
  const poField = c.categoryId === "finance_payments" ? "Invoice / Ref" : "PO / Ref";
  const refValue = c.templateId;

  const notif: AppNotification = {
    id: `SYNC-${c.id}`,
    category: c.categoryId,
    subCategory:
      c.categoryId === "action_required"
        ? "po_cancellation"
        : c.categoryId === "finance_payments"
          ? "rebate_reconciliation"
          : "general",
    subject: `${c.name} — ${c.segment}`,
    message: `${c.purpose} This communication was launched from Workdesk on ${nowShortStamp()} and is awaiting your action.`,
    timestamp: nowShortStamp(),
    relativeTime: nowRelative(),
    priority: c.priority,
    cta: c.categoryId === "action_required" || c.categoryId === "finance_payments"
      ? "view_details"
      : "view_details",
    read: false,
    expired: false,
    audience,
    detail: [
      { label: "Campaign", value: c.name },
      { label: "Template", value: c.templateId },
      { label: "Segment", value: c.segment },
      { label: "Audience", value: `${c.audienceCount} vendors` },
      { label: "Channels", value: c.channels.join(", ") },
      { label: poField, value: refValue },
    ],
    linkedCampaignId: c.id,
    linkedTemplateId: c.templateId,
    poInvoiceNo: c.templateId,
  };

  SYNCED_NOTIFS = [notif, ...SYNCED_NOTIFS];
  sg.__PB_SYNC_NOTIFS = SYNCED_NOTIFS;
  persistSync();
  emitSync();
  return notif;
}

export function getSyncedNotifications(): AppNotification[] {
  hydrateSyncOnce();
  return SYNCED_NOTIFS;
}

export function useSyncedNotifications(): AppNotification[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    hydrateSyncOnce();
    const l = () => setTick((t) => t + 1);
    syncListeners.add(l);
    return () => {
      syncListeners.delete(l);
    };
  }, []);
  return SYNCED_NOTIFS;
}

/**
 * Closed-loop acknowledgement from PartnersBiz → Workdesk.
 * - Bumps the linked campaign's goalCompletedCount by +1
 * - Records a VendorActionTelemetry entry with the exact stamped text
 * - Marks the synced notification as read
 */
export function acknowledgeVendorNotification(
  notification: AppNotification,
  opts: {
    vendorName?: string;
    vendorId?: string;
    poInvoiceNo?: string;
    actionType?: VendorActionTelemetry["actionType"];
    statusTransition?: string;
    clearedRiskFlag?: string;
    channel?: VendorActionTelemetry["channel"];
    eventText?: string;
  } = {},
): VendorActionTelemetry | null {
  const campaignId = notification.linkedCampaignId;
  if (!campaignId) return null;

  const campaign = CAMPAIGNS.find((c) => c.id === campaignId);
  incrementCampaignGoal(campaignId, 1);

  const vendorName = opts.vendorName ?? "ITC Limited";
  const poInvoice =
    opts.poInvoiceNo ??
    notification.poInvoiceNo ??
    notification.detail.find((d) => /po|invoice|ref/i.test(d.label))?.value ??
    notification.linkedTemplateId ??
    "";

  const actionType =
    opts.actionType ??
    (notification.category === "finance_payments"
      ? "Reconciled Statement"
      : "Acknowledged & Stopped");

  const entry = recordVendorAction({
    vendorName,
    vendorId: opts.vendorId ?? "M-4412",
    templateId: notification.linkedTemplateId ?? campaign?.templateId ?? "APOLLO-SYNC",
    templateName: campaign?.name ?? notification.subject,
    campaignId,
    poInvoiceNo: poInvoice,
    actionType,
    statusTransition:
      opts.statusTransition ??
      (actionType === "Reconciled Statement"
        ? "Pending Reconciliation ──► Reconciled"
        : "Pending Vendor Ack ──► Acknowledged & Stopped"),
    clearedRiskFlag:
      opts.clearedRiskFlag ??
      (actionType === "Reconciled Statement"
        ? "Financial discrepancy cleared"
        : "In-transit risk cleared"),
    channel: opts.channel ?? "PartnersBiz Portal",
  });

  // Human-readable audit line for the Workdesk telemetry drawer.
  if (opts.eventText) {
    logVendorAction({
      vendorName,
      poNumber: poInvoice.replace(/^\D+/, ""),
      kind: actionType === "Reconciled Statement" ? "reconcile" : "acknowledge",
      text: opts.eventText,
    });
  }

  // Mark the synced notification as read (if present in the sync feed).
  const idx = SYNCED_NOTIFS.findIndex((n) => n.id === notification.id);
  if (idx >= 0) {
    SYNCED_NOTIFS = SYNCED_NOTIFS.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    sg.__PB_SYNC_NOTIFS = SYNCED_NOTIFS;
    persistSync();
    emitSync();
  }

  return entry;
}

// ---------------------------------------------------------------------------
// Workdesk "Schedule Notification" → PartnersBiz card minting.
// Bridges the Add-New-Notification flow (which creates a PublishLog) directly
// into the vendor Notification Centre using the full TemplateRequest payload.
// ---------------------------------------------------------------------------

function hydrateBody(body: string): string {
  return body
    .replace(/{{\s*vendor_name\s*}}/g, "ITC Limited")
    .replace(/{{\s*po_number\s*}}/g, "PO #KF-77120")
    .replace(/{{\s*amount_due\s*}}/g, "₹2,11,340")
    .replace(/{{\s*due_date\s*}}/g, "31 Jul 2026");
}

function attachmentFromConfig(
  cfg?: AttachmentConfig,
  fallbackName?: string,
): NotificationAttachment | undefined {
  if (!cfg || cfg.type === "none") return undefined;
  const name =
    cfg.fileName ||
    cfg.queryKey ||
    cfg.s3Path ||
    fallbackName ||
    "attachment.pdf";
  const lower = name.toLowerCase();
  const type: AttachmentType =
    lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")
      ? "Excel Export"
      : lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "Image"
        : "PDF";
  return { label: name, type };
}

export function syncPublishToNotifications(
  log: PublishLog,
  req: TemplateRequest,
): AppNotification | null {
  hydrateSyncOnce();
  const id = `PUB-SYNC-${log.id}`;
  if (SYNCED_NOTIFS.some((n) => n.id === id)) return null;

  const audience = categoryToAudience(req.categoryId);
  const attachment = attachmentFromConfig(
    req.attachmentConfig,
    req.emailAttachmentsName,
  );

  const notif: AppNotification = {
    id,
    category: req.categoryId,
    subCategory:
      req.categoryId === "action_required"
        ? "po_cancellation"
        : req.categoryId === "finance_payments"
          ? "rebate_reconciliation"
          : "general",
    subject: req.subject,
    message: hydrateBody(req.body ?? req.purpose ?? ""),
    timestamp: nowShortStamp(),
    relativeTime: nowRelative(),
    priority: req.priority,
    cta:
      req.cta === "Autofilled Help & Support Ticket"
        ? "raise_ticket"
        : "view_details",
    read: false,
    expired: false,
    audience,
    detail: [
      { label: "Template", value: req.templateId },
      { label: "Segment", value: log.segment },
      { label: "Scheduled for", value: log.scheduledFor },
      { label: "Submitter", value: log.submitterName },
      ...(req.inlineSqlChart
        ? [{ label: "Inline chart", value: req.inlineSqlChart }]
        : []),
    ],
    attachment,
    linkedTemplateId: req.templateId,
    poInvoiceNo: req.templateId,
  };

  SYNCED_NOTIFS = [notif, ...SYNCED_NOTIFS];
  sg.__PB_SYNC_NOTIFS = SYNCED_NOTIFS;
  persistSync();
  emitSync();
  return notif;
}

