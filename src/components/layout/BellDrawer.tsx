import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Zap, DollarSign, Truck, Inbox } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useFeatureComms,
  markCommRead,
  SIDEBAR_TAB_ROUTES,
  type FeatureComm,
} from "@/lib/feature-comms";

type FilterKey = "all" | "action" | "finance" | "ops";

const FILTERS: Array<{
  key: FilterKey;
  label: string;
  icon: typeof Bell;
  match: (c: FeatureComm) => boolean;
}> = [
  { key: "all", label: "All Notifications", icon: Inbox, match: () => true },
  { key: "action", label: "Action Required", icon: Zap, match: (c) => c.actionRequired },
  {
    key: "finance",
    label: "Finance",
    icon: DollarSign,
    match: (c) => c.category === "Finance & Payments",
  },
  {
    key: "ops",
    label: "Operations",
    icon: Truck,
    match: (c) =>
      c.sidebarTab === "PO Summary" ||
      c.sidebarTab === "Appointments" ||
      c.sidebarTab === "Assortment",
  },
];

const PRIORITY_CLASS: Record<FeatureComm["priority"], string> = {
  P1: "bg-cat-red-soft text-cat-red",
  P2: "bg-cat-amber-soft text-cat-amber",
  P3: "bg-cat-grey-soft text-cat-grey",
};

function slaCountdown(c: FeatureComm): string | null {
  if (!c.actionRequired) return null;
  if (c.priority === "P1") return "SLA: 2h remaining";
  if (c.priority === "P2") return "SLA: 8h remaining";
  return null;
}

export function BellDrawer() {
  const comms = useFeatureComms();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState(false);

  const unread = useMemo(() => comms.filter((c) => !c.isRead), [comms]);
  const counts = useMemo(
    () => ({
      all: unread.length,
      action: unread.filter((c) => c.actionRequired).length,
      finance: unread.filter((c) => c.category === "Finance & Payments").length,
      ops: unread.filter(
        (c) =>
          c.sidebarTab === "PO Summary" ||
          c.sidebarTab === "Appointments" ||
          c.sidebarTab === "Assortment",
      ).length,
    }),
    [unread],
  );

  const items = useMemo(() => {
    const matcher = FILTERS.find((f) => f.key === filter)!.match;
    return unread.filter(matcher).slice(0, 30);
  }, [unread, filter]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {counts.all > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-cat-red px-1 py-0.5 text-[10px] font-bold text-white">
              {counts.all}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[440px]">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">Notifications</SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 border-b bg-muted/30 px-5 py-3">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.key;
            const count = counts[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-40 items-center justify-center px-5 text-center text-sm text-muted-foreground">
              You&apos;re all caught up on this filter.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((c) => {
                const sla = slaCountdown(c);
                return (
                  <li key={c.id} className="px-5 py-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className={cn("h-5 rounded-md px-1.5 text-[10px]", PRIORITY_CLASS[c.priority])}>
                        {c.priority}
                      </Badge>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {c.sidebarTab}
                      </span>
                      {sla && (
                        <span className="ml-auto text-[11px] font-medium text-cat-red">
                          ⏱ {sla}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {c.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                      {c.description}
                    </p>
                    {c.actionRequired && (
                      <div className="mt-3">
                        <Button
                          asChild
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            markCommRead(c.id);
                            setOpen(false);
                          }}
                        >
                          <Link to={SIDEBAR_TAB_ROUTES[c.sidebarTab]}>
                            {c.actionCta} →
                          </Link>
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
