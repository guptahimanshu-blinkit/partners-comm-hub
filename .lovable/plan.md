# Per-comm subscription in Preference Centre

Replace the current category-level channel toggle (Mail / WhatsApp + "Add another way") in Preference Centre with an expand-per-category view that lets vendors pick channels per individual comm type. Applies to both Vendor Admin and Vendor Employee preference screens in `src/routes/notifications.settings.tsx`. Nothing else on the page changes (Role Assignment, Digest frequency, Role Routing all stay as-is).

## Comm list per category (from existing `CATEGORIES[].subCategories` in `src/lib/mock-data.ts`)

- **Action Required** (mandatory) — PO Cancellations, ASN Errors
- **Finance & Payments** (mandatory) — Rejected Invoices, Payment On Hold
- **Reports & Analytics** — Fill Rate Scorecard, Sales Reports
- **Daily Ops Updates** — GRN Updates, Stock on Hand
- **Reminders** — Near-Expiry POs, Pending ASN
- **Account & Access** (mandatory) — Login & OTP, Role Changes

No new sample data; we use the existing `subCategories` as the comm-type rows. If later you want more (e.g. "PO Mailer", "Payment Advice", "Invoice Rejected" as separate rows), we add them to `mock-data.ts` in a follow-up.

## Interaction

- Each category is a collapsible row. Header shows: color dot, category label, mandatory badge if applicable, right-side summary like "2 comms · Mail + WhatsApp on 1", and a chevron.
- Clicking the header expands to a small table with columns: **Comm type**, **Mail** (checkbox), **WhatsApp** (checkbox).
- Only one category expanded at a time (accordion). Portal helper text stays: "Portal is always included. Choose what else gets added on top."
- Toasts on toggle are dropped to keep interaction quiet; state is local (prototype only), same as today.

## Mandatory-channel lock logic

- Applies to every comm under **Action Required**, **Finance & Payments**, and **Account & Access** (the three `mandatory: true` categories).
- Mail is the locked default for mandatory comms — Mail checkbox is checked and disabled with a lock icon + tooltip "Mail is mandatory for this comm."
- WhatsApp is freely toggleable on mandatory comms (opt-in extra channel).
- Non-mandatory categories: both Mail and WhatsApp are freely toggleable; either or both may be off (neither is allowed → user simply won't receive that comm, matching "or neither where permitted").
- Net effect: on mandatory comms at least one channel (Mail) is always on; on non-mandatory comms all four combinations are allowed.

## Vendor Admin vs Vendor Employee

- **Vendor Admin** view: shows all 6 categories. This defines the org default per comm.
- **Vendor Employee** view: shows only categories assigned to their role via existing `useRoleAssignments()` **plus** the mandatory categories (Action Required, Account & Access) since those are always delivered — mandatory categories are shown here now (previously hidden) so the employee can still opt into WhatsApp for them. Footer note updates to: "Mandatory comms are always delivered on Mail. You can add WhatsApp on top."
- Both views share one `CategoryChannelList` component; the only difference is the category list passed in.

## Files touched

- `src/routes/notifications.settings.tsx` — replace the "Delivery channels" section body in `SettingsInner` and the entire body of `EmployeePreferences` with the new accordion component. Remove the `channels`, `extras`, `addExtra`, and `ADMIN_CHANNELS` bits that drove the old toggle. Keep Role Assignment, Digest frequency, Role Routing sections untouched.
- No changes to `mock-data.ts`, `role-assignments.ts`, or any other file.

## Confirmations requested before I build

1. Comm list per category above (using existing `subCategories`) is acceptable for the prototype — no new comm types added right now.
2. Mandatory lock = **Mail always on, WhatsApp optional** for all comms in Action Required / Finance & Payments / Account & Access. OK?
3. Employee view should now **include** mandatory categories (WhatsApp-only choice, Mail locked). OK, or keep them hidden as today?
