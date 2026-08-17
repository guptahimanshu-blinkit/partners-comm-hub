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
  { key: "sellers for festive ticket access", count: 1240, desc: "" },
  { key: "Sellers with assorted items", count: 856, desc: "" },
  { key: "Negative Payout Amount", count: 432, desc: "" },
  { key: "BIS standards not met", count: 210, desc: "" },
  { key: "Sellers with food item count", count: 678, desc: "" },
  { key: "Blocker For Recall Condition Missing Only", count: 145, desc: "" },
  { key: "Blocker For PO Edited Only", count: 98, desc: "" },
];

export const LARGE_AUDIENCE_THRESHOLD = 1000;

/** Mocked inline stat line rendered on template rows in the sequencing step. */
export function templateStatLine(
  cat: CampaignCategory,
  t: CampaignTemplate,
): string {
  const n = t.stat.n.toLocaleString("en-IN");
  if (cat === "actionable" || cat === "payments") {
    return `Resolves ${t.stat.ackRate}% at first touch (n=${n})`;
  }
  return `${t.stat.ackRate}% open rate (n=${n})`;
}

/** Templates eligible for a category + channel pair (strict double filter). */
export function eligibleTemplates(
  cat: CampaignCategory,
  channel: string,
): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES.filter(
    (t) =>
      t.channel === channel && CAMP_CATS[cat].tplCats.includes(t.templateCategory),
  );
}

/* ---------------------------------------------------------------- */
/* Reminder strategy recommendations (mocked benchmarks)             */
/* ---------------------------------------------------------------- */

export type ReminderTier = "fyi" | "standard" | "critical";

export interface ReminderStrategy {
  id: string;
  title: string;
  rules: string[];
  performance: string;
  tier: ReminderTier;
  scheduleMode: string;
  channel: string;
  content: string;
  audience: "same" | "broaden";
  portalAck: boolean;
}

export const REMINDER_SCHEDULE_MODES = [
  "Fixed interval — every 2 days",
  "Fixed interval — every 5 days",
  "Exponential backoff — 2d → 4d → 8d",
  "Single reminder — T+3 days",
  "Escalating daily until SLA breach",
];

export const REMINDER_CHANNELS = [
  "Same as last step",
  "Email",
  "WhatsApp",
  "SMS",
  "Dashboard",
  "Portal Push",
];

/** 2–3 mocked "how others do it" strategies per campaign category. */
export const REMINDER_STRATEGIES: Record<CampaignCategory, ReminderStrategy[]> = {
  actionable: [
    {
      id: "act-backoff",
      title: "Backoff then escalate to WhatsApp",
      rules: ["Max 3 reminders", "2d → 4d → 8d", "Escalate Email → WhatsApp"],
      performance: "82% resolved before 3rd reminder (n=1,240)",
      tier: "standard",
      scheduleMode: "Exponential backoff — 2d → 4d → 8d",
      channel: "WhatsApp",
      content: "Pending action on your PartnersBiz task — resolve to avoid impact.",
      audience: "same",
      portalAck: true,
    },
    {
      id: "act-single",
      title: "One polite nudge only",
      rules: ["Single reminder at T+3d", "Same channel", "No escalation"],
      performance: "54% resolved, 0.4% opt-outs (n=910)",
      tier: "fyi",
      scheduleMode: "Single reminder — T+3 days",
      channel: "Same as last step",
      content: "Quick reminder: your pending action is still open.",
      audience: "same",
      portalAck: false,
    },
    {
      id: "act-sla",
      title: "SLA enforcement (P1 tasks)",
      rules: ["Every 2d ×5", "Broaden to secondary POC", "Auto-ticket on expiry"],
      performance: "94% closure within SLA (n=430)",
      tier: "critical",
      scheduleMode: "Every 2 days ×5",
      channel: "WhatsApp",
      content: "URGENT: action pending against SLA. Resolve today to avoid escalation.",
      audience: "broaden",
      portalAck: true,
    },
  ],
  payments: [
    {
      id: "pay-critical",
      title: "Finance escalation ladder",
      rules: ["Every 2d ×5", "Email → WhatsApp → Finance POC", "Broaden audience"],
      performance: "88% invoices settled in 7 days (n=760)",
      tier: "critical",
      scheduleMode: "Every 2 days ×5",
      channel: "WhatsApp",
      content: "Overdue invoice pending settlement. Please clear to avoid payout hold.",
      audience: "broaden",
      portalAck: true,
    },
    {
      id: "pay-standard",
      title: "Twice, then stop",
      rules: ["2 reminders (T+3d, T+7d)", "Same channel", "No broadening"],
      performance: "67% settled, low complaint rate (n=1,110)",
      tier: "standard",
      scheduleMode: "Fixed interval — every 5 days",
      channel: "Email",
      content: "Reminder: your invoice statement is awaiting reconciliation.",
      audience: "same",
      portalAck: true,
    },
  ],
  updates: [
    {
      id: "upd-none",
      title: "Read-only, one recap",
      rules: ["Single recap at T+5d", "Email only", "No portal nudge"],
      performance: "31% open on recap (n=2,940)",
      tier: "fyi",
      scheduleMode: "Fixed interval — every 5 days",
      channel: "Email",
      content: "In case you missed it — your weekly report is ready.",
      audience: "same",
      portalAck: false,
    },
    {
      id: "upd-dash",
      title: "Dashboard-only persistence",
      rules: ["No email reminders", "Dashboard card stays 7d", "Ack to dismiss"],
      performance: "46% dashboard views (n=1,830)",
      tier: "fyi",
      scheduleMode: "Single reminder — T+3 days",
      channel: "Dashboard",
      content: "Your latest scorecard is available in PartnersBiz.",
      audience: "same",
      portalAck: true,
    },
  ],
  promotional: [
    {
      id: "pro-light",
      title: "One-touch, opt-out safe",
      rules: ["Single reminder T+3d", "Email only", "Respect opt-outs"],
      performance: "19% click, 0.2% unsubscribes (n=1,450)",
      tier: "fyi",
      scheduleMode: "Single reminder — T+3 days",
      channel: "Email",
      content: "Last chance to claim your ads credit booster.",
      audience: "same",
      portalAck: false,
    },
    {
      id: "pro-dash",
      title: "Portal-first offer nudge",
      rules: ["Dashboard nudge only", "No push channels", "Ack CTA on offer"],
      performance: "24% offer views (n=1,980)",
      tier: "fyi",
      scheduleMode: "Fixed interval — every 5 days",
      channel: "Dashboard",
      content: "Your visibility slot offer is live in the portal.",
      audience: "same",
      portalAck: true,
    },
  ],
};

export const TIER_LABEL: Record<ReminderTier, "FYI" | "Standard" | "Critical"> = {
  fyi: "FYI",
  standard: "Standard",
  critical: "Critical",
};
