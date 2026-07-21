import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";
import {
  useRoleAssignments,
  isCategoryAssignedTo,
} from "@/lib/role-assignments";

export const Route = createFileRoute("/help/my-tickets")({
  head: () => ({
    meta: [{ title: "Help & Support — PartnersBiz Comms Centre" }],
  }),
  component: VendorTicketsPage,
});

// ------------------ Types & sample data ------------------

type TicketCategory =
  | "GRN & Discrepancy Note"
  | "Appointment"
  | "Payment"
  | "Purchase Order"
  | "Returns"
  | "Login Issues"
  | "Onboarding"
  | "Fees & Charges"
  | "Other";

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Awaiting Vendor"
  | "Resolved"
  | "Closed";

interface Ticket {
  id: string;
  title: string;
  description: string;
  raisedOn: string; // ISO
  updatedAt: string; // ISO
  status: TicketStatus;
  category: TicketCategory;
}

const CATEGORIES: TicketCategory[] = [
  "GRN & Discrepancy Note",
  "Appointment",
  "Payment",
  "Purchase Order",
  "Returns",
  "Login Issues",
  "Onboarding",
  "Fees & Charges",
  "Other",
];

const STATUSES: TicketStatus[] = [
  "Open",
  "In Progress",
  "Awaiting Vendor",
  "Resolved",
  "Closed",
];

const TICKETS: Ticket[] = [
  {
    id: "TKT-8821",
    title: "GRN quantity mismatch — Kolkata K4",
    description: "Received 480 units against PO for 500. Awaiting DC reconciliation.",
    raisedOn: "2026-07-18",
    updatedAt: "2026-07-20",
    status: "Awaiting Vendor",
    category: "GRN & Discrepancy Note",
  },
  {
    id: "TKT-8817",
    title: "Payment not received for invoice INV-99213",
    description: "Cleared on portal 6 days ago, funds not credited to registered account.",
    raisedOn: "2026-07-16",
    updatedAt: "2026-07-19",
    status: "In Progress",
    category: "Payment",
  },
  {
    id: "TKT-8811",
    title: "Discrepancy note raised on batch B-4421",
    description: "3 units damaged in transit, need credit note against dispatch.",
    raisedOn: "2026-07-15",
    updatedAt: "2026-07-17",
    status: "Open",
    category: "GRN & Discrepancy Note",
  },
  {
    id: "TKT-8804",
    title: "Slot booking failed for Bengaluru DC",
    description: "Appointment portal shows no slots for next 48h. Blocking dispatch.",
    raisedOn: "2026-07-14",
    updatedAt: "2026-07-15",
    status: "Resolved",
    category: "Appointment",
  },
  {
    id: "TKT-8798",
    title: "Reschedule appointment for Chennai DC",
    description: "Truck delayed by 6h, need next available window on 16 Jul.",
    raisedOn: "2026-07-13",
    updatedAt: "2026-07-14",
    status: "Closed",
    category: "Appointment",
  },
  {
    id: "TKT-8790",
    title: "PO not visible in portal",
    description: "PO-77821 emailed by CM but not listed in Open POs tab.",
    raisedOn: "2026-07-12",
    updatedAt: "2026-07-12",
    status: "Open",
    category: "Purchase Order",
  },
  {
    id: "TKT-8785",
    title: "PO quantity change requested",
    description: "Need to reduce PO-77733 line 4 from 200 to 150 units.",
    raisedOn: "2026-07-11",
    updatedAt: "2026-07-14",
    status: "In Progress",
    category: "Purchase Order",
  },
  {
    id: "TKT-8782",
    title: "Return pickup delayed by 4 days",
    description: "RTO-3391 was scheduled 07 Jul, still awaiting pickup.",
    raisedOn: "2026-07-11",
    updatedAt: "2026-07-13",
    status: "In Progress",
    category: "Returns",
  },
  {
    id: "TKT-8770",
    title: "OTP not received on login",
    description: "Multiple retries on registered mobile, no SMS received.",
    raisedOn: "2026-07-10",
    updatedAt: "2026-07-10",
    status: "Resolved",
    category: "Login Issues",
  },
  {
    id: "TKT-8762",
    title: "Locked out after password reset",
    description: "Reset flow completed but portal keeps returning invalid credentials.",
    raisedOn: "2026-07-09",
    updatedAt: "2026-07-11",
    status: "Awaiting Vendor",
    category: "Login Issues",
  },
  {
    id: "TKT-8755",
    title: "Onboarding document rejected — GST proof",
    description: "GST certificate marked illegible, please share high-res copy.",
    raisedOn: "2026-07-08",
    updatedAt: "2026-07-09",
    status: "Awaiting Vendor",
    category: "Onboarding",
  },
  {
    id: "TKT-8741",
    title: "Storage fee reversal request",
    description: "Charged storage fee despite pickup within free window on 02 Jul.",
    raisedOn: "2026-07-06",
    updatedAt: "2026-07-08",
    status: "Closed",
    category: "Fees & Charges",
  },
  {
    id: "TKT-8733",
    title: "Late shipment penalty clarification",
    description: "Need breakdown of penalty applied to invoice INV-98120.",
    raisedOn: "2026-07-05",
    updatedAt: "2026-07-07",
    status: "Resolved",
    category: "Fees & Charges",
  },
  {
    id: "TKT-8720",
    title: "General query — vendor portal training",
    description: "Requesting a walkthrough session for two new team members.",
    raisedOn: "2026-07-03",
    updatedAt: "2026-07-04",
    status: "Open",
    category: "Other",
  },
];

// ------------------ Style maps ------------------

const STATUS_STYLE: Record<TicketStatus, string> = {
  Open: "bg-cat-blue/10 text-cat-blue",
  "In Progress": "bg-cat-amber/10 text-cat-amber",
  "Awaiting Vendor": "bg-cat-purple/10 text-cat-purple",
  Resolved: "bg-cat-green/10 text-cat-green",
  Closed: "bg-muted text-muted-foreground",
};

// ------------------ Page ------------------

type CategoryFilter = "All" | TicketCategory;
type StatusFilter = "All" | TicketStatus;
type SortKey = "newest" | "oldest" | "updated" | "status";

function VendorTicketsPage() {
  const { role, employeeRole } = useRole();
  const { assignments } = useRoleAssignments();

  const canSee =
    role === "vendor_admin" ||
    (role === "vendor_employee" &&
      isCategoryAssignedTo("reports_analytics", employeeRole, assignments));

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: TICKETS.length };
    CATEGORIES.forEach((c) => {
      map[c] = TICKETS.filter((t) => t.category === c).length;
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    let list = TICKETS.slice();
    if (categoryFilter !== "All")
      list = list.filter((t) => t.category === categoryFilter);
    if (statusFilter !== "All")
      list = list.filter((t) => t.status === statusFilter);

    switch (sortKey) {
      case "newest":
        list.sort((a, b) => b.raisedOn.localeCompare(a.raisedOn));
        break;
      case "oldest":
        list.sort((a, b) => a.raisedOn.localeCompare(b.raisedOn));
        break;
      case "updated":
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
      case "status":
        list.sort(
          (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status),
        );
        break;
    }
    return list;
  }, [categoryFilter, statusFilter, sortKey]);

  if (!canSee) return <Navigate to="/notifications" replace />;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <header className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Help & Support
            </h1>
            <p className="text-sm text-muted-foreground">
              Your raised tickets · sample data only
            </p>
          </div>
        </header>

        {/* Category pills */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <CategoryPill
            label="All"
            count={counts["All"]}
            active={categoryFilter === "All"}
            onClick={() => setCategoryFilter("All")}
          />
          {CATEGORIES.map((c) => (
            <CategoryPill
              key={c}
              label={c}
              count={counts[c] ?? 0}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            />
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Sort By
            </label>
            <Select
              value={sortKey}
              onValueChange={(v) => setSortKey(v as SortKey)}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ticket list */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Ticket Id</TableHead>
                <TableHead>Ticket details</TableHead>
                <TableHead className="w-32">Raised on</TableHead>
                <TableHead className="w-32">Updated at</TableHead>
                <TableHead className="w-40">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="cursor-pointer">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {t.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{t.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {t.description}
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {t.category}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {formatDate(t.raisedOn)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {formatDate(t.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_STYLE[t.status],
                      )}
                    >
                      {t.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No tickets match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}

// ------------------ Bits ------------------

function CategoryPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
