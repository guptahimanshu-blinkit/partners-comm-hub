import type { CategoryId } from "./mock-data";

export interface CommItem {
  id: string;
  name: string;
  category: CategoryId;
  /** Preloaded default channel state so the UI doesn't look uniform. */
  defaults: { mail: boolean; whatsapp: boolean };
}

// Sample preload pattern per row index within each category:
// 0: Mail only, 1: Both, 2: WhatsApp only, 3: Mail only, 4: Both, ...
// Mandatory categories never emit (false,false) — Mail is locked on anyway.
function preload(i: number, mandatory: boolean): { mail: boolean; whatsapp: boolean } {
  const pattern = i % 5;
  switch (pattern) {
    case 0:
      return { mail: true, whatsapp: false };
    case 1:
      return { mail: true, whatsapp: true };
    case 2:
      return mandatory
        ? { mail: true, whatsapp: true }
        : { mail: false, whatsapp: true };
    case 3:
      return { mail: true, whatsapp: false };
    case 4:
      return { mail: true, whatsapp: true };
    default:
      return { mail: true, whatsapp: false };
  }
}

const RAW: Record<CategoryId, string[]> = {
  action_required: [
    "PO Cancellation",
    "PO Modification",
    "ASN Error — GTIN Mismatch",
    "ASN Error — Quantity Mismatch",
    "Invoice Rejected (Critical)",
    "Debit Note Issued",
    "Return Order Raised",
    "Quality Rejection at GRN",
    "Appointment Cancelled by Buyer",
    "Vendor Blocklist Alert",
  ],
  finance_payments: [
    "Payment Advice",
    "Payment On Hold",
    "TDS Certificate Available",
    "Invoice Approved",
    "Invoice Rejected",
    "Credit Note Issued",
    "Debit Note Reminder",
    "GST Reconciliation Alert",
    "MSME Payment Compliance",
    "Payment Cycle Update",
    "Bank Detail Change Confirmation",
    "Statement of Accounts",
  ],
  reports_analytics: [
    "Weekly Fill Rate Scorecard",
    "Monthly Sales Report",
    "SKU Performance Report",
    "Category Health Report",
    "On-Time Delivery Report",
    "Return Rate Report",
    "Stock Ageing Report",
    "GRN Discrepancy Report",
    "Quarterly Business Review",
    "YTD Vendor Scorecard",
  ],
  daily_ops: [
    "PO Mailer (Daily)",
    "GRN Confirmation",
    "ASN Acknowledgement",
    "Stock on Hand Refresh",
    "Appointment Confirmed",
    "Appointment Rescheduled",
    "Facility Onboarding Update",
    "New SKU Listing",
    "Price Change Notification",
    "Promo Live Alert",
    "Warehouse Cutoff Reminder",
    "Shipment Dispatched",
  ],
  reminders: [
    "Near-Expiry PO",
    "Pending ASN",
    "Pending Invoice Upload",
    "Pending KYC Renewal",
    "Contract Renewal Due",
    "Insurance Certificate Expiry",
    "GST Return Due",
    "Compliance Document Refresh",
  ],
  account_access: [
    "Login OTP",
    "Password Reset",
    "New User Added",
    "Role Changed",
    "Access Revoked",
    "Session Alert — New Device",
  ],
};

const MANDATORY_CATS: CategoryId[] = [
  "action_required",
  "finance_payments",
  "account_access",
];

function slug(cat: CategoryId, name: string) {
  return `${cat}__${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;
}

export const COMM_CATALOG: CommItem[] = (
  Object.entries(RAW) as [CategoryId, string[]][]
).flatMap(([cat, names]) => {
  const mandatory = MANDATORY_CATS.includes(cat);
  return names.map((name, i) => ({
    id: slug(cat, name),
    name,
    category: cat,
    defaults: preload(i, mandatory),
  }));
});

export function commsByCategory(category: CategoryId): CommItem[] {
  return COMM_CATALOG.filter((c) => c.category === category);
}
