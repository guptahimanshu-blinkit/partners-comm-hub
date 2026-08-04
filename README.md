# Partner Comms Hub

Build a web app prototype called "PartnersBiz Comms Centre" — a vendor communication and notification management system for an e-commerce vendor portal.

CONTEXT: This is a clickable prototype for internal stakeholder review, not a production app. Use mock/sample data throughout — no real backend logic needed beyond what's described below. Prioritize looking and behaving real over actual data persistence.

ROLES (only build UI relevant to each — do not mix logic across roles):

1. Vendor Admin — sees all notification categories for their business entity, can configure channel/escalation preferences

2. Vendor Employee (e.g. Supply Chain Manager, Finance) — sees only notifications relevant to their assigned role, cannot change org-wide settings

3. Internal Ops (Blinkit-side) — sees an escalation queue view of unactioned P1s across vendors, not the vendor-facing UI

MAIN SCREENS:

1. /notifications — Notification Centre (main screen)

   - Left sidebar: 6 category folders with unread badge counts — "Action Required" (red), "Finance & Payments" (amber), "Reports & Analytics" (green), "Daily Ops Updates" (blue), "Reminders" (purple), "Account & Access" (grey)

   - Each folder expands to sub-categories with their own badge counts (e.g. Finance & Payments (2) → Rejected Invoices (1), Payment On Hold (1))

   - Main panel: clicking a notification shows a live formatted preview card (subject, message content, timestamp, priority tag P1/P2/P3)

   - Each notification card has a CTA button — either "View Details" (deep-link style, opens a mock detail panel for that record) or "Raise Ticket" (opens a pre-filled H&S ticket form with the notification's context auto-populated)

   - Notifications past their configured expiry are visually greyed out but still visible

2. /notifications/settings — Vendor Preference Centre

   - Toggle channel (Mail / Portal / Both) per category — greyed out and locked for "Action Required," "Finance & Payments," "Account & Access" (mandatory categories) with a tooltip explaining why

   - For mandatory categories, show an "+ Add another way to receive this" button instead (e.g. add SMS) — never a toggle that implies removing the default

   - Digest frequency selector (Real-time / Daily / Weekly) for Daily Ops Updates and Reports & Analytics only, with a "Weekly" floor (cannot go lower)

   - Role routing table (Admin only): assign which employee role receives which category in real-time vs. digest

3. /notifications/escalation-queue (Internal Ops role only)

   - Table view: Notification, Vendor, Priority, Time Elapsed, SLA Status (on-time / breached), Owner Role

   - Breached SLA rows highlighted red, with an "Escalate to Queue" action button

   - This is a role-based queue view, not assigned to any named individual

4. /po-extension-request — PO Extension Request (new feature mockup)

   - Simple form: PO ID (pre-filled from context), Current Expiry Date, Requested New Expiry, Reason (required dropdown + text field)

   - Submit shows a confirmation state: "Auto-approved" (green, if under 24hrs and first request) or "Pending Category Manager Review" (yellow, otherwise)

   - Include a small note: "Max 1 extension per PO, up to 72 hours"

SAMPLE DATA TO SEED (use these exact examples so the prototype feels real, not generic):

- PO Cancellation Mail (P1, Action Required) — "PO #2135610057771 cancelled — Kolkata K4 Feeder Warehouse"

- Invoice Rejected + Reason (P1, Finance & Payments) — "Invoice INV-88213 rejected — GSTIN typo on Row 3"

- Weekly Fill Rate Scorecard (P2, Reports & Analytics) — "Your Week 27 Fill Rate Score is ready"

- Near-Expiry PO Reminder (P1, Reminders) — "PO #5383910053280 expires in 18 hours — not yet scheduled"

- OTP / Login Mail (P1, Account & Access) — "Your PartnersBiz login OTP: 482913"

DESIGN: Clean, modern B2B dashboard aesthetic — think Linear or Notion, not consumer-flashy. Mobile-first responsive. Use a green accent color (#2F7D32 or similar) to match PartnersBiz branding shown in reference screenshots I'll attach.

DO NOT build: real authentication, real email sending, real database integrations with Zoho/PAE, or any actual PO/vendor data — this is a UI/UX prototype only.
Reference the attached PartnersBiz screenshot for the exact visual style: dark green and white color scheme, clean data table layout, left sidebar navigation matching this pattern.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/be6f1925-c047-4fd0-bd75-af802d12e51b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
