# Comms Performance (Workdesk — Pulse metrics)

New sidebar item under Internal Ops (Blinkit), sitting directly next to **Requests**, visible to both Template Submitter and Approver sub-roles. Route: `/comms-performance`. Page subtitle: **"Simulating: Pulse metrics"** (same treatment as Requests' "Simulating: Workdesk" subtitle).

## Layout

Single scrollable page, sectioned with the same card styling used in Requests / Review Queue. A sticky top row of 4 KPI tiles (Avg CTR, Bounce rate, Non-openers, Avg quality score) sits above the sections. Each section below is a titled card with a short one-line description and a table or compact chart.

```text
┌────────────────────────────────────────────────┐
│ KPI tiles: CTR | Bounce | Non-openers | Score  │
├────────────────────────────────────────────────┤
│ 1. Template-level CTR                          │
│ 2. Time-of-day CTR (announcement mailers)      │
│ 3. Bounce tracker                              │
│ 4. Non-opener tracker  [Suppress & route →]    │
│ 5. Finance mail CTR (configuration level)      │
│ 6. Content quality score (≥9 to publish)       │
└────────────────────────────────────────────────┘
```

## Sections & sample data

**1. Template-level CTR table**
Columns: Template ID · Name · Category · Sends · Opens · Clicks · CTR% · Trend (▲/▼ vs prior 7d).
Sample rows: APOLLO-100234 "PO Extension Approved" (Finance, 12,430 sends, 41.2% CTR ▲), APOLLO-100311 "Weekly Fill Rate Digest" (Reports, 8,120, 22.8% ▼), APOLLO-100355 "Invoice Rejected" (Finance, 3,220, 58.6% ▲), APOLLO-100402 "Catalogue Update Required" (Action Required, 9,880, 34.1% ▼), APOLLO-100455 "Monthly Spends Summary" (Reports, 6,540, 18.2% ▼).

**2. Time-of-day CTR — announcement mailers**
Compact 24-bucket bar strip (CSS bars, no chart lib) showing CTR by send hour, filtered to Announcement category templates only. Peak marker at best hour. Sample: peak 10:00 (46%), secondary 16:00 (39%), trough 02:00 (4%). One-line insight: "Best window: 10:00–11:00 IST."

**3. Bounce tracker**
Table of recent sends with hard/soft bounces. Columns: Template ID · Sent · Delivered · Hard bounce · Soft bounce · Bounce% · Top reason.
Sample: 3 rows with reasons "Invalid mailbox", "Mailbox full", "Domain not found". Row-level badge turns red at >5% bounce.

**4. Non-opener tracker**
Vendors who haven't opened last N sends of a given template. Columns: Vendor · Tenant · Template · Consecutive non-opens · Last opened · Action.
Action column has two buttons per row: **Suppress** (removes from next send, shows toast "Suppressed for this template") and **Route to Help & Support** (creates a Help & Support ticket stub, shows toast "Ticket raised with Help & Support"). Pure client-side state, no backend.
Sample: 6 vendors, 4–12 consecutive non-opens, mix of Tech Enabled / Low Tech.

**5. Finance mail CTR — configuration level**
Groups Finance templates by their inherited configuration (Channel × Batching × Escalation) from the Requests categorization output. Columns: Configuration signature · Templates in group · Total sends · Avg CTR · Best template · Worst template.
Sample: 3 configuration groups (e.g., "Mail + Immediate + P1", "Mail + Daily digest + P2", "Mail+WhatsApp + Immediate + P1") with 2–4 templates each.

**6. Content quality score per template**
Columns: Template ID · Name · Subject score /3 · Body score /3 · CTA score /3 · **Total /9** · Status.
Status: **Publishable** when total ≥ 9, **Needs revision** otherwise. A helper line above: "Templates must score 9/9 to be publishable." Rows below 9 show a red badge and a "View gaps" link that opens a dialog listing which sub-scores fell short (mock reasons like "Subject > 60 chars", "CTA verb missing", "Body readability low").
Sample: 6 templates, 3 at 9/9 Publishable, 3 at 7–8 Needs revision.

## Wiring

- Add nav item in `src/components/layout/AppShell.tsx` for `internal_ops` right after Requests, visible to both sub-roles.
- New route `src/routes/comms-performance.tsx`.
- Mock data inline in the route file (or a small `src/lib/comms-performance-mock.ts` if it grows).
- Non-opener Suppress/Route actions update local component state + `toast` only; no store changes.
- Reuse existing Card / Table / Badge / Button / Dialog primitives and existing color tokens — no new design system work.

## Out of scope

No real analytics wiring, no cross-linking into Requests (score is display-only here), no changes to publish gating in Requests (the 9/9 rule is shown here as a reporting view; enforcement in Requests can be a follow-up if you want it).

Please confirm the layout and sample data above, or tell me what to adjust, and I'll build it.