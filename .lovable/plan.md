## Comms Performance — plan

New Workdesk page sitting next to Requests. Subtitle: **Simulating: Pulse metrics · sample data only**. Visible to both Template Submitter and Approver under Internal Ops (Blinkit).

- Route: `/comms-performance`
- Sidebar: new item "Comms Performance" placed immediately after "Requests" for `internal_ops` (both sub-roles).

### Layout (top → bottom)

1. **Header KPI strip** — 4 tiles: Avg CTR, Bounce Rate, Non-opener Rate, Templates below quality bar. Red accent when Bounce > 5% or Non-opener > 40%.

2. **Template-level CTR table**
   Columns: Template, Category, Sends, Opens, Clicks, CTR%, Trend (▲/▼ vs prior 7d).
   Sample: 8 templates across Finance, Ops, Announcements. CTR range 3%–34%. Sorted by CTR desc; low-CTR rows (<5%) tagged amber.

3. **Time-of-day CTR — Announcement mailers**
   Bar chart across 6 buckets (6–9, 9–12, 12–15, 15–18, 18–21, 21–24). Peak highlighted (e.g. 9–12 at 28%). Caption: "Best window to schedule announcement pushes."

4. **Bounce Tracker**
   Table: Template, Sends, Hard Bounces, Soft Bounces, Bounce %. Red pill when >5%. 5 rows, one clear offender at ~11%.

5. **Non-opener Tracker**
   Table: Vendor, Last opened, Consecutive misses, Category. Row actions:
   - **Suppress** — confirmation dialog, then toast "Vendor suppressed from this category."
   - **Route to Help & Support** — toast "Routed to Help & Support for outreach."
   6–8 rows, misses ranging 3–12.

6. **Finance Mail CTR — configuration level**
   Table grouped by configuration (e.g. "Weekly Payout Digest", "TDS Reconciliation", "Invoice Rejection Alert"). Columns: Configuration, Segment size, Opens, Clicks, CTR%. 4–5 rows.

7. **Content Quality Score per Template**
   Table: Template, Category, Score (/10), Status. Rules:
   - Score ≥ 9 → **Publishable** (green)
   - Score 7–8.9 → **Needs improvement** (amber)
   - Score < 7 → **Blocked** (red)
   Small banner above the table: "Minimum 9/10 required to publish."
   Row action **View gaps** opens a side sheet listing sub-scores (Clarity, Tone, CTA strength, Length, Personalisation) and 2–3 suggested fixes.

### Sample-data disclaimer

Matches existing pattern used on Ticket Scorecard — subtitle line reads `Simulating: Pulse metrics · sample data only`.

### Explicitly out of scope

No agent counts, no per-agent resolution numbers, no FAQ list — those live on Ticket Scorecard / are irrelevant here.

---

Confirm and I'll build. Flag any changes to bucket labels, thresholds (5% bounce, 9/10 quality gate), or column choices before I start.
