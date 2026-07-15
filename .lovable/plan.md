## Changes

### 1. Sidebar (`src/components/layout/AppShell.tsx`)
- Remove the **Send Calendar** nav entry entirely.
- In `NavList`, when rendering the Comms Review Queue entry and `role === "internal_ops"`, swap the label to **"Submit Template"** if `internalRole === "Template Submitter"`, otherwise keep **"Comms Review Queue"**. Position, icon, and route unchanged. Uses the existing `useRole()` hook.

### 2. Template Submitter — WhatsApp Template Details (`src/routes/notifications.review-queue.tsx`)
Add to **Step 2 (Categorize)**, right after the Channel/config block:

- **Target vendor segment** field (select) with the same 4 segments used elsewhere: `All vendors`, `Grocery – Tier 1`, `Fashion vendors`, `New vendors < 90 days`. A local map marks `All vendors` and `New vendors < 90 days` as containing Low Tech vendors.
- If the chosen segment contains Low Tech vendors, render a **WhatsApp Message Preview** panel:
  - Bubble styled like a real WhatsApp message: `rounded-2xl rounded-br-sm`, `bg-[#DCF8C6]`, dark text, narrow max-width, right-aligned, subtle shadow — explicitly using raw WhatsApp hex, not app semantic tokens.
  - Inside the bubble: `Textarea` for message body with `maxLength={300}` and a live `{n}/300` counter; a single CTA row with a small kind toggle (`None` / `Visit link` / `Call phone number`) and value input, rendered as plain WhatsApp-style action text (no button chrome).
  - Below the bubble, an amber status tag in app-standard styling: **"Requires separate approval from WhatsApp Business API"** (uses existing `cat-amber` tokens).
- Extend the submitted record, Step 5 summary chips, and `PendingTemplate` mock type to carry `segment`, `whatsappBody`, `whatsappCtaKind`, `whatsappCtaValue`. Seed the two existing Low-Tech PENDING entries with sample WhatsApp copy.
- When the segment has no Low Tech vendors, the panel is hidden and the current muted "Delivery to WhatsApp is handled automatically…" note stays.

### 3. Approver review panel (same file)
- Replace the current one-line WhatsApp note with the same WhatsApp bubble component (read-only variant), rendering the template's real `whatsappBody` and CTA.
- Keep a small muted caption under it: "Also delivers via WhatsApp to Low Tech vendors in this segment."
- Approve/Reject buttons and the Important-Updates / Orders-and-Purchases clubbing logic are untouched.

## Technical notes
- Shared `WhatsAppBubble` component lives in the same route file (editable vs. read-only via a prop) — no new files.
- Only the bubble uses raw hex (`#DCF8C6`); every other new element uses existing semantic tokens so the rest matches app styling exactly.
- `/notifications/send-calendar` route file is left in place (just delinked from the sidebar) — safe for the prototype and avoids churn to the route tree.

## Out of scope
Preference Centre, Escalation Queue, Vendor Delivery Profiles data model, and any backend wiring.
