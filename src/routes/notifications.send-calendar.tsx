import { useMemo } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { CalendarDays, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { useRole } from "@/lib/role-context";
import { colorClasses, CATEGORIES, type CategoryId } from "@/lib/mock-data";

export const Route = createFileRoute("/notifications/send-calendar")({
  head: () => ({
    meta: [{ title: "Send Calendar — PartnersBiz Comms Centre" }],
  }),
  component: SendCalendarPage,
});

interface ScheduledSend {
  id: string;
  name: string;
  category: CategoryId;
  segment?: string;
  offsetDays: number;
}

const SAMPLE_SENDS: ScheduledSend[] = [
  {
    id: "s1",
    name: "Weekly payout summary",
    category: "finance_payments",
    segment: "All vendors",
    offsetDays: 1,
  },
  {
    id: "s2",
    name: "PO acceptance reminder",
    category: "reminders",
    segment: "Grocery — Tier 1",
    offsetDays: 2,
  },
  {
    id: "s3",
    name: "Monthly performance report",
    category: "reports_analytics",
    segment: "All vendors",
    offsetDays: 4,
  },
  {
    id: "s4",
    name: "Password rotation notice",
    category: "account_access",
    offsetDays: 6,
  },
  {
    id: "s5",
    name: "New catalog upload window",
    category: "daily_ops",
    segment: "Fashion vendors",
    offsetDays: 9,
  },
  {
    id: "s6",
    name: "Q3 dispute resolution deadline",
    category: "action_required",
    segment: "New vendors (< 90 days)",
    offsetDays: 12,
  },
];

const DATE_FMT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "short",
  day: "numeric",
};

function SendCalendarPage() {
  const { role } = useRole();

  const grouped = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const byDate = new Map<string, { label: string; items: ScheduledSend[] }>();
    for (const send of SAMPLE_SENDS) {
      const d = new Date(base);
      d.setDate(d.getDate() + send.offsetDays);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, DATE_FMT);
      if (!byDate.has(key)) byDate.set(key, { label, items: [] });
      byDate.get(key)!.items.push(send);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, ...v }));
  }, []);

  if (role !== "internal_ops") return <Navigate to="/notifications" />;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Send Calendar
          </h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Use this view to check if a new communication can be clubbed with something
          already going out, instead of sending it separately.
        </p>

        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  · {group.items.length}{" "}
                  {group.items.length === 1 ? "send" : "sends"}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <ul className="divide-y divide-border">
                  {group.items.map((send) => {
                    const cat = CATEGORIES.find((c) => c.id === send.category)!;
                    return (
                      <li
                        key={send.id}
                        className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {send.name}
                          </p>
                          {send.segment && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {send.segment}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold sm:self-auto",
                            colorClasses[cat.color].badge,
                          )}
                        >
                          {cat.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Prototype, sample data only, this schedule is illustrative.
        </p>
      </div>
    </AppShell>
  );
}
