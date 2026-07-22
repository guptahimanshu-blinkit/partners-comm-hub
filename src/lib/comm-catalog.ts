import type { CategoryId } from "./mock-data";

export interface CommItem {
  id: string;
  name: string;
  category: CategoryId;
  /** Preloaded default channel state so the UI doesn't look uniform. */
  defaults: { mail: boolean; whatsapp: boolean };
  /** This specific comm must always be delivered on Mail. */
  mandatory?: boolean;
  /** Whether this comm can be delivered on WhatsApp at all. */
  whatsappAvailable: boolean;
}

interface RawComm {
  name: string;
  mandatory?: boolean;
  whatsappAvailable?: boolean; // defaults true
}

// Sample data. Mandatory + WhatsApp availability are per comm, not per
// category. Every comm still sends on Mail.
const RAW: Record<CategoryId, RawComm[]> = {
  action_required: [
    { name: "PO Cancellation", mandatory: true },
    { name: "PO Modification" },
    { name: "ASN Error — GTIN Mismatch" },
    { name: "ASN Error — Quantity Mismatch" },
    { name: "Invoice Rejected (Critical)", mandatory: true },
    { name: "Debit Note Issued" },
    { name: "Return Order Raised" },
    { name: "Quality Rejection at GRN" },
    { name: "Appointment Cancelled by Buyer" },
    { name: "Vendor Blocklist Alert", mandatory: true, whatsappAvailable: false },
  ],
  finance_payments: [
    { name: "Payment Advice", mandatory: true },
    { name: "Payment On Hold" },
    { name: "TDS Certificate Available", mandatory: true, whatsappAvailable: false },
    { name: "Invoice Approved" },
    { name: "Invoice Rejected" },
    { name: "Credit Note Issued" },
    { name: "Debit Note Reminder" },
    { name: "GST Reconciliation Alert" },
    { name: "MSME Payment Compliance", mandatory: true },
    { name: "Payment Cycle Update" },
    { name: "Bank Detail Change Confirmation", whatsappAvailable: false },
    { name: "Statement of Accounts", whatsappAvailable: false },
  ],
  reports_analytics: [
    { name: "Weekly Fill Rate Scorecard", mandatory: true },
    { name: "Monthly Sales Report", whatsappAvailable: false },
    { name: "SKU Performance Report", whatsappAvailable: false },
    { name: "Category Health Report", whatsappAvailable: false },
    { name: "On-Time Delivery Report" },
    { name: "Return Rate Report" },
    { name: "Stock Ageing Report" },
    { name: "GRN Discrepancy Report", mandatory: true },
    { name: "Quarterly Business Review", whatsappAvailable: false },
    { name: "YTD Vendor Scorecard", mandatory: true },
  ],
  daily_ops: [
    { name: "PO Mailer (Daily)", mandatory: true },
    { name: "GRN Confirmation" },
    { name: "ASN Acknowledgement" },
    { name: "Stock on Hand Refresh", whatsappAvailable: false },
    { name: "Appointment Confirmed" },
    { name: "Appointment Rescheduled" },
    { name: "Facility Onboarding Update", whatsappAvailable: false },
    { name: "New SKU Listing" },
    { name: "Price Change Notification" },
    { name: "Promo Live Alert" },
    { name: "Warehouse Cutoff Reminder" },
    { name: "Shipment Dispatched" },
  ],
  reminders: [
    { name: "Near-Expiry PO" },
    { name: "Pending ASN" },
    { name: "Pending Invoice Upload" },
    { name: "Pending KYC Renewal", mandatory: true },
    { name: "Contract Renewal Due", whatsappAvailable: false },
    { name: "Insurance Certificate Expiry" },
    { name: "GST Return Due", mandatory: true },
    { name: "Compliance Document Refresh", whatsappAvailable: false },
  ],
  account_access: [
    { name: "Login OTP", mandatory: true },
    { name: "Password Reset", mandatory: true },
    { name: "New User Added" },
    { name: "Role Changed" },
    { name: "Access Revoked", mandatory: true, whatsappAvailable: false },
    { name: "Session Alert — New Device" },
  ],
};

// Preload pattern for non-mandatory rows so the sample doesn't look uniform.
function preload(i: number): { mail: boolean; whatsapp: boolean } {
  switch (i % 5) {
    case 0:
      return { mail: true, whatsapp: false };
    case 1:
      return { mail: true, whatsapp: true };
    case 2:
      return { mail: false, whatsapp: true };
    case 3:
      return { mail: true, whatsapp: false };
    default:
      return { mail: true, whatsapp: true };
  }
}

function slug(cat: CategoryId, name: string) {
  return `${cat}__${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;
}

export const COMM_CATALOG: CommItem[] = (
  Object.entries(RAW) as [CategoryId, RawComm[]][]
).flatMap(([cat, items]) =>
  items.map((it, i) => {
    const whatsappAvailable = it.whatsappAvailable ?? true;
    let d = preload(i);
    // Mandatory comms must always have Mail on.
    if (it.mandatory) d = { ...d, mail: true };
    // If WhatsApp isn't available for this comm, force it off.
    if (!whatsappAvailable) d = { ...d, whatsapp: false };
    return {
      id: slug(cat, it.name),
      name: it.name,
      category: cat,
      defaults: d,
      mandatory: it.mandatory,
      whatsappAvailable,
    };
  }),
);

export function commsByCategory(category: CategoryId): CommItem[] {
  return COMM_CATALOG.filter((c) => c.category === category);
}
