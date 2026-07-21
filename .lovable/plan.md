## Changes

1. **Remove Ticket Scorecard from Internal Ops (Blinkit)**
   - Delete `src/routes/help.ticket-scorecard.tsx`.
   - In `src/components/layout/AppShell.tsx`, remove the Internal Ops "Ticket Scorecard" nav entry (under Help & Support) and its breadcrumb mapping for `/help/ticket-scorecard`.
   - Vendor-side Ticket Scorecard at `/help/my-tickets` stays untouched.

2. **Rename the categorization question everywhere**
   - Replace the label `"Does the vendor lose money or time if this is ignored?"` with `"Is this an actionable task?"` in:
     - `src/routes/requests.tsx` (line 761)
     - `src/routes/add-communication.tsx` (line 167)
   - Yes/No options and downstream categorization logic stay unchanged.
