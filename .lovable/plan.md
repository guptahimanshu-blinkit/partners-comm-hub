## Clubbing Match panel — plan

Add a new panel inside the Approver's request review screen (`ApproverView` in `src/routes/requests.tsx`), inserted after the WhatsApp preview block and immediately above the Reject / Approve action row. The existing Approve/Reject buttons stay untouched.

### Layout

Card styled to match the other review cards (rounded-xl, border, subtle shadow):

- **Header**
  - Title: "Clubbing Match"
  - Sub: "Existing published templates that overlap with this request. Consider batching instead of a fresh send."
  - Right side: small pill showing the top match percent, colored:
    - ≥ 80% → red pill "High overlap"
    - 60–79% → amber "Possible overlap"
    - < 60% → muted "Low overlap" (or hide the pill)

- **Match list** — up to 3 rows, sorted by match % desc. Each row:
  - Left: template name + Apollo ID (mono) + category chip
  - Middle: horizontal match bar (0–100%) with numeric % on the right, colored using the same thresholds
  - Sub-line: short reason chips e.g. "Same category", "Overlapping audience 74%", "Sent within 48h", "Same CTA destination"
  - Right: ghost link "View template" (no-op in prototype, opens toast "Template preview — sample data")

- **Empty state** — when no match ≥ 40%: single muted line "No meaningful overlap found. Safe to send as standalone."

- **Footer helper** — one-line note: "Sample match score. Real clubbing uses audience overlap + category + send window."

### Match logic (mock, deterministic per request)

Compute against a fixed pool of 5 published sample templates seeded in the file. For each request, produce match % using a simple deterministic hash of `request.id + template.id` mapped into 30–95, plus a small nudge (+10) when the pool template's category matches `request.categoryId`. Same request always shows the same list on re-render.

### Sample pool (5 templates)

| Apollo ID       | Name                         | Category              |
|-----------------|------------------------------|-----------------------|
| APOLLO-100234   | PO Extension Approved        | Finance & Payments    |
| APOLLO-100311   | Weekly Fill Rate Digest      | Reports & Analytics   |
| APOLLO-100402   | Catalogue Update Required    | Action Required       |
| APOLLO-100355   | Invoice Rejected             | Finance & Payments    |
| APOLLO-100501   | Diwali Announcement          | Announcements         |

Sample reason chips are chosen from: `Same category`, `Overlapping audience {n}%`, `Sent within 48h`, `Same CTA destination`, `Same priority`.

### Explicitly out of scope

- No merge/batch action button — approver still just Approves or Rejects (using existing "Clubbing Conflict" rejection reason if they want to reject on this basis).
- No changes to the Submitter's view.
- No new store/state — panel is derived purely from the current request.

---

Confirm the layout, thresholds (80 / 60), and the sample pool, and I'll build.
