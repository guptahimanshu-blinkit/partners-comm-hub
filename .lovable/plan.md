Plan to fix the Workdesk demo lifecycle:

1. Verify the exact broken sequence in the preview
   - Switch to Internal Ops (Blinkit) · Template Submitter.
   - Submit/approve a request if needed so it appears in Add New Notification.
   - Schedule that template.
   - Switch to Internal Ops (Blinkit) · Approver and check whether the new row appears in Published Templates immediately.

2. Make Published Templates use a single live source of truth
   - Keep Schedule Notification creating a `PublishedLog` first with status `Pending Review`.
   - Ensure the Requests page and Schedule page subscribe to the same in-memory store instance so role switching and navigation do not lose the newly scheduled row.
   - Preserve generated Apollo-style IDs, submitter name, template name, segment, scheduled date/time, and status.

3. Strengthen the Approver Published Templates experience
   - Newly scheduled entries should appear at the top of Published Templates.
   - Clicking the row should open the detail dialog with all available scheduling and request/template details.
   - Pending entries should show both `Acknowledge` and `Flag for Review` actions.

4. Preserve the Campaigns handoff order
   - Scheduling must not create a Campaign directly.
   - Only `Acknowledge` on the Approver detail dialog should create the Campaign row.
   - Flagging should continue to mark the request as `Rejected Post Publish` with the note.

5. Test the end-to-end presentation path before confirming
   - Submit request → Approve request → Schedule notification → verify Pending Review row appears for Approver → click row → Acknowledge → verify Campaign appears as Running/Scheduled.
   - I’ll use the live preview flow, not just static code checks, so the presentation demo path is verified.