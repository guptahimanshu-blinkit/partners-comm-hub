
## Ticket Scorecard — Vendor version

Add a second Ticket Scorecard scoped to the current vendor. The Internal Ops version at `/help/ticket-scorecard` stays exactly as it is today (kept for internal teams to see their own team-level hotspots). Vendors get a different route with vendor-scoped sample data and a different mid-section.

### Route & sidebar

- New route: `src/routes/help.my-tickets.tsx` (path `/help/my-tickets`) rendering the vendor scorecard.
- `AppShell.tsx` — under the existing "Help & Support" sidebar section, add "Ticket Scorecard" pointing to `/help/my-tickets` when:
  - role = `vendor_admin`, OR
  - role = `vendor_employee` AND the currently selected employee sub-role has `reports_analytics` in the Role Assignment table (via `useRoleAssignments` + `isCategoryAssignedTo(..., "reports_analytics", ...)`).
- Existing "Escalation Queue" already lives in Help & Support and is unchanged. The internal `/help/ticket-scorecard` link stays gated to `internal_ops` as today.
- Route guard: `help.my-tickets.tsx` redirects to `/notifications` if the role/assignment check fails (mirrors the guard already used on `/help/ticket-scorecard`).
- Breadcrumb: `PartnersBiz / Help & Support / Ticket Scorecard` (add mapping in `AppShell` breadcrumb map for `/help/my-tickets`).

### Page layout (top to bottom)

1. **Header** — Title "Ticket Scorecard", subtitle "Simulating: Your tickets · sample data only". Vendor-green theme (no `workdesk` class).
2. **KPI row (4 tiles)** — same visual pattern as the internal version, vendor-scoped numbers:
   - SLA Adherence Rate — `82.4%` (red if < 65%; here green)
   - Open & SLA Breached — `18.0%` of your open tickets (red if > 35%; here fine)
   - Reopen Rate — `6.2%` (target ≤ 5%)
   - First Contact Resolution — `74.1%` (target ≥ 70%)
3. **Breach banner** — reworded for vendor: "3 of your open tickets are past SLA. Median resolution jumps from 2.5h to 41h once a ticket breaches." Keep the destructive-tinted callout style. Only render when breached count > 0.
4. **Open Aging Distribution** — same horizontal bar chart component, vendor-scoped sample:
   - 0–2h 22%, 2–12h 26%, 12–24h 18%, 24–48h 15%, 48–72h 11%, 72h+ 8%
5. **Category Breakdown** *(replaces "Team-level Breach Hotspots")* — table over the six PBZ comm categories from `mock-data.ts` (`action_required`, `finance_payments`, `reports_analytics`, `daily_ops`, `reminders`, `account_access`). Columns: Category · Tickets Open · SLA Adherence · Open & Breached. Use the same red/amber/green thresholds and category color chip already used elsewhere. Sample:
   - Action Required — 6 open, 71.0% SLA, 2 breached
   - Finance & Payments — 9 open, 78.5% SLA, 2 breached
   - Reports & Analytics — 4 open, 88.0% SLA, 0 breached
   - Daily Ops Updates — 5 open, 84.2% SLA, 1 breached
   - Reminders — 2 open, 95.0% SLA, 0 breached
   - Account & Access — 1 open, 100.0% SLA, 0 breached
6. **Self Serve Rate** *(new)* — single card:
   - Big number: `43%` self-served (68 of 158 resolved tickets, last 30 days)
   - Sub-line: "68 resolved without an agent · 90 needed an agent"
   - Thin two-segment stacked bar (green = self-served, muted = agent)
   - Helper: "Higher self-serve means faster resolution and no waiting."
7. **Ticket Volume Trend — last 4 weeks** *(new)* — small vertical bar chart, 4 bars:
   - Wk -3: 42 raised / 38 resolved
   - Wk -2: 51 raised / 44 resolved
   - Wk -1: 47 raised / 49 resolved
   - This week: 39 raised / 35 resolved
   - Each week shows two thin bars side by side (raised vs resolved) with a small legend. Below: a one-line delta vs previous week (e.g. "▼ 17% vs last week").
8. **Response medians** — keep the two cards from the internal version, vendor-scoped: Median first reply `2h 05m` (target ≤ 4h), Median reopen → resolved `9h 12m` (target ≤ 12h).

Explicitly removed from the vendor version: DIY vs Agent split card (replaced by the richer Self Serve Rate section) and Team-level Breach Hotspots (internal team names).

### Technical details

- New file `src/routes/help.my-tickets.tsx`. Reuse the local `SectionCard`, KPI tile, aging-bar, and response-median patterns from `help.ticket-scorecard.tsx` by copy-adapting them in the new file (kept self-contained — no shared component extraction, to match the codebase's per-route style).
- `AppShell.tsx`:
  - Import `useRoleAssignments` + `isCategoryAssignedTo` and the vendor employee sub-role from `useRole`.
  - In the Help & Support nav builder, push the "Ticket Scorecard" → `/help/my-tickets` item when the vendor visibility check passes; push the existing internal one → `/help/ticket-scorecard` only for `internal_ops`.
  - Add `/help/my-tickets` to the breadcrumb map as `["Help & Support", "Ticket Scorecard"]`.
- No changes to data stores; all numbers are hardcoded sample data in the new route file.
- Category color chips reuse the `cat-*` tokens already defined for the six categories.

### Out of scope

- No new store, no wiring to `requests-store` or notifications data.
- No changes to the internal `/help/ticket-scorecard` page.
- No filter controls (date range, category filter) on the vendor version — static sample only.
