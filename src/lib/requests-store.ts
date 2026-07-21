import { useEffect, useState } from "react";
import type { CategoryId } from "./mock-data";

export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Rejected Post Publish";
export type RequestType = "Template Approval";
export type PriorityLevel = "P1" | "P2" | "P3";
export type FrequencyOption = "Once" | "Daily" | "Weekly" | "Monthly";
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
  | "Wrong Category or Config"
  | "Clubbing Conflict"
  | "Missing Info"
  | "Compliance Concern";

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
  email: string;
  team: string[];
  slackPoc: string;
  purpose: string;
  sentTo: string[];
  emailAttachmentsName: string;
  vendorListName: string;
  manufacturerListName: string;
  subject: string;
  formulaFlags: string[];
  losesMoneyOrTime: "Yes" | "No";
  commType?: CommTypeOption;
  categoryId: CategoryId;
  priority: PriorityLevel;
  attachment: AttachmentOption;
  cta: CtaOption;
  ctaDestination?: string;
  frequency: FrequencyOption[];
  ccEmail?: string;
  analystPoc?: string;
  whatsapp?: WhatsAppDraft;
  status: RequestStatus;
  submittedBy: string;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  rejectionCategory?: RejectionCategory;
}

// Module-level store
let REQUESTS: TemplateRequest[] = seed();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getRequests(): TemplateRequest[] {
  return REQUESTS;
}

export function addRequest(r: TemplateRequest) {
  REQUESTS = [r, ...REQUESTS];
  emit();
}

export function approveRequest(id: string) {
  REQUESTS = REQUESTS.map((r) =>
    r.id === id
      ? { ...r, status: "Approved" as const, approvedAt: nowStamp() }
      : r,
  );
  emit();
}

export function rejectRequest(
  id: string,
  reason: string,
  category: RejectionCategory,
) {
  REQUESTS = REQUESTS.map((r) =>
    r.id === id
      ? {
          ...r,
          status: "Rejected" as const,
          rejectedAt: nowStamp(),
          rejectionReason: reason,
          rejectionCategory: category,
        }
      : r,
  );
  emit();
}

export function useRequests(): TemplateRequest[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
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

let PUBLISH_LOGS: PublishLog[] = seedPublishLogs();
const logListeners = new Set<() => void>();
function emitLogs() {
  logListeners.forEach((l) => l());
}

export function getPublishLogs(): PublishLog[] {
  return PUBLISH_LOGS;
}

export function addPublishLog(log: PublishLog) {
  PUBLISH_LOGS = [log, ...PUBLISH_LOGS];
  emitLogs();
}

export function acknowledgeLog(id: string) {
  PUBLISH_LOGS = PUBLISH_LOGS.map((l) =>
    l.id === id ? { ...l, status: "Acknowledged" as const } : l,
  );
  emitLogs();
}

export function flagLog(
  id: string,
  reason: string,
  category: RejectionCategory,
) {
  const log = PUBLISH_LOGS.find((l) => l.id === id);
  PUBLISH_LOGS = PUBLISH_LOGS.map((l) =>
    l.id === id
      ? {
          ...l,
          status: "Flagged" as const,
          flagReason: reason,
          flagCategory: category,
          flaggedAt: nowStamp(),
        }
      : l,
  );
  emitLogs();
  if (log) {
    REQUESTS = REQUESTS.map((r) =>
      r.id === log.requestId
        ? {
            ...r,
            status: "Rejected Post Publish" as const,
            rejectedAt: nowStamp(),
            rejectionReason: reason,
            rejectionCategory: category,
          }
        : r,
    );
    emit();
  }
}

export function usePublishLogs(): PublishLog[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    logListeners.add(l);
    return () => {
      logListeners.delete(l);
    };
  }, []);
  return PUBLISH_LOGS;
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
      email: "priya.n@zomato.com",
      team: ["Supply Chain", "Ops"],
      slackPoc: "@arjun.k",
      purpose:
        "Alert vendors when their PO gets cancelled at short notice so they can stop dispatch.",
      sentTo: ["Tech Enabled Vendors", "Low Tech Vendors"],
      emailAttachmentsName: "po_cancel_v3.pdf",
      vendorListName: "vendors_kolkata.csv",
      manufacturerListName: "mfrs_north.csv",
      subject: "Urgent: PO Cancellation for your dispatch",
      formulaFlags: ["Table in Body"],
      losesMoneyOrTime: "Yes",
      categoryId: "action_required",
      priority: "P1",
      attachment: "PDF",
      cta: "Autofilled Help & Support Ticket",
      frequency: ["Once"],
      ccEmail: "ops-north@zomato.com",
      analystPoc: "@meera.s",
      whatsapp: {
        message:
          "Your PO has been cancelled. Please stop dispatch immediately. Contact your CM for details.",
        frequency: ["Once"],
        cta: "https://partnersbiz.blinkit.com/po",
      },
      status: "Pending",
      submittedBy: "Priya Nair",
      submittedAt: iso(35),
    },
    {
      id: "REQ-1002",
      requestType: "Template Approval",
      templateId: "APOLLO-7C1D08",
      templateName: "Weekly Fill Rate Scorecard",
      email: "rahul.d@zomato.com",
      team: ["Analytics"],
      slackPoc: "@rahul.d",
      purpose: "Share weekly fill rate performance with vendor supply chain leads.",
      sentTo: ["Tech Enabled Vendors"],
      emailAttachmentsName: "fillrate_wk28.xlsx",
      vendorListName: "vendors_all.csv",
      manufacturerListName: "mfrs_all.csv",
      subject: "Your Weekly Fill Rate Scorecard is ready",
      formulaFlags: ["Formula Attachment"],
      losesMoneyOrTime: "No",
      commType: "Periodic",
      categoryId: "reports_analytics",
      priority: "P3",
      attachment: "Excel Export",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/reports/fill-rate",
      frequency: ["Weekly"],
      status: "Pending",
      submittedBy: "Rahul Deshmukh",
      submittedAt: iso(180),
    },
    {
      id: "REQ-1003",
      requestType: "Template Approval",
      templateId: "APOLLO-9E5B22",
      templateName: "Payment on Hold — Invoice Rejection",
      email: "finance-comms@zomato.com",
      team: ["Finance"],
      slackPoc: "@nikhil.r",
      purpose:
        "Notify vendors when payment is placed on hold due to invoice mismatch.",
      sentTo: ["Tech Enabled Vendors"],
      emailAttachmentsName: "invoice_ref.pdf",
      vendorListName: "vendors_finance.csv",
      manufacturerListName: "mfrs_finance.csv",
      subject: "Action needed: Payment on hold",
      formulaFlags: ["None"],
      losesMoneyOrTime: "Yes",
      categoryId: "action_required",
      priority: "P1",
      attachment: "PDF",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/invoices",
      frequency: ["Once"],
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
      email: "priya.n@zomato.com",
      team: ["Supply Chain"],
      slackPoc: "@arjun.k",
      purpose: "Remind vendors of POs approaching expiry within 48 hours.",
      sentTo: ["Tech Enabled Vendors"],
      emailAttachmentsName: "reminder.pdf",
      vendorListName: "vendors_expiring.csv",
      manufacturerListName: "mfrs_all.csv",
      subject: "Reminder: PO expiring soon",
      formulaFlags: ["None"],
      losesMoneyOrTime: "No",
      commType: "Pre emptive",
      categoryId: "reminders",
      priority: "P2",
      attachment: "None",
      cta: "Direct Link",
      ctaDestination: "https://partnersbiz.blinkit.com/po",
      frequency: ["Daily"],
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
      email: "security@zomato.com",
      team: ["Security"],
      slackPoc: "@kavya.m",
      purpose: "Send login OTP to vendor portal users.",
      sentTo: ["Tech Enabled Vendors", "Low Tech Vendors"],
      emailAttachmentsName: "-",
      vendorListName: "vendors_all.csv",
      manufacturerListName: "-",
      subject: "Your Blinkit Vendor Portal OTP",
      formulaFlags: ["None"],
      losesMoneyOrTime: "No",
      commType: "Security",
      categoryId: "account_access",
      priority: "P1",
      attachment: "None",
      cta: "None",
      frequency: ["Once"],
      whatsapp: {
        message: "Your Blinkit Vendor Portal OTP is {{otp}}. Do not share with anyone.",
        frequency: ["Once"],
        cta: "+911800-000-000",
      },
      status: "Pending",
      submittedBy: "Kavya Menon",
      submittedAt: iso(12),
    },
  ];
}
