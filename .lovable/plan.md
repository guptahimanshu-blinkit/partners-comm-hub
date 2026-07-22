## What I found

The code in `src/lib/comm-catalog.ts` and `src/routes/notifications.settings.tsx` already contains all the changes from the last turn:

- Per-row **Mandatory** badge with lock icon on specific comms (PO Cancellation, Weekly Fill Rate Scorecard, Login OTP, etc.)
- Greyed-out `— Not on WhatsApp` cell (with tooltip) on WhatsApp-unavailable comms (Monthly Sales Report, TDS Certificate, Access Revoked, etc.)
- No category-header "Mandatory" badge inside the subscription matrix
- Updated bottom disclaimer

Since you're seeing none of it on either role, the most likely causes are (a) a stale preview / cached bundle, (b) the old category-header "Mandatory" badge is still visible in the **Role Assignment** section (a different table below), which reads as "the change didn't land", or (c) the accordion in Employee view isn't rendering the new per-row treatment.

## Plan

1. **Verify live in the browser** with Playwright as both Vendor Admin and Vendor Employee (each sub-role). Expand Action Required and Reports & Analytics. Screenshot the rows to confirm the Mandatory pill, the `— Not on WhatsApp` cell, and the disclaimer are actually rendered. Attach screenshots to the reply.

2. **If the DOM does show the changes** (i.e. it's a preview cache on your end): reply with the screenshots and ask you to hard-refresh; no code edits.

3. **If any row is missing the treatment**, patch the exact gap:
   - Missing Mandatory badge → check `comm.mandatory` render path in `CommSubscriptionSection`.
   - Missing dash → check `comm.whatsappAvailable` branch.
   - Employee view rendering the old shape → confirm `EmployeePreferences` also uses `CommSubscriptionSection` (not an older inline table).

4. **Also sweep the Role Assignment section** (separate table further down the page) — it still says "Mandatory, visible to Account Owner and Admin" on the Action Required / Account & Access rows. Confirm with you whether that badge should also go (your original ask was scoped to the subscription matrix, but if that's the badge you're seeing, we'll remove it there too).

## Deliverable

Screenshots of both Admin and Employee Preference Centre with categories expanded, plus a short diff of any code touched. No new features, only verification + targeted fixes.
