## Replace vendor Ticket Scorecard with a Help & Support ticket list

Rebuild `/help/my-tickets` as a real support-desk view. All previous content on this page (KPI tiles, breach banner, aging chart, category breakdown, self-serve tiles, volume trend) is removed.

### New page layout

Header
- Title: "Help & Support" · subtitle "Your raised tickets · sample data only".
- Same breadcrumb + role gating as today (Vendor Admin, or Vendor Employee with Reports & Analytics access).

Category pills (horizontal, scrollable on mobile)
- GRN & Discrepancy Note · Appointment · Payment · Purchase Order · Returns · Login Issues · Onboarding · Fees & Charges · Other
- First pill "All" is selected by default.
- Each pill shows a small count badge of tickets in that category. Clicking a pill filters the table below.

Filter row (right-aligned, under pills)
- Status dropdown: All, Open, In Progress, Awaiting Vendor, Resolved, Closed
- Sort By dropdown: Newest first, Oldest first, Recently updated, Status

Ticket list table
- Columns: Ticket Id · Ticket details · Raised on · Updated at · Status
- Ticket details = short title + one-line description underneath (muted).
- Status = colored pill (Open=blue, In Progress=amber, Awaiting Vendor=purple, Resolved=green, Closed=grey).
- Rows are clickable for future detail view, but no detail panel in this pass (visual affordance only).
- Empty state: "No tickets match these filters."

### Sample data

~14 sample tickets spread across the 9 categories so every pill shows a non-zero count and the Status filter has variety. Example rows:

- TKT-8821 · "GRN quantity mismatch — Kolkata K4" · 18 Jul 2026 · 20 Jul 2026 · Awaiting Vendor · GRN & Discrepancy Note
- TKT-8817 · "Payment not received for invoice INV-99213" · 16 Jul 2026 · 19 Jul 2026 · In Progress · Payment
- TKT-8804 · "Slot booking failed for Bengaluru DC" · 14 Jul 2026 · 15 Jul 2026 · Resolved · Appointment
- TKT-8790 · "PO not visible in portal" · 12 Jul 2026 · 12 Jul 2026 · Open · Purchase Order
- TKT-8782 · "Return pickup delayed by 4 days" · 11 Jul 2026 · 13 Jul 2026 · In Progress · Returns
- TKT-8770 · "OTP not received on login" · 10 Jul 2026 · 10 Jul 2026 · Resolved · Login Issues
- TKT-8755 · "Onboarding document rejected — GST proof" · 08 Jul 2026 · 09 Jul 2026 · Awaiting Vendor · Onboarding
- TKT-8741 · "Storage fee reversal request" · 06 Jul 2026 · 08 Jul 2026 · Closed · Fees & Charges
- …plus a few more so every category has ≥1 ticket.

### Files touched

- `src/routes/help.my-tickets.tsx` — full rewrite. Keep the route id, `head()` title, role gate, and `AppShell` wrapper; replace everything inside.
- No sidebar/breadcrumb changes (page stays under "Help & Support / Ticket Scorecard" or I can rename the breadcrumb label to "My Tickets" — say the word).
- No store changes, no new files. Sample data lives at the top of the route file.

### Out of scope

- Ticket detail drawer / modal.
- Raise-new-ticket flow.
- Any real backend or persistence.
- Vendor Admin vs Employee view differences beyond the existing access gate.

### Confirm before I build

1. Full removal of the old scorecard content on this page — good?
2. Category list above (9 pills, plus "All") — correct order and labels?
3. Breadcrumb label: keep "Ticket Scorecard" or rename to "My Tickets"?