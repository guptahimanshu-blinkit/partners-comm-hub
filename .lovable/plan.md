# Ticket Scorecard — Internal Ops (Blinkit)

New route `/help/ticket-scorecard` (simulating: Support analytics), added to the **Help & Support** sidebar section for Internal Ops, visible to both **Template Submitter** and **Approver**. Sits where "Escalation Queue" used to appear for Internal Ops.

Matches existing Workdesk aesthetic (same header/subtitle pattern, card grid, muted borders, semantic tokens).

## Page header
- Title: **Ticket Scorecard**
- Subtitle: **Simulating: Support analytics**
- Right-aligned filter row: Date range (Last 7d / 30d / 90d — default 30d), Team (All / Catalog / Finance / Supply Chain / Tech), Priority (All / P1 / P2 / P3).

## Layout

```text
┌───────────────────────────────────────────────────────────────┐
│  KPI TILES  (4 across)                                        │
│  SLA Adherence │ Open & SLA Breached │ Reopen Rate │ FCR Rate │
├───────────────────────────────────────────────────────────────┤
│  Open Aging Distribution (horizontal bar chart, full width)   │
├──────────────────────────────┬────────────────────────────────┤
│  Team-level Breach Hotspots  │  DIY vs Agent Resolution Split │
│  (table)                     │  (donut + legend)              │
├──────────────────────────────┴────────────────────────────────┤
│  Response Time Medians  (2 stat cards side by side)           │
│  Agent First Reply  │  Reopen → Resolved                      │
└───────────────────────────────────────────────────────────────┘
```

## Sections & sample data

**1. KPI tiles (top row, 4 cards)**
- SLA Adherence — `92.4%` (target ≥95%)
- Open & SLA Breached — `7.1%` of open tickets
- Reopen Rate — `4.8%` (last 30d)
- First Contact Resolution — `68.2%`

Each tile shows value, label, and a small delta vs previous period (e.g. `▲ 1.2pp`).

**2. Open Aging Distribution** — horizontal bars, count per bucket
- `< 4h` : 42
- `4–24h` : 31
- `1–3d` : 18
- `3–7d` : 9
- `> 7d` : 4 (breach zone)

**3. Team-level Breach Hotspots** — table
Columns: Team · Open tickets · Breached · Breach % · Median age
Sample rows: Catalog 34/6/17.6%/2.1d · Finance 22/2/9.1%/1.4d · Supply Chain 19/4/21.0%/2.8d · Tech 29/1/3.4%/0.9d.
Sorted by Breach % desc.

**4. DIY vs Agent Resolution Split** — donut
- DIY (self-serve via Help articles / auto-resolve): `38%`
- Agent-resolved: `62%`
Legend with counts (e.g. 412 DIY / 673 Agent, last 30d).

**5. Response Time Medians** — two stat cards
- Median Agent First Reply — `1h 42m` (target ≤2h)
- Median Reopen → Resolved — `6h 18m` (target ≤8h)

## Threshold color logic (semantic tokens, not hardcoded)

Applied to KPI values, breach % cells, and aging buckets:

| Metric | Good (green) | Watch (amber) | Breach (red) |
|---|---|---|---|
| SLA Adherence | ≥ 95% | 90–94.9% | < 90% |
| Open & SLA Breached | ≤ 5% | 5–10% | > 10% |
| Reopen Rate | ≤ 5% | 5–10% | > 10% |
| FCR Rate | ≥ 70% | 60–69.9% | < 60% |
| Breach % (team row) | ≤ 5% | 5–15% | > 15% |
| Aging bucket | `<4h`, `4–24h` neutral | `1–3d`, `3–7d` amber | `>7d` red |
| Median First Reply | ≤ 2h | 2–4h | > 4h |
| Median Reopen→Resolved | ≤ 8h | 8–16h | > 16h |

Colors use existing tokens: `text-primary` (green brand) for Good, `text-amber-600` equivalent via semantic amber token, `text-destructive` for Breach. Backgrounds use `/10` opacity chips for cell highlights, matching the pattern already used in Comms Performance bounce/quality tables.

## Technical notes
- New file: `src/routes/help.ticket-scorecard.tsx`.
- Nav: add entry in `AppShell.tsx` Help & Support section for Internal Ops (both sub-roles); Vendor sidebars untouched.
- No new store — all sample data inline in the route, same pattern as `comms-performance.tsx`.
- Donut = simple SVG or CSS conic-gradient (no new deps), consistent with existing charts.

## Please confirm before I build
1. **Layout** above (KPI row → aging chart → hotspots + DIY/Agent → response medians) — good, or reorder?
2. **Threshold bands** in the table above — good, or adjust any cutoffs?
3. Route path `/help/ticket-scorecard` under Help & Support — OK?
