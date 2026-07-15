export type Priority = "P1" | "P2" | "P3";
export type Channel = "Mail" | "Portal" | "Both";
export type CtaType = "view_details" | "raise_ticket";
export type EmployeeRole = "Supply Chain Manager" | "Finance" | "All Roles";

export type CategoryId =
  | "action_required"
  | "finance_payments"
  | "reports_analytics"
  | "daily_ops"
  | "reminders"
  | "account_access";

export interface SubCategory {
  id: string;
  label: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  color: "red" | "amber" | "green" | "blue" | "purple" | "grey";
  mandatory: boolean;
  digestEligible: boolean;
  subCategories: SubCategory[];
}

export const CATEGORIES: Category[] = [
  {
    id: "action_required",
    label: "Action Required",
    color: "red",
    mandatory: true,
    digestEligible: false,
    subCategories: [
      { id: "po_cancellation", label: "PO Cancellations" },
      { id: "asn_errors", label: "ASN Errors" },
    ],
  },
  {
    id: "finance_payments",
    label: "Finance & Payments",
    color: "amber",
    mandatory: true,
    digestEligible: false,
    subCategories: [
      { id: "rejected_invoices", label: "Rejected Invoices" },
      { id: "payment_on_hold", label: "Payment On Hold" },
    ],
  },
  {
    id: "reports_analytics",
    label: "Reports & Analytics",
    color: "green",
    mandatory: false,
    digestEligible: true,
    subCategories: [
      { id: "fill_rate", label: "Fill Rate Scorecard" },
      { id: "sales_reports", label: "Sales Reports" },
    ],
  },
  {
    id: "daily_ops",
    label: "Daily Ops Updates",
    color: "blue",
    mandatory: false,
    digestEligible: true,
    subCategories: [
      { id: "grn_updates", label: "GRN Updates" },
      { id: "stock_updates", label: "Stock on Hand" },
    ],
  },
  {
    id: "reminders",
    label: "Reminders",
    color: "purple",
    mandatory: false,
    digestEligible: false,
    subCategories: [
      { id: "near_expiry_po", label: "Near-Expiry POs" },
      { id: "pending_asn", label: "Pending ASN" },
    ],
  },
  {
    id: "account_access",
    label: "Account & Access",
    color: "grey",
    mandatory: true,
    digestEligible: false,
    subCategories: [
      { id: "login_otp", label: "Login & OTP" },
      { id: "role_changes", label: "Role Changes" },
    ],
  },
];

export interface DetailField {
  label: string;
  value: string;
}

export type AttachmentType = "PDF" | "Image" | "Excel Export";

export interface NotificationAttachment {
  label: string;
  type: AttachmentType;
}

export interface AppNotification {
  id: string;
  category: CategoryId;
  subCategory: string;
  subject: string;
  message: string;
  timestamp: string;
  relativeTime: string;
  priority: Priority;
  cta: CtaType;
  read: boolean;
  expired: boolean;
  audience: EmployeeRole;
  detail: DetailField[];
  attachment?: NotificationAttachment;
}

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    category: "action_required",
    subCategory: "po_cancellation",
    subject: "PO #2135610057771 cancelled — Kolkata K4 Feeder Warehouse",
    message:
      "The purchase order PO #2135610057771 for Kolkata K4 Feeder Warehouse has been cancelled by the buyer. No further ASN can be created against this PO. Please review any in-transit shipments and reconcile inventory.",
    timestamp: "13 Jul 2026, 09:12 AM",
    relativeTime: "22 min ago",
    priority: "P1",
    cta: "view_details",
    read: false,
    expired: false,
    audience: "Supply Chain Manager",
    detail: [
      { label: "PO Number", value: "2135610057771" },
      { label: "Facility", value: "Kolkata K4 Feeder Warehouse" },
      { label: "Cancelled By", value: "Buyer Ops (MASKED)" },
      { label: "PO Quantity", value: "142 units" },
      { label: "Order Date", value: "10/07/2026" },
      { label: "Status", value: "CANCELLED" },
    ],
  },
  {
    id: "n2",
    category: "finance_payments",
    subCategory: "rejected_invoices",
    subject: "Invoice INV-88213 rejected — GSTIN typo on Row 3",
    message:
      "Your invoice INV-88213 was rejected during validation. Reason: GSTIN mismatch on line item Row 3. Please correct the GSTIN and re-upload the invoice to avoid payment delays.",
    timestamp: "13 Jul 2026, 08:40 AM",
    relativeTime: "54 min ago",
    priority: "P1",
    cta: "raise_ticket",
    read: false,
    expired: false,
    audience: "Finance",
    detail: [
      { label: "Invoice ID", value: "INV-88213" },
      { label: "Rejection Reason", value: "GSTIN typo on Row 3" },
      { label: "Invoice Value", value: "₹4,21,900" },
      { label: "GRN Date", value: "02/07/2026" },
      { label: "Facility", value: "Faridabad — Feeder Warehouse" },
      { label: "Status", value: "REJECTED" },
    ],
  },
  {
    id: "n3",
    category: "finance_payments",
    subCategory: "payment_on_hold",
    subject: "Payment on hold — ₹2.11L pending debit note resolution",
    message:
      "A payment of ₹2,11,400 is currently on hold pending resolution of debit note DN-4521. Please review the debit note and confirm acceptance to release the payment.",
    timestamp: "12 Jul 2026, 04:20 PM",
    relativeTime: "17 hrs ago",
    priority: "P2",
    cta: "view_details",
    read: false,
    expired: false,
    audience: "Finance",
    detail: [
      { label: "Debit Note", value: "DN-4521" },
      { label: "Amount On Hold", value: "₹2,11,400" },
      { label: "Raised On", value: "11/07/2026" },
      { label: "Status", value: "ON HOLD" },
    ],
  },
  {
    id: "n4",
    category: "reports_analytics",
    subCategory: "fill_rate",
    subject: "Your Week 27 Fill Rate Score is ready",
    message:
      "Your Week 27 Fill Rate Scorecard has been published. Overall fill rate: 94.2% (Grade A). Weighted fill rate improved 1.8% week-on-week. Tap to view the full category breakdown.",
    timestamp: "13 Jul 2026, 06:00 AM",
    relativeTime: "3 hrs ago",
    priority: "P2",
    cta: "view_details",
    read: true,
    expired: false,
    audience: "Supply Chain Manager",
    detail: [
      { label: "Report Week", value: "Week 27, 2026" },
      { label: "Current Grade", value: "A" },
      { label: "Fill Rate", value: "94.2%" },
      { label: "Weighted Fill Rate", value: "92.6%" },
      { label: "Highest Rank in Category", value: "#3" },
    ],
    attachment: { label: "Fill Rate Scorecard W27.pdf", type: "PDF" },
  },
  {
    id: "n5",
    category: "reminders",
    subCategory: "near_expiry_po",
    subject: "PO #5383910053280 expires in 18 hours — not yet scheduled",
    message:
      "Reminder: PO #5383910053280 for Farukhnagar F2 will expire in 18 hours and has not been scheduled yet. Schedule an ASN now, or request a PO extension to avoid a fill-rate penalty.",
    timestamp: "13 Jul 2026, 07:15 AM",
    relativeTime: "2 hrs ago",
    priority: "P1",
    cta: "view_details",
    read: false,
    expired: false,
    audience: "Supply Chain Manager",
    detail: [
      { label: "PO Number", value: "5383910053280" },
      { label: "Facility", value: "Farukhnagar F2 — Feeder Warehouse" },
      { label: "Expires In", value: "18 hours" },
      { label: "PO Quantity", value: "96 units" },
      { label: "Status", value: "UNSCHEDULED" },
    ],
  },
  {
    id: "n6",
    category: "account_access",
    subCategory: "login_otp",
    subject: "Your PartnersBiz login OTP: 482913",
    message:
      "Use OTP 482913 to sign in to PartnersBiz. This code is valid for 10 minutes. If you did not request this, secure your account immediately and contact support.",
    timestamp: "13 Jul 2026, 09:30 AM",
    relativeTime: "4 min ago",
    priority: "P1",
    cta: "view_details",
    read: false,
    expired: false,
    audience: "All Roles",
    detail: [
      { label: "One-Time Password", value: "482913" },
      { label: "Valid For", value: "10 minutes" },
      { label: "Requested From", value: "Chrome · Bengaluru, IN" },
      { label: "Account", value: "himanshu.gupta@vendor.co" },
    ],
  },
  {
    id: "n7",
    category: "reports_analytics",
    subCategory: "sales_reports",
    subject: "June sales report generated — 557 unique products",
    message:
      "Your monthly sales report for June 2026 is ready. Total spend tracked: ₹1,60,03,209 across 557 unique products. Download the CSV for a full breakdown.",
    timestamp: "08 Jul 2026, 10:00 AM",
    relativeTime: "5 days ago",
    priority: "P3",
    cta: "view_details",
    read: true,
    expired: true,
    audience: "Finance",
    detail: [
      { label: "Report Month", value: "June 2026" },
      { label: "Total Spend", value: "₹1,60,03,209" },
      { label: "Unique Products", value: "557" },
    ],
    attachment: { label: "June sales report.csv", type: "Excel Export" },
  },
  {
    id: "n8",
    category: "daily_ops",
    subCategory: "grn_updates",
    subject: "12 invoices GRN'd today — Mumbai M10 Feeder Warehouse",
    message:
      "Daily ops update: 12 invoices were GRN'd today at Mumbai M10 Feeder Warehouse with a total value of ₹8.4L. No discrepancies flagged.",
    timestamp: "13 Jul 2026, 08:00 AM",
    relativeTime: "1 hr ago",
    priority: "P3",
    cta: "view_details",
    read: false,
    expired: false,
    audience: "Supply Chain Manager",
    detail: [
      { label: "Facility", value: "Mumbai M10 — Feeder Warehouse" },
      { label: "Invoices GRN'd", value: "12" },
      { label: "Total Value", value: "₹8,40,000" },
      { label: "Discrepancies", value: "0" },
    ],
  },
  {
    id: "n9",
    category: "reminders",
    subCategory: "pending_asn",
    subject: "3 POs awaiting ASN creation before EOD",
    message:
      "You have 3 confirmed POs that still need an ASN before end of day. Create ASNs now to keep your fill rate on track.",
    timestamp: "11 Jul 2026, 02:30 PM",
    relativeTime: "2 days ago",
    priority: "P2",
    cta: "view_details",
    read: true,
    expired: true,
    audience: "Supply Chain Manager",
    detail: [
      { label: "Pending POs", value: "3" },
      { label: "Deadline", value: "Today, 11:59 PM" },
    ],
  },
];

export interface EscalationRow {
  id: string;
  notification: string;
  vendor: string;
  priority: Priority;
  elapsed: string;
  elapsedMinutes: number;
  sla: "on_time" | "breached";
  ownerRole: string;
}

export const ESCALATION_QUEUE: EscalationRow[] = [
  {
    id: "e1",
    notification: "PO #2135610057771 cancelled — no vendor action",
    vendor: "ITC Limited",
    priority: "P1",
    elapsed: "3h 42m",
    elapsedMinutes: 222,
    sla: "breached",
    ownerRole: "Supply Chain Manager",
  },
  {
    id: "e2",
    notification: "Invoice INV-88213 rejected — unresolved",
    vendor: "Nestlé India",
    priority: "P1",
    elapsed: "4h 10m",
    elapsedMinutes: 250,
    sla: "breached",
    ownerRole: "Finance",
  },
  {
    id: "e3",
    notification: "PO #5383910053280 near expiry — unscheduled",
    vendor: "ITC Limited",
    priority: "P1",
    elapsed: "1h 05m",
    elapsedMinutes: 65,
    sla: "on_time",
    ownerRole: "Supply Chain Manager",
  },
  {
    id: "e4",
    notification: "Payment on hold escalation — DN-4521",
    vendor: "Hindustan Unilever",
    priority: "P1",
    elapsed: "5h 28m",
    elapsedMinutes: 328,
    sla: "breached",
    ownerRole: "Finance",
  },
  {
    id: "e5",
    notification: "ASN error batch rejected — GTIN mismatch",
    vendor: "Britannia",
    priority: "P1",
    elapsed: "0h 48m",
    elapsedMinutes: 48,
    sla: "on_time",
    ownerRole: "Supply Chain Manager",
  },
  {
    id: "e6",
    notification: "OTP delivery failure — repeated logins",
    vendor: "Dabur India",
    priority: "P1",
    elapsed: "2h 15m",
    elapsedMinutes: 135,
    sla: "breached",
    ownerRole: "Account Admin",
  },
];

export const colorClasses: Record<
  Category["color"],
  { text: string; soft: string; badge: string; dot: string }
> = {
  red: {
    text: "text-cat-red",
    soft: "bg-cat-red-soft",
    badge: "bg-cat-red-soft text-cat-red",
    dot: "bg-cat-red",
  },
  amber: {
    text: "text-cat-amber",
    soft: "bg-cat-amber-soft",
    badge: "bg-cat-amber-soft text-cat-amber",
    dot: "bg-cat-amber",
  },
  green: {
    text: "text-cat-green",
    soft: "bg-cat-green-soft",
    badge: "bg-cat-green-soft text-cat-green",
    dot: "bg-cat-green",
  },
  blue: {
    text: "text-cat-blue",
    soft: "bg-cat-blue-soft",
    badge: "bg-cat-blue-soft text-cat-blue",
    dot: "bg-cat-blue",
  },
  purple: {
    text: "text-cat-purple",
    soft: "bg-cat-purple-soft",
    badge: "bg-cat-purple-soft text-cat-purple",
    dot: "bg-cat-purple",
  },
  grey: {
    text: "text-cat-grey",
    soft: "bg-cat-grey-soft",
    badge: "bg-cat-grey-soft text-cat-grey",
    dot: "bg-cat-grey",
  },
};

export function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case "P1":
      return "bg-cat-red-soft text-cat-red";
    case "P2":
      return "bg-cat-amber-soft text-cat-amber";
    case "P3":
      return "bg-cat-grey-soft text-cat-grey";
  }
}
