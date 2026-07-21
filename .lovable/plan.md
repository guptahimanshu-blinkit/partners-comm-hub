## Campaigns (Workdesk)

New sidebar item under **Workdesk**, visible to both Template Submitter and Approver, using the existing yellow Workdesk accent (`.workdesk` theme scope, no new tokens).

Route: `src/routes/campaigns.tsx` → `/campaigns`. Breadcrumb: *PartnersBiz / Workdesk / Campaigns*.

### 1. List view

Table columns:
- **Campaign name** — template name + small muted Apollo ID underneath
- **Channels** — small icons for Email / WhatsApp / Dashboard (Portal), lit if the campaign uses that channel, dimmed otherwise
- **Audience** — recipient count (e.g. "1,240 vendors")
- **Trigger** — pill: *One time* or *Recurring · Daily/Weekly/Monthly*
- **Reminders** — e.g. "None", "1 reminder · +48h", "2 reminders"
- **Status** — colored pill: Running (green), Scheduled (blue), Pending approval (amber), Failing (red), Completed (grey)

Row click opens the detail view (side sheet, same pattern as the Published Templates detail dialog already in Requests).

Toolbar: status filter dropdown + search by name/ID. No create action — campaigns only appear via Acknowledge.

### 2. Connection to Acknowledge

Extend `src/lib/requests-store.ts`:
- Add `Campaign` type + module store (`CAMPAIGNS`, listeners, `useCampaigns`, `addCampaign`).
- Change `acknowledgeLog(id)` so that in addition to marking the log Acknowledged, it derives a campaign from the linked `TemplateRequest` + `PublishLog` and pushes it into `CAMPAIGNS` (guard against duplicates by `requestId`).
- Derivation rules:
  - name/id ← template name + Apollo ID
  - channels ← Email always on; WhatsApp on if `request.whatsapp` present; Dashboard always on (Portal is always included, per existing Preference Centre rule)
  - audience count ← mock from segment string (e.g. "Tech Enabled Vendors" → 1,240; "All vendors" → 3,880; "Low Tech Vendors" → 640)
  - trigger ← `Once` in `request.frequency` → *One time* + status **Scheduled**; anything else → *Recurring · <freq>* + status **Running**
  - reminders ← derived from priority (P1 → 2, P2 → 1, P3 → none) — mock only
  - startedAt ← log.scheduledFor

Seeded campaigns come "for free" from the two already-acknowledged/flagged seed logs by running the derivation on seed. I'll also seed one **Completed** and one **Failing** campaign directly so all five statuses are visible without user interaction.

### 3. Detail view (side sheet)

Layout, top to bottom:
- **Header**: campaign name, Apollo ID, status pill, "Acknowledged by <approver> on <date>" line
- **Overview grid** (2 cols): Category (colored dot), Priority, Purpose, Comm type
- **Delivery**: channels row with icons + labels, audience count, segment name, WhatsApp preview bubble reused from existing component if WhatsApp channel is on
- **Schedule**: trigger type, frequency, first send, reminder cadence
- **Inherited configuration** panel (reuse the same block already shown in Requests detail — attachment, CTA, formula flags)
- **Timeline**: Request approved → Published → Acknowledged (→ Flagged if applicable), each with timestamp

No edit actions in this prototype — read-only, matching Workdesk convention for downstream views.

### 4. Sidebar + breadcrumb

- `AppShell.tsx`: add "Campaigns" under the Workdesk group for both Template Submitter and Approver.
- Breadcrumb map: `/campaigns` → *Workdesk / Campaigns*.

### 5. Sample data on first load

After seed derivation runs, list will show ~4 campaigns:
1. **Fill Rate Weekly Digest — North** — Email + Dashboard, 1,240, Recurring · Weekly, 1 reminder, **Running** (from acknowledged seed log)
2. **Payment on Hold — Invoice Rejection** — Email + WhatsApp + Dashboard, 1,240, One time, 2 reminders, **Scheduled** (auto-created when Approver acknowledges the pending seed log — until then, appears only after acknowledge; I'll also pre-seed it so the list isn't empty on first view)
3. **Appointment Slot Confirmation — South** — Email + Dashboard, 880, Recurring · Daily, no reminders, **Completed** (pre-seeded)
4. **GST Filing Reminder — Q2** — Email + WhatsApp, 3,880, One time, 1 reminder, **Failing** (pre-seeded, with a small "3 WhatsApp deliveries bounced" note in detail)

### Technical notes

- Files touched: `src/lib/requests-store.ts` (add Campaign store + hook, extend `acknowledgeLog`), `src/routes/campaigns.tsx` (new), `src/components/layout/AppShell.tsx` (sidebar + breadcrumb).
- No new color tokens — page is wrapped in the existing `workdesk` class so all `--primary` refs render yellow with dark ink.
- No changes to Vendor-facing screens, Requests page semantics, or the Acknowledge button UI itself — only its side effect grows.

Please confirm the detail-view layout and the four sample campaigns above before I build.