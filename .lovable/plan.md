## Add New Notification revamp (Workdesk, single screen)

Keep everything on one page, keep the yellow Workdesk accent as the page chrome. The form container itself takes on the selected category's color as a left border + header strip so approvers get a glance-level read. All PartnersBiz visual conventions stay.

### Final field order (top → bottom)

1. **Notification Type** (existing, kept first)
   - Dropdown filtered to Approved-request templates only.
   - Each option: colored dot + template name + faint category label.
   - Category → dot color:
     - Action Required → red
     - Finance & Payments → amber
     - Reports & Analytics → green
     - Daily Ops Updates → blue
     - Reminders → purple
     - Account & Access → grey
   - Helper note kept: "Only templates with an approved request are selectable here."

2. **Target Level** — dropdown: `Vendor`, `Manufacturer`.

3. **Segment** — dropdown:
   - `All vendors`
   - `Vendors with pending dues`
   - `Custom segment (query)`
   - Directly below, a read-only line: **Estimated recipients: N** (sample data, updates on segment change).

4. **Recipient Method** — two selectable tiles (single-select, radio-style):
   - `Role based` — subtitle "Finance POC + Owner roles from directory."
   - `Ad-hoc upload` — subtitle "Upload extra recipients via file." Shows a stub file-picker + parsed-row confirmation line when a file is chosen (sample only).

5. **Schedule Type** — segmented toggle: `One time` | `Recurring`.
   - One time → single `datetime-local` field (replaces the current "Schedule at").
   - Recurring → two side-by-side controls: weekday multi-select (Mon–Sun chips) + time picker. No date field in this mode.

6. **Submit** — primary button "Schedule Notification" at the bottom, disabled until Notification Type + a valid schedule are set.

### Sample data to preload

- **Estimated recipients per segment**
  - All vendors → 4,812
  - Vendors with pending dues → 612
  - Custom segment (query) → 187
- **Target Level** default: Vendor.
- **Recipient Method** default: Role based.
- **Schedule Type** default: One time.
- **Ad-hoc upload stub**: on file pick shows "recipients_wave2.xlsx parsed · 884 rows valid · 6 rejected" (static, no real parse).

### Category color wiring

- Reuse existing `cat-*` tokens already in the theme; no new palette.
- When Notification Type is selected, apply matching color as:
  - a 4px left border on the form card, and
  - a small colored dot + category label in the card header ("Category: Finance & Payments").
- When nothing is selected, card uses the default border.

### Publish-log payload

Keep the existing `addPublishLog` call. Extend the `segment` string sent to the log to include target level + recipient method for the approver's feed, e.g. `"Vendor · Vendors with pending dues · Role based"`. `scheduledFor` becomes either the one-time datetime string or `"Recurring · Mon, Wed · 09:30"`.

### Out of scope (explicitly not doing)

- No multi-step wizard, no Basics/Audience/Messages/Schedule/Reminders/Review tabs.
- No dark sidebar, no Pulse palette, no restyling of AppShell.
- No new backend, no persistence beyond the existing in-memory store.
- No changes to Requests, Templates, or any other Workdesk screen.

### Files touched

- `src/routes/notifications.schedule.tsx` — full rewrite of the form body; route, auth guard, and publish-log call preserved.
- No new files, no store schema changes.

### Confirm before I build

1. Field order above (Notification Type → Target Level → Segment + Estimated recipients → Recipient Method → Schedule Type → Submit) — good?
2. Sample estimated-recipients numbers (4,812 / 612 / 187) — good, or want different figures?
3. Category → color mapping matches your list — good?
