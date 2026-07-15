## Goal

Make the Notification Centre a strict function of the Role Routing table in the Preference Centre: each employee role sees only notifications whose **category** is routed to them (plus categories routed to "All Roles"), and the same rule gates attachments. Add a handful of new sample notifications so the filtering is visibly testable.

## Changes

### 1. `src/lib/role-routing.ts` (new, shared source of truth)
- Move `DEFAULT_ROUTING` out of `notifications.settings.tsx` into a shared module so the Notification Centre and Preference Centre read the same map.
- Persist per-category assignments in `localStorage` under `pbc_role_routing` (mirrors the existing `pbc_*` role-context keys). Falls back to the current defaults on first load.
- Export a small `useRoleRouting()` hook that returns `{ routing, setRouting }` plus a helper `isCategoryVisibleTo(categoryId, employeeRole, routing)` which returns true when the category is assigned to that role or to `"All Roles"`.
- Default routing keeps today's assignments exactly:
  - Action Required → Supply Chain Manager
  - Finance & Payments → Finance
  - Reports & Analytics → Supply Chain Manager
  - Daily Ops Updates → Supply Chain Manager
  - Reminders → Supply Chain Manager
  - Account & Access → All Roles

### 2. `src/lib/mock-data.ts`
- Extend `AppNotification` with an optional `attachment?: { label: string; type: "PDF" | "Image" | "Excel Export" }`.
- Attach existing sample attachments where realistic (e.g. Fill Rate Scorecard PDF on n4, Sales Report CSV on n7).
- Add 5 new sample notifications spread across categories so both Finance and Supply Chain Manager have obviously different visible lists:
  1. `n10` — Finance & Payments / rejected_invoices, P2, Finance, unread, PDF attachment "Rejection report.pdf".
  2. `n11` — Finance & Payments / payment_on_hold, P1, Finance, unread.
  3. `n12` — Reports & Analytics / sales_reports, P3, Supply Chain Manager, unread, Excel attachment "Weekly sales.xlsx".
  4. `n13` — Daily Ops Updates / stock_updates, P3, Supply Chain Manager, unread.
  5. `n14` — Account & Access / role_changes, P2, All Roles, unread (visible to both roles by design).
- Keep `audience` on the type for backward compatibility, but stop using it as the filter (the category → role routing now decides).

### 3. `src/routes/notifications.settings.tsx`
- Delete the local `DEFAULT_ROUTING` and inline `useState` in `RoleRoutingTable`; use `useRoleRouting()` from the shared module so edits by the Vendor Admin immediately affect what employees see in the Centre (within the same browser).
- No visual change to the table.

### 4. `src/routes/notifications.index.tsx`
- Replace the current filter
  `n.audience === employeeRole || n.audience === "All Roles"`
  with
  `isCategoryVisibleTo(n.category, employeeRole, routing)`.
- Apply the same filter to:
  - the visible list,
  - the unread badge count in the header,
  - any per-category tabs / counters already computed from `NOTIFICATIONS`.
- Vendor Admin and Internal Ops views are unaffected (they still see everything they see today).

### 5. `src/components/notifications/DetailDialog.tsx`
- Render the new `attachment` block (small "Paperclip · label" chip, existing muted card styling — no new tokens).
- Guard the attachment render behind the same `isCategoryVisibleTo` check as a defensive second layer, so an attachment can never appear for a role that isn't assigned the category, even if a notification somehow leaks into view.

### 6. Sidebar unread badge (if present in `AppShell.tsx`)
- If the sidebar shows an unread count for the Notification Centre item, recompute it with the same filter. (Will confirm in the file during build; no change if it isn't currently rendered.)

## Out of scope
- No changes to Preference Centre visuals, Escalation Queue, Add Communication, Review Queue, Send Calendar, Vendor Delivery Profiles, or Workdesk scheduling.
- No changes to the routing UI itself — still edited only by Vendor Admin.
- No backend/persistence beyond the existing `localStorage` pattern.
