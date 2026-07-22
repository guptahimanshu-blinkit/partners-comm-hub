## Add "Channel Preference Distribution" section to Comms Performance (Workdesk)

New section appended to `src/routes/comms-performance.tsx`, using existing Workdesk yellow theme and `SectionCard` pattern. Data source: aggregate the `defaults` on `COMM_CATALOG` (58 comms) to derive base counts, then multiply by a per-comm sample "subscriber count" so the numbers look like vendor subscriptions, not just comm types. Everything is static sample data — no wiring to live preference state.

### Three sub-panels inside one `SectionCard`

**1. Overall split — Donut chart**
- Three slices: Mail only, WhatsApp only, Both.
- Center label shows total subscriptions (e.g. "12,480 subscriptions").
- Legend with count + percentage per slice.
- Chart: Recharts `PieChart` with `innerRadius` (already used elsewhere in the project via shadcn/Recharts).
- Sample split (from catalog defaults, weighted): Mail only ~48%, Both ~37%, WhatsApp only ~15%.

**2. Trend over time — Stacked area chart**
- Last 8 weeks, weekly buckets ("W-8" … "This week").
- Three stacked series: Mail only, Both, WhatsApp only.
- Storyline in sample data: WhatsApp only and Both grow steadily as vendors opt in; Mail only slowly declines.
- Chart: Recharts `AreaChart` with `stackId="1"`, category colors (Mail = neutral grey, Both = Workdesk yellow, WhatsApp = green `#25D366`).

**3. Breakdown by comm type — Horizontal diverging bar list**
- One row per comm (top 12 by subscription volume, with a "Show all 58" toggle).
- Row layout: comm name on the left, then a diverging bar centered on 0 — Mail share extends left (grey), WhatsApp share extends right (green). Both counts contribute half to each side.
- Right-side label: dominant channel chip ("Leans WhatsApp" / "Leans Mail" / "Balanced").
- Sortable header: "Sort by WhatsApp share" / "Sort by Mail share".
- No third-party lib needed — plain flex bars, matches existing table styling.

### Sample data shape (added inline in the route file)

```ts
// per-comm subscription counts, derived from COMM_CATALOG + sample multiplier
type ChannelSplit = { mailOnly: number; whatsappOnly: number; both: number };
const commChannelStats: Array<{ id: string; name: string; category: CategoryId; split: ChannelSplit }> = …;

// 8-week trend, hand-tuned to tell the "WhatsApp adoption rising" story
const channelTrend: Array<{ week: string; mailOnly: number; whatsappOnly: number; both: number }> = …;
```

### Placement
Insert new `<ChannelPreferenceSection />` after the existing "Content Quality" / CTR blocks and before Bounce/Non-opener trackers, so it reads as: performance → preferences → deliverability.

### Confirmations before building
1. **Chart choice** — Donut + Stacked Area + Diverging horizontal bars. OK, or would you prefer a single bar chart or a 100% stacked bar for the overall split?
2. **Trend window** — 8 weekly buckets. OK, or prefer 12 weeks / 6 months monthly?
3. **Breakdown default** — top 12 comms with a "Show all 58" expander. OK, or show all 58 up front grouped by category?
4. **Story in sample data** — WhatsApp adoption trending up, Mail only trending down. OK for the presentation narrative?
