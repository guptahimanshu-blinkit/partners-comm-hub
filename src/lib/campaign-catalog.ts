/**
 * Campaign creation catalog — mock-only governance data for the
 * PartnersBiz "Create Campaign" flow. No live data: every stat is mocked.
 */

export type CampaignCategory =
  | "actionable"
  | "payments"
  | "updates"
  | "promotional";

export interface CampCatMeta {
  name: string;
  /** Template categories eligible for this campaign category. */
  tplCats: string[];
  channels: string[];
  defaultTier: "fyi" | "standard" | "critical";
  desc: string;
}

export const CAMP_CATS: Record<CampaignCategory, CampCatMeta> = {
  actionable: {
    name: "Actionable Task",
    tplCats: ["Action Required", "Account & Access", "Reminders"],
    channels: ["Email", "WhatsApp", "SMS", "Dashboard", "Portal Push"],
    defaultTier: "standard",
    desc: "Vendor must accept, dispute or resolve something.",
  },
  payments: {
    name: "Payments & Finance",
    tplCats: ["Finance & Payments"],
    channels: ["Email", "WhatsApp", "Dashboard", "Portal Push"],
    defaultTier: "critical",
    desc: "Invoices, holds, rebates and payout communications.",
  },
  updates: {
    name: "Updates & Reports (FYI)",
    tplCats: ["Reports & Analytics", "Daily Ops Updates"],
    channels: ["Email", "Dashboard", "Portal Push"],
    defaultTier: "fyi",
    desc: "Broadcast reports and ops updates — no action expected.",
  },
  promotional: {
    name: "Promotional & Growth",
    tplCats: ["Promotional"],
    channels: ["Email", "Dashboard"],
    defaultTier: "fyi",
    desc: "Opt-in growth, ads and monetisation nudges.",
  },
};

export const CAMP_CAT_KEYS = Object.keys(CAMP_CATS) as CampaignCategory[];

/** Mocked engagement stats shown next to every pre-approved template. */
export interface TemplateStat {
  ackRate: number;
  n: number;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  channel: "Email" | "WhatsApp" | "SMS" | "Dashboard" | "Portal Push";
  templateCategory: string;
  stat: TemplateStat;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "APOLLO-ACT-1041",
    name: "GRN discrepancy — action needed",
    channel: "Email",
    templateCategory: "Action Required",
    stat: { ackRate: 62, n: 1840 },
  },
  {
    id: "APOLLO-ACT-1088",
    name: "PO cancellation confirmation",
    channel: "WhatsApp",
    templateCategory: "Action Required",
    stat: { ackRate: 71, n: 940 },
  },
  {
    id: "APOLLO-ACC-2010",
    name: "Portal access re-verification",
    channel: "Email",
    templateCategory: "Account & Access",
    stat: { ackRate: 48, n: 610 },
  },
  {
    id: "APOLLO-REM-2204",
    name: "Appointment slot reminder",
    channel: "SMS",
    templateCategory: "Reminders",
    stat: { ackRate: 55, n: 2210 },
  },
  {
    id: "APOLLO-FIN-3012",
    name: "Invoice overdue — settle now",
    channel: "Email",
    templateCategory: "Finance & Payments",
    stat: { ackRate: 68, n: 1520 },
  },
  {
    id: "APOLLO-FIN-3077",
    name: "Rebate & penalty statement",
    channel: "WhatsApp",
    templateCategory: "Finance & Payments",
    stat: { ackRate: 74, n: 880 },
  },
  {
    id: "APOLLO-RPT-4005",
    name: "Weekly fill-rate scorecard",
    channel: "Email",
    templateCategory: "Reports & Analytics",
    stat: { ackRate: 34, n: 3120 },
  },
  {
    id: "APOLLO-OPS-4130",
    name: "Daily ops digest",
    channel: "Dashboard",
    templateCategory: "Daily Ops Updates",
    stat: { ackRate: 29, n: 3880 },
  },
  {
    id: "APOLLO-PRO-5001",
    name: "Ads credit booster — festive push",
    channel: "Email",
    templateCategory: "Promotional",
    stat: { ackRate: 22, n: 1450 },
  },
  {
    id: "APOLLO-PRO-5002",
    name: "Visibility slots — early access offer",
    channel: "Dashboard",
    templateCategory: "Promotional",
    stat: { ackRate: 18, n: 1980 },
  },
];

/** Saved CDP-style audience segments (mocked recipient counts). */
export interface CdpSegment {
  key: string;
  count: number;
  desc: string;
}

export const CDP_SEGMENTS: CdpSegment[] = [
  { key: "All vendors", count: 3880, desc: "Every active vendor on PartnersBiz" },
  { key: "Tech Enabled Vendors", count: 1240, desc: "API / portal-active vendors" },
  { key: "Low Tech Vendors", count: 640, desc: "WhatsApp-first, low portal usage" },
  { key: "Finance POC only", count: 412, desc: "Mapped finance point of contact" },
  { key: "North zone — Category A", count: 1212, desc: "Zone + category cohort" },
];

export const LARGE_AUDIENCE_THRESHOLD = 1000;
