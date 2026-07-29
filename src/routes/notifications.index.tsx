import { useMemo, useState } from "react";
import { createFileRoute, Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { AlertOctagon, CheckCircle2, Inbox, Zap } from "lucide-react";


import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role-context";
import {
  useFeatureComms,
  markCommRead,
  markCommsReadByTab,
  SIDEBAR_TABS,
  type SidebarTab,
  type FeatureComm,
} from "@/lib/feature-comms";

const TAB_META: Record<SidebarTab, { title: string; description: string }> = {
  "PO Summary": {
    title: "PO Summary — Purchase Orders",
    description: "Purchase orders, revisions, cancellations, and RTV alerts routed to your team.",
  },
  Appointments: {
    title: "Appointments — Warehouse Slots",
    description: "Inbound slots, confirmations, cancellations, and QR gate passes.",
  },
  Assortment: {
    title: "Assortment — MDM & Catalog",
    description: "MDM requests, image rework, and catalog health tracking.",
  },
  Invoices: {
    title: "Invoices & Payment Records",
    description: "Invoice verification, rejections, TDS disputes, and payment holds.",
  },
  "Report Requests": {
    title: "Report Requests — Scorecards & Exports",
    description: "Fill rate scorecards, LQI, forecast, and monthly sales exports.",
  },
  "Fees & Charges": {
    title: "Fees & Charges — Debit Notes",
    description: "GRN + DN + POD bundles, debit notes, and RTV courier charges.",
  },
  Admin: {
    title: "Admin — Account & Access",
    description: "Account activation, OTP login, and reactivation notices.",
  },
  "Consumer Offers": { title: "Consumer Offers", description: "Consumer-facing offer communications." },
  Sales: { title: "Sales", description: "Sales performance and monetization updates." },
  "Stock on Hand": { title: "Stock on Hand", description: "Inventory positions across facilities." },
};

const ACTIVE_TABS: SidebarTab[] = SIDEBAR_TABS;

const searchSchema = z.object({
  tab: fallback(z.string(), "PO Summary").default("PO Summary"),
  filter: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/notifications/")({
  head: () => ({
    meta: [
      { title: "Notification Centre — PartnersBiz" },
      { name: "description", content: "In-context vendor notifications organised by feature tab." },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  component: NotificationCentre,
});

function NotificationCentre() {
  const { role } = useRole();
  if (role === "internal_ops") return <Navigate to="/requests" />;
  return <NotificationCentreInner />;
}

const PRIORITY_CLASS: Record<FeatureComm["priority"], string> = {
  P1: "bg-cat-red-soft text-cat-red",
  P2: "bg-cat-amber-soft text-cat-amber",
  P3: "bg-cat-grey-soft text-cat-grey",
};

function NotificationCentreInner() {
  const search = useSearch({ from: "/notifications/" });
  const navigate = useNavigate({ from: "/notifications/" });
  const comms = useFeatureComms();

  const activeTab = (ACTIVE_TABS.includes(search.tab as SidebarTab)
    ? (search.tab as SidebarTab)
    : "PO Summary") as SidebarTab;
  const filter: "all" | "action" = search.filter === "action" ? "action" : "all";

  const setTab = (tab: SidebarTab) =>
    navigate({ search: { tab, filter: "all" }, replace: true });
  const setFilter = (f: "all" | "action") =>
    navigate({ search: (prev) => ({ ...prev, filter: f }), replace: true });

  const meta = TAB_META[activeTab];
  const tabItems = useMemo(
    () => comms.filter((c) => c.sidebarTab === activeTab),
    [comms, activeTab],
  );
  const actionItems = tabItems.filter((c) => c.actionRequired);
  const unread = tabItems.filter((c) => !c.isRead);
  const actionableUnread = unread.filter((c) => c.actionRequired);
  const banner = actionableUnread[0];

  const visible = useMemo(
    () => (filter === "action" ? tabItems.filter((c) => c.actionRequired) : tabItems),
    [tabItems, filter],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Tab bar */}
        <TabBar activeTab={activeTab} onSelect={setTab} comms={comms} />

        {/* Dynamic header */}
        <div className="mt-6 mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{meta.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {unread.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => markCommsReadByTab(activeTab)}>
              Mark all read ({unread.length})
            </Button>
          )}
        </div>

        {/* Action banner */}
        {banner && <ActionBanner banner={banner} count={actionableUnread.length} />}

        {/* Quick filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All ${activeTab} (${tabItems.length})`}
          />
          <FilterPill
            active={filter === "action"}
            onClick={() => setFilter("action")}
            label={`Action Required (${actionItems.length})`}
            icon={<Zap className="h-3.5 w-3.5" />}
            tone="red"
          />
        </div>

        {/* Data table */}
        <FeatureTable items={visible} tab={activeTab} />
      </div>
    </AppShell>
  );
}

function TabBar({
  activeTab,
  onSelect,
  comms,
}: {
  activeTab: SidebarTab;
  onSelect: (t: SidebarTab) => void;
  comms: FeatureComm[];
}) {
  const unreadByTab = (t: SidebarTab) =>
    comms.filter((c) => c.sidebarTab === t && !c.isRead).length;
  return (
    <div className="-mx-1 flex flex-wrap gap-1 border-b border-border pb-2">
      {ACTIVE_TABS.map((t) => {
        const active = t === activeTab;
        const count = unreadByTab(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {t}
            {count > 0 && (
              <span
                className={cn(
                  "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold",
                  active ? "bg-primary-foreground text-primary" : "bg-cat-red text-white",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ActionBanner({ banner, count }: { banner: FeatureComm; count: number }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-cat-red/40 bg-cat-red-soft/60 px-4 py-3">
      <AlertOctagon className="h-5 w-5 shrink-0 text-cat-red" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-cat-red">
          🛑 {count} Action Required
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{banner.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{banner.description}</p>
      </div>
      <Button size="sm" onClick={() => markCommRead(banner.id)} className="shrink-0">
        {banner.actionCta} →
      </Button>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  icon,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  tone?: "red";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? tone === "red"
            ? "border-cat-red bg-cat-red text-white"
            : "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

const TAB_COLUMNS: Record<SidebarTab, string> = {
  "PO Summary": "PO / Reference",
  Invoices: "Invoice / Reference",
  "Fees & Charges": "Charge Ref",
  Appointments: "Slot / Facility",
  Assortment: "SKU / Request",
  "Report Requests": "Report",
  Admin: "Item",
  "Consumer Offers": "Offer",
  Sales: "Metric",
  "Stock on Hand": "SKU",
};

function FeatureTable({ items, tab }: { items: FeatureComm[]; tab: SidebarTab }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border py-16 text-center">
        <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Nothing to show</p>
        <p className="text-sm text-muted-foreground">No items match this filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{TAB_COLUMNS[tab]}</span>
        <span>Sub-category</span>
        <span>Priority</span>
        <span>Action</span>
      </div>
      <ul className="divide-y">
        {items.map((c) => {
          const isSelected = selectedId === c.id;
          return (
            <li
              key={c.id}
              className={cn(
                "grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] items-center gap-3 px-4 py-3 text-sm",
                !c.isRead && "bg-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedId(isSelected ? null : c.id)}
                className="min-w-0 text-left"
              >
                <p className="truncate font-semibold text-foreground">{c.title}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {c.description}
                </p>
                {isSelected && (
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    Domain: {c.domain} · Category: {c.category}
                  </p>
                )}
              </button>
              <span className="truncate text-[12px] text-muted-foreground">{c.subCategory}</span>
              <div className="flex items-center gap-2">
                <Badge className={cn("h-5 rounded-md px-1.5 text-[10px]", PRIORITY_CLASS[c.priority])}>
                  {c.priority}
                </Badge>
                {c.isRead && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" aria-label="Read" />
                )}
              </div>
              {c.actionRequired && !c.isRead ? (
                <Button size="sm" variant="outline" onClick={() => markCommRead(c.id)}>
                  {c.actionCta}
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
