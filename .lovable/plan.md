## Goal

Replace the "Comms Review Queue" area with a new general-purpose **Requests** section under Internal Ops (Blinkit), visible to both Template Submitter and Approver. Structure it as a reusable request/approval system, with "Template Approval" as the only Request Type for now.

## Sidebar & routing

- In `src/components/layout/AppShell.tsx`:
  - Rename the existing entry to **Requests** (icon: `Inbox`) pointing to `/requests`, visible to both `Template Submitter` and `Approver` (Submitter no longer sees a "Submit Template" alias — all request activity lives under Requests).
  - Remove the old `/notifications/review-queue` reference. Keep other Internal Ops items untouched.
- Add new route file `src/routes/requests.tsx` and delete `src/routes/notifications.review-queue.tsx`.
- Under this section, subtitle in the page header reads **"Simulating: Workdesk"** whenever the route is active.

## Shared request store

- Add `src/lib/requests-store.ts`: in-memory store (module-level array + simple subscribe hook) holding request objects with fields matching the form + status (`Pending | Approved | Rejected`), `submittedAt`, `submittedBy`, `approvedAt?`, `rejectedAt?`, `rejectionReason?`, `rejectionCategory?`.
- Preload 4–5 sample requests across statuses (mix of Submitters/Teams, one Rejected with reason, one Low-Tech WhatsApp variant).

## Requests page (`/requests`)

Single route that renders one of two views based on `internalRole`:

### Submitter view
- Header + "Simulating: Workdesk" subtitle + **New Request** button.
- Below: **My Requests** table — columns: Template Name, Request Type, Status (colored tag: amber/green/red), Submitted At.
- Rejected rows expand inline to show Reason + Reason Category.

### New Request form (dialog or full panel)
Fields, in order, all matching existing app styling:
1. **Request Type** — Select, single option "Template Approval" (locked default, visibly present).
2. Template ID (input, placeholder "Paste the Template ID copied from Apollo").
3. Template Name (input).
4. Email (input, placeholder "abc@zomato.com").
5. Team (multi-select, max 2, placeholder "Pick your options").
6. Slack ID of internal POC (user dropdown — mock user list).
7. Purpose of the mailer (textarea).
8. Mail will be sent to (multi-select, max 2 — vendor segment options).
9. Email Attachments (file upload input).
10. Vendor ID list (file upload).
11. Manufacturer ID list (file upload).
12. Subject line (input).
13. Does this include any formula-generated attachment or table in mail body (multi-select, max 2: Formula Attachment / Table in Body / None).

**Comms Categorization (inline, same form):**
- "Does the vendor lose money or time if this is ignored?" Yes/No.
- Yes → Category = Action Required (red), Priority = P1.
- No → "What type of communication is this?" with Financial → Finance & Payments, Periodic → Reports & Analytics, High frequency → Daily Ops Updates, Pre-emptive → Reminders, Security → Account & Access; Priority per category (reuse mapping already used in Add Communication / role-routing).

**Inherited config panel (read-only)** — Channel, Batching, Escalation, Portal Expiry from category profile; labeled "Inherited from category, not editable here."

**Attachment** dropdown: None (default) / PDF / Image / Excel Export.
**Call to Action** dropdown: None (default) / Direct Link (reveals inline destination text field) / Autofilled Help & Support Ticket.

**Frequency of the mail to be sent** — multi-select as removable tag chips (max 2): Once / Daily / Weekly / Monthly, styled like existing selected-tag with X remove.
**Email to CC** (optional, input).
**Analyst POC** (optional, user dropdown).

**WhatsApp panel (conditional)** — shown only if the selected "Mail will be sent to" segment includes any Low Tech vendors (cross-referenced against `vendor-delivery-profiles` seed data). Rendered as an actual WhatsApp bubble (pale green `#DCF8C6`, rounded, WhatsApp-style, NOT app card styling):
- Message textarea, 300-char cap with live counter.
- Frequency multi-select (same tag pattern, max 2).
- Single Link or Phone Number CTA field.
- Status tag: "Requires separate approval from WhatsApp Business API".

**Submit** — pushes to shared store with status Pending, shows confirmation "Request submitted, status: Pending — {timestamp}", closes form, refreshes both Submitter's own list and Approver queue.

### Approver view
- Header + "Simulating: Workdesk" subtitle.
- Table of all `Pending` requests across submitters. Columns: Template Name, Request Type, Submitted By, Team, Submitted At, Time Waiting (computed from now - submittedAt).
- Row click → full read-only view of the request exactly as submitted (all fields above, WhatsApp bubble if present), plus:
  - **Approve** — single click, toast, status → Approved, records `approvedAt`.
  - **Reject** — opens dialog with required Reason (textarea) + Reason Category (Content Issue / Wrong Category or Config / Clubbing Conflict / Missing Info / Compliance Concern). On confirm, status → Rejected, records `rejectedAt`.

## Styling

Reuse existing tokens, cards, inputs, selects, badges, and category color mapping from prior work. Only the WhatsApp bubble departs from app styling (WhatsApp look).

## Files touched

- Modify: `src/components/layout/AppShell.tsx`.
- Add: `src/routes/requests.tsx`, `src/lib/requests-store.ts`.
- Delete: `src/routes/notifications.review-queue.tsx`.
- Reuse: existing category mapping, vendor delivery profiles data, WhatsAppBubble pattern (re-implemented inline in new route since old file is deleted).
