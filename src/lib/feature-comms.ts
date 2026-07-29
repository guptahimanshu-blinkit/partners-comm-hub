import { useEffect, useState } from "react";

export type FeatureCategory =
  | "Finance & Payments"
  | "Reports & Analytics"
  | "Daily Ops Updates"
  | "Reminders"
  | "Account & Access";

export type SidebarTab =
  | "PO Summary"
  | "Invoices"
  | "Fees & Charges"
  | "Report Requests"
  | "Appointments"
  | "Assortment"
  | "Admin"
  | "Consumer Offers"
  | "Sales"
  | "Stock on Hand";

export type FeaturePriority = "P1" | "P2" | "P3";
export type FeatureDomain =
  | "Operations & Appointments"
  | "Finance & Payments"
  | "Assortment / MDM"
  | "Warehouse Ops"
  | "Monetization"
  | "Product / Process Launch";

export interface FeatureComm {
  id: string;
  title: string;
  description: string;
  actionRequired: boolean;
  domain: FeatureDomain;
  subCategory: string;
  category: FeatureCategory;
  sidebarTab: SidebarTab;
  isRead: boolean;
  priority: FeaturePriority;
  actionCta: string;
  timestamp: string;
}

/* -------- 58 seed communications (from Excel master sheet) -------- */

type Seed = Omit<FeatureComm, "id" | "isRead" | "timestamp">;

const rel = (mins: number) => {
  const d = new Date(Date.now() - mins * 60 * 1000);
  return d.toISOString();
};

const PO_SUMMARY: Seed[] = [
  { title: "PO Cancellation Mail — PO #43886010062823", description: "The buyer has cancelled this PO. Stop any in-transit dispatch and reconcile inventory.", actionRequired: true, domain: "Operations & Appointments", subCategory: "PO Cancellation", category: "Reminders", sidebarTab: "PO Summary", priority: "P1", actionCta: "Acknowledge & Stop Dispatch" },
  { title: "PO Cancellation Mail — PO #21356100587742", description: "Kolkata K4 buyer ops cancelled this PO. No further ASN can be created.", actionRequired: true, domain: "Operations & Appointments", subCategory: "PO Cancellation", category: "Reminders", sidebarTab: "PO Summary", priority: "P1", actionCta: "Acknowledge & Stop Dispatch" },
  { title: "PO Update / Revision Mail — PO #45120038811", description: "Quantity revised on 3 SKUs by buyer. Review updated PO before dispatch.", actionRequired: true, domain: "Operations & Appointments", subCategory: "PO Revision", category: "Reminders", sidebarTab: "PO Summary", priority: "P2", actionCta: "Review Revised PO" },
  { title: "PO Update / Revision Mail — PO #45120039122", description: "Price mismatch corrected on 2 line items. Please accept revised prices.", actionRequired: true, domain: "Operations & Appointments", subCategory: "PO Revision", category: "Reminders", sidebarTab: "PO Summary", priority: "P2", actionCta: "Accept Revision" },
  { title: "RTV Pending Pickup — 4 cartons at Faridabad F1", description: "Return-to-vendor cartons awaiting your logistics pickup for 3 days.", actionRequired: true, domain: "Warehouse Ops", subCategory: "RTV", category: "Reminders", sidebarTab: "PO Summary", priority: "P1", actionCta: "Schedule RTV Pickup" },
  { title: "RTV Pending Pickup — 7 cartons at Mumbai M10", description: "RTV inventory awaiting pickup. SLA breach in 12 hours.", actionRequired: true, domain: "Warehouse Ops", subCategory: "RTV", category: "Reminders", sidebarTab: "PO Summary", priority: "P1", actionCta: "Schedule RTV Pickup" },
  { title: "Near Expiry PO Reminder — PO #5383910053280", description: "PO expires in 18 hours and is not yet scheduled for ASN. Fill-rate at risk.", actionRequired: true, domain: "Operations & Appointments", subCategory: "Near Expiry PO", category: "Reminders", sidebarTab: "PO Summary", priority: "P1", actionCta: "Schedule ASN Now" },
  { title: "Near Expiry PO Reminder — PO #5383910055902", description: "PO expires tomorrow. Request extension or schedule ASN immediately.", actionRequired: true, domain: "Operations & Appointments", subCategory: "Near Expiry PO", category: "Reminders", sidebarTab: "PO Summary", priority: "P2", actionCta: "Request Extension" },
  { title: "Near Expiry PO Reminder — PO #5383910056118", description: "PO expiring in 36 hours — 42 units unscheduled.", actionRequired: true, domain: "Operations & Appointments", subCategory: "Near Expiry PO", category: "Reminders", sidebarTab: "PO Summary", priority: "P2", actionCta: "Schedule ASN Now" },
  { title: "PO Cancellation Mail — PO #43886010063001", description: "PO cancelled by category ops. Please confirm receipt.", actionRequired: true, domain: "Operations & Appointments", subCategory: "PO Cancellation", category: "Reminders", sidebarTab: "PO Summary", priority: "P1", actionCta: "Acknowledge & Stop Dispatch" },
  { title: "PO Update / Revision Mail — PO #45120039400", description: "Delivery slot revised by 24 hours. Update your dispatch plan.", actionRequired: true, domain: "Operations & Appointments", subCategory: "PO Revision", category: "Reminders", sidebarTab: "PO Summary", priority: "P3", actionCta: "Acknowledge Revision" },
  { title: "PO Confirmation — PO #45120039880 released", description: "New PO of 128 units released for Bengaluru B7. Expected dispatch: 2 days.", actionRequired: false, domain: "Operations & Appointments", subCategory: "PO Release", category: "Daily Ops Updates", sidebarTab: "PO Summary", priority: "P3", actionCta: "View PO" },
  { title: "PO Confirmation — PO #45120040015 released", description: "New PO of 96 units released for Delhi D3.", actionRequired: false, domain: "Operations & Appointments", subCategory: "PO Release", category: "Daily Ops Updates", sidebarTab: "PO Summary", priority: "P3", actionCta: "View PO" },
  { title: "PO Auto-Extension applied — PO #45120038811", description: "System auto-extended PO expiry by 24h due to warehouse holiday.", actionRequired: false, domain: "Operations & Appointments", subCategory: "PO Extension", category: "Daily Ops Updates", sidebarTab: "PO Summary", priority: "P3", actionCta: "View PO" },
  { title: "Weekly PO Fulfilment Snapshot", description: "You fulfilled 214 of 260 POs this week (82.3%).", actionRequired: false, domain: "Operations & Appointments", subCategory: "PO Snapshot", category: "Reports & Analytics", sidebarTab: "PO Summary", priority: "P3", actionCta: "View Snapshot" },
  { title: "PO Fill Rate — Week 27 published", description: "Overall PO fill rate for W27 is 94.2% (Grade A).", actionRequired: false, domain: "Operations & Appointments", subCategory: "Fill Rate", category: "Reports & Analytics", sidebarTab: "PO Summary", priority: "P3", actionCta: "View Report" },
  { title: "PO Compliance Advisory — Category X", description: "New MRP labelling rules apply from next PO cycle.", actionRequired: false, domain: "Product / Process Launch", subCategory: "Advisory", category: "Daily Ops Updates", sidebarTab: "PO Summary", priority: "P3", actionCta: "Read Advisory" },
  { title: "PO Batching update — Cluster North", description: "POs now batched in 6-hour cycles for North cluster.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Advisory", category: "Daily Ops Updates", sidebarTab: "PO Summary", priority: "P3", actionCta: "Read Update" },
];

const APPOINTMENTS: Seed[] = [
  { title: "Appointment Confirmed — Slot 09:00, WH-DEL-D3 · QR Pass ready", description: "Your delivery appointment is confirmed. Download the gate pass QR for driver entry.", actionRequired: true, domain: "Operations & Appointments", subCategory: "Appointment Confirmed", category: "Reminders", sidebarTab: "Appointments", priority: "P2", actionCta: "Download Gate Pass" },
  { title: "Appointment Confirmed — Slot 14:30, WH-MUM-M10 · QR Pass ready", description: "Appointment confirmed. QR pass valid for one entry only.", actionRequired: true, domain: "Operations & Appointments", subCategory: "Appointment Confirmed", category: "Reminders", sidebarTab: "Appointments", priority: "P2", actionCta: "Download Gate Pass" },
  { title: "Appointment Cancellation — Slot 11:00 WH-BLR-B7", description: "Warehouse cancelled your slot due to capacity issues. Please rebook.", actionRequired: true, domain: "Operations & Appointments", subCategory: "Appointment Cancellation", category: "Reminders", sidebarTab: "Appointments", priority: "P1", actionCta: "Rebook Slot" },
  { title: "Appointment Cancellation — Slot 07:30 WH-KOL-K4", description: "Slot cancelled. Rebook within 6 hours to avoid PO delay.", actionRequired: true, domain: "Operations & Appointments", subCategory: "Appointment Cancellation", category: "Reminders", sidebarTab: "Appointments", priority: "P1", actionCta: "Rebook Slot" },
  { title: "WH Planned Closure Notice — Faridabad F1 on 15 Jul", description: "Warehouse closed for annual audit. No inbound appointments 15 Jul.", actionRequired: true, domain: "Operations & Appointments", subCategory: "WH Closure", category: "Reminders", sidebarTab: "Appointments", priority: "P2", actionCta: "Confirm Reschedule" },
  { title: "Missed Appointment — Slot 08:00, WH-CHN-C2", description: "Truck did not arrive during allotted slot. Fill-rate penalty of 2% applied.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Missed Appointment", category: "Daily Ops Updates", sidebarTab: "Appointments", priority: "P3", actionCta: "View Details" },
  { title: "Slot Availability opened — WH-DEL-D3 next 24h", description: "New slots opened for tomorrow's inbound at WH-DEL-D3.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Slot Availability", category: "Daily Ops Updates", sidebarTab: "Appointments", priority: "P3", actionCta: "Book Slot" },
  { title: "Appointment Reminder — Slot in 2 hours", description: "Your inbound slot at WH-BLR-B7 starts in 2 hours.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Reminder", category: "Reminders", sidebarTab: "Appointments", priority: "P3", actionCta: "View Details" },
  { title: "Weekly Appointment Adherence — 91%", description: "Your appointment adherence for W27 is 91% (Grade B+).", actionRequired: false, domain: "Operations & Appointments", subCategory: "Adherence", category: "Reports & Analytics", sidebarTab: "Appointments", priority: "P3", actionCta: "View Report" },
];

const ASSORTMENT: Seed[] = [
  { title: "MDM Request Rejected — SKU 8811203 · Reason: Image quality", description: "MDM entry rejected. Upload higher-resolution product image and resubmit.", actionRequired: true, domain: "Assortment / MDM", subCategory: "MDM Rejection", category: "Reminders", sidebarTab: "Assortment", priority: "P2", actionCta: "Resubmit MDM" },
  { title: "MDM Request Rejected — SKU 8811444 · Reason: Missing HSN", description: "MDM request needs HSN code. Update and resubmit.", actionRequired: true, domain: "Assortment / MDM", subCategory: "MDM Rejection", category: "Reminders", sidebarTab: "Assortment", priority: "P2", actionCta: "Resubmit MDM" },
  { title: "Image Rework Required — 6 SKUs flagged", description: "Product images do not meet the new PartnersBiz guidelines.", actionRequired: true, domain: "Assortment / MDM", subCategory: "Image Rework", category: "Reminders", sidebarTab: "Assortment", priority: "P2", actionCta: "Upload New Images" },
  { title: "User Input Pending on MDM Request #MDM-8821", description: "Category manager requested clarification on brand hierarchy.", actionRequired: true, domain: "Assortment / MDM", subCategory: "MDM Query", category: "Reminders", sidebarTab: "Assortment", priority: "P2", actionCta: "Respond to Query" },
  { title: "MDM Request Approved — SKU 8811555", description: "Your MDM request has been approved and will be live within 24 hours.", actionRequired: false, domain: "Assortment / MDM", subCategory: "MDM Approved", category: "Daily Ops Updates", sidebarTab: "Assortment", priority: "P3", actionCta: "View SKU" },
  { title: "New MDM SLA Guidelines published", description: "MDM review SLA reduced from 5 to 3 business days.", actionRequired: false, domain: "Product / Process Launch", subCategory: "Advisory", category: "Daily Ops Updates", sidebarTab: "Assortment", priority: "P3", actionCta: "Read Guidelines" },
  { title: "Catalog Health Snapshot — 214 live SKUs", description: "3 SKUs are inactive due to missing compliance certificates.", actionRequired: false, domain: "Assortment / MDM", subCategory: "Catalog Health", category: "Reports & Analytics", sidebarTab: "Assortment", priority: "P3", actionCta: "View Snapshot" },
  { title: "Weekly Assortment Score — Grade A-", description: "Your assortment completeness score improved 2% this week.", actionRequired: false, domain: "Assortment / MDM", subCategory: "Score", category: "Reports & Analytics", sidebarTab: "Assortment", priority: "P3", actionCta: "View Score" },
];

const INVOICES: Seed[] = [
  { title: "Invoice Verified — INV-88900 · ₹3,42,000", description: "Invoice successfully verified against GRN. Payment scheduled.", actionRequired: false, domain: "Finance & Payments", subCategory: "Invoice Verified", category: "Finance & Payments", sidebarTab: "Invoices", priority: "P3", actionCta: "View Invoice" },
  { title: "Invoice Rejected — INV-88213 · GSTIN typo on Row 3", description: "Correct the GSTIN and re-upload to avoid payment delays.", actionRequired: true, domain: "Finance & Payments", subCategory: "Invoice Rejected", category: "Finance & Payments", sidebarTab: "Invoices", priority: "P1", actionCta: "Fix & Resubmit Invoice" },
  { title: "Invoice Rejected — INV-88420 · HSN code missing", description: "HSN code missing on line items 2 and 4. Please correct and re-upload.", actionRequired: true, domain: "Finance & Payments", subCategory: "Invoice Rejected", category: "Finance & Payments", sidebarTab: "Invoices", priority: "P2", actionCta: "Fix & Resubmit Invoice" },
  { title: "Payment On Hold — ₹2.11L pending DN-4521", description: "Payment on hold pending debit note resolution.", actionRequired: true, domain: "Finance & Payments", subCategory: "Payment On Hold", category: "Finance & Payments", sidebarTab: "Invoices", priority: "P2", actionCta: "Reconcile Statement" },
  { title: "Payment On Hold — ₹78K pending TDS reconciliation", description: "Payment held pending Q2 FY26 TDS certificate confirmation.", actionRequired: true, domain: "Finance & Payments", subCategory: "Payment On Hold", category: "Finance & Payments", sidebarTab: "Invoices", priority: "P1", actionCta: "Reconcile Statement" },
  { title: "TDS Deduction Dispute — INV-88103 · ₹12,400", description: "TDS deduction disputed by finance. Review and raise clarification.", actionRequired: true, domain: "Finance & Payments", subCategory: "TDS Dispute", category: "Finance & Payments", sidebarTab: "Invoices", priority: "P2", actionCta: "Raise Clarification" },
  { title: "Invoice Verified — INV-88815 · ₹1,10,000", description: "Invoice verified. Payment credited within 5 working days.", actionRequired: false, domain: "Finance & Payments", subCategory: "Invoice Verified", category: "Finance & Payments", sidebarTab: "Invoices", priority: "P3", actionCta: "View Invoice" },
];

const REPORT_REQUESTS: Seed[] = [
  { title: "Weekly Fill Rate Scorecard — W27", description: "Your Week 27 fill-rate scorecard is ready for download.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Fill Rate", category: "Reports & Analytics", sidebarTab: "Report Requests", priority: "P3", actionCta: "Download Report" },
  { title: "Weekly Fill Rate Scorecard — W26", description: "Historical Week 26 scorecard available for review.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Fill Rate", category: "Reports & Analytics", sidebarTab: "Report Requests", priority: "P3", actionCta: "Download Report" },
  { title: "LQI Report — June 2026", description: "Logistics Quality Index for June is now available.", actionRequired: false, domain: "Warehouse Ops", subCategory: "LQI", category: "Reports & Analytics", sidebarTab: "Report Requests", priority: "P3", actionCta: "Download LQI" },
  { title: "LQI Report — May 2026", description: "Logistics Quality Index for May is available.", actionRequired: false, domain: "Warehouse Ops", subCategory: "LQI", category: "Reports & Analytics", sidebarTab: "Report Requests", priority: "P3", actionCta: "Download LQI" },
  { title: "Weekly Forecast (N+1) — W28", description: "Forecast for Week 28 has been published.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Forecast", category: "Reports & Analytics", sidebarTab: "Report Requests", priority: "P3", actionCta: "Download Forecast" },
  { title: "Weekly Forecast (N+1) — W29", description: "Forecast for Week 29 has been published.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Forecast", category: "Reports & Analytics", sidebarTab: "Report Requests", priority: "P3", actionCta: "Download Forecast" },
  { title: "Monthly Sales Report — June 2026", description: "557 unique products tracked with total spend of ₹1.6Cr.", actionRequired: false, domain: "Monetization", subCategory: "Sales Report", category: "Reports & Analytics", sidebarTab: "Report Requests", priority: "P3", actionCta: "Download CSV" },
];

const FEES_CHARGES: Seed[] = [
  { title: "GRN + DN + POD Details — Batch W27", description: "GRN receipts, debit notes and PODs consolidated for W27.", actionRequired: false, domain: "Finance & Payments", subCategory: "GRN Bundle", category: "Finance & Payments", sidebarTab: "Fees & Charges", priority: "P3", actionCta: "Download Bundle" },
  { title: "PRN / Debit Note Raised — DN-4780 · ₹42,900", description: "New debit note raised for damaged inbound cartons.", actionRequired: true, domain: "Finance & Payments", subCategory: "Debit Note", category: "Finance & Payments", sidebarTab: "Fees & Charges", priority: "P2", actionCta: "Reconcile Statement" },
  { title: "PRN / Debit Note Raised — DN-4801 · ₹18,200", description: "Debit note raised for shortage on PO #45120038811.", actionRequired: true, domain: "Finance & Payments", subCategory: "Debit Note", category: "Finance & Payments", sidebarTab: "Fees & Charges", priority: "P2", actionCta: "Reconcile Statement" },
  { title: "RTV Courier Charges — ₹6,200 debited", description: "Courier fee for RTV pickup deducted from your next payment cycle.", actionRequired: false, domain: "Finance & Payments", subCategory: "RTV Charges", category: "Finance & Payments", sidebarTab: "Fees & Charges", priority: "P3", actionCta: "View Statement" },
];

const ADMIN: Seed[] = [
  { title: "Welcome to PartnersBiz — Account activated", description: "Your PartnersBiz account is now active. Explore the vendor dashboard.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Welcome", category: "Account & Access", sidebarTab: "Admin", priority: "P3", actionCta: "Explore Portal" },
  { title: "OTP / Login Mail — Code 482913", description: "Use this OTP to sign in. Valid for 10 minutes.", actionRequired: true, domain: "Operations & Appointments", subCategory: "OTP", category: "Account & Access", sidebarTab: "Admin", priority: "P1", actionCta: "Use OTP" },
  { title: "Reactivation Mail — Account eligible for reactivation", description: "Your dormant account is eligible for reactivation. Confirm within 7 days.", actionRequired: false, domain: "Operations & Appointments", subCategory: "Reactivation", category: "Account & Access", sidebarTab: "Admin", priority: "P3", actionCta: "Reactivate Account" },
];

const ALL_SEEDS: Seed[] = [
  ...PO_SUMMARY,
  ...APPOINTMENTS,
  ...ASSORTMENT,
  ...INVOICES,
  ...REPORT_REQUESTS,
  ...FEES_CHARGES,
  ...ADMIN,
];

function seedComms(): FeatureComm[] {
  return ALL_SEEDS.map((s, i) => ({
    ...s,
    id: `FC-${(i + 1).toString().padStart(4, "0")}`,
    isRead: false,
    timestamp: rel(3 + i * 7),
  }));
}

/* -------- Store -------- */

type G = { __PB_FEATURE_COMMS?: FeatureComm[]; __PB_FC_LISTENERS?: Set<() => void> };
const g = globalThis as unknown as G;

const STORAGE_KEY = "pbcc_feature_comms_v1";

function readStored(): FeatureComm[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeatureComm[]) : null;
  } catch {
    return null;
  }
}

function writeStored(v: FeatureComm[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch { /* ignore */ }
}

let COMMS: FeatureComm[] = g.__PB_FEATURE_COMMS ?? (g.__PB_FEATURE_COMMS = seedComms());
const listeners: Set<() => void> = g.__PB_FC_LISTENERS ?? (g.__PB_FC_LISTENERS = new Set());
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = readStored();
  if (stored && stored.length) {
    COMMS = stored;
    g.__PB_FEATURE_COMMS = stored;
    emit();
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setComms(next: FeatureComm[]) {
  COMMS = next;
  g.__PB_FEATURE_COMMS = next;
  writeStored(next);
  emit();
}

export function markCommRead(id: string) {
  hydrate();
  setComms(COMMS.map((c) => (c.id === id ? { ...c, isRead: true } : c)));
}

export function markCommsReadByTab(tab: SidebarTab) {
  hydrate();
  setComms(COMMS.map((c) => (c.sidebarTab === tab ? { ...c, isRead: true } : c)));
}

export function useFeatureComms(): FeatureComm[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    hydrate();
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return COMMS;
}

export const SIDEBAR_TABS: SidebarTab[] = [
  "PO Summary",
  "Appointments",
  "Assortment",
  "Invoices",
  "Report Requests",
  "Fees & Charges",
  "Admin",
];

export const SIDEBAR_TAB_ROUTES: Record<SidebarTab, string> = {
  "PO Summary": "/app/po-summary",
  Invoices: "/app/invoices",
  "Fees & Charges": "/app/fees-and-charges",
  "Report Requests": "/app/report-requests",
  Appointments: "/app/appointments",
  Assortment: "/app/assortment",
  Admin: "/app/admin",
  "Consumer Offers": "/app/consumer-offers",
  Sales: "/app/sales",
  "Stock on Hand": "/app/stock-on-hand",
};

export function unreadCountByTab(comms: FeatureComm[], tab: SidebarTab): number {
  return comms.filter((c) => c.sidebarTab === tab && !c.isRead).length;
}

export function totalUnread(comms: FeatureComm[]): number {
  return comms.filter((c) => !c.isRead).length;
}
