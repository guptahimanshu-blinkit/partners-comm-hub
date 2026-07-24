import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Inbox,
  Clock,
  ExternalLink,
  LifeBuoy,
  CircleAlert,
  Paperclip,
  Flag,
} from "lucide-react";


import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DetailDialog } from "@/components/notifications/DetailDialog";
import { RaiseTicketDialog } from "@/components/notifications/RaiseTicketDialog";
import {
  PinnedP1Banners,
  ActionCardDeck,
} from "@/components/notifications/ActionDeck";
import { useRole } from "@/lib/role-context";
import { useRoleAssignments, isCategoryAssignedTo } from "@/lib/role-assignments";
import {
  CATEGORIES,
  NOTIFICATIONS,
  colorClasses,
  priorityBadgeClass,
  type AppNotification,
  type CategoryId,
} from "@/lib/mock-data";

export const Route = createFileRoute("/notifications/")({
  head: () => ({
    meta: [{ title: "Notification Centre — PartnersBiz Comms Centre" }],
  }),
  component: NotificationCentre,
});

function NotificationCentre() {
  const { role, employeeRole } = useRole();

  if (role === "internal_ops") {
    return <Navigate to="/requests" />;
  }

  return <NotificationCentreInner isEmployee={role === "vendor_employee"} employeeRole={employeeRole} />;
}

function NotificationCentreInner({
  isEmployee,
  employeeRole,
}: {
  isEmployee: boolean;
  employeeRole: string;
}) {
  const { assignments } = useRoleAssignments();
  const [selectedCat, setSelectedCat] = useState<CategoryId | "all">("all");
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("n1");
  const [detailFor, setDetailFor] = useState<AppNotification | null>(null);
  const [ticketFor, setTicketFor] = useState<AppNotification | null>(null);
  const [flagFor, setFlagFor] = useState<AppNotification | null>(null);
  const [viewMode, setViewMode] = useState<"deck" | "list">("list");


  const visible = useMemo(
    () =>
      NOTIFICATIONS.filter(
        (n) => !isEmployee || isCategoryAssignedTo(n.category, employeeRole, assignments),
      ),
    [isEmployee, employeeRole, assignments],
  );

  const unreadByCat = (cat: CategoryId) =>
    visible.filter((n) => n.category === cat && !n.read).length;
  const unreadBySub = (cat: CategoryId, sub: string) =>
    visible.filter((n) => n.category === cat && n.subCategory === sub && !n.read).length;

  const list = useMemo(() => {
    let l = visible;
    if (selectedCat !== "all") l = l.filter((n) => n.category === selectedCat);
    if (selectedSub) l = l.filter((n) => n.subCategory === selectedSub);
    return l;
  }, [visible, selectedCat, selectedSub]);

  const totalUnread = visible.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row">
        {/* Category folders */}
        <div className="border-b border-border p-4 lg:h-[calc(100vh-4rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <button
            onClick={() => {
              setSelectedCat("all");
              setSelectedSub(null);
            }}
            className={cn(
              "mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              selectedCat === "all"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-2">
              <Inbox className="h-4 w-4" /> All notifications
            </span>
            {totalUnread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background">
                {totalUnread}
              </span>
            )}
          </button>

          <div className="space-y-0.5">
            {CATEGORIES.filter(
              (cat) => !isEmployee || isCategoryAssignedTo(cat.id, employeeRole, assignments),
            ).map((cat) => {
              const c = colorClasses[cat.color];
              const count = unreadByCat(cat.id);
              const isActive = selectedCat === cat.id;
              return (
                <Collapsible key={cat.id} defaultOpen={cat.id === "finance_payments"}>
                  <div
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-colors",
                      isActive && !selectedSub ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <button
                      onClick={() => {
                        setSelectedCat(cat.id);
                        setSelectedSub(null);
                      }}
                      className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                    >
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", c.dot)} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {cat.label}
                      </span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
                            c.badge,
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                    <CollapsibleTrigger className="group grid h-9 w-8 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="ml-4 border-l border-border pl-2">
                    {cat.subCategories.map((sub) => {
                      const subCount = unreadBySub(cat.id, sub.id);
                      const subActive = selectedSub === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setSelectedCat(cat.id);
                            setSelectedSub(sub.id);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] transition-colors",
                            subActive
                              ? "bg-accent font-medium text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <span className="truncate">{sub.label}</span>
                          {subCount > 0 && (
                            <span className="ml-2 shrink-0 text-[11px] font-semibold text-foreground">
                              {subCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        {/* Notification list */}
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Notification Centre
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEmployee
                ? `Showing notifications relevant to your role: ${employeeRole}`
                : "All notifications for ITC Limited across every category"}
            </p>
          </div>

          <PinnedP1Banners />

          <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("deck")}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                viewMode === "deck"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Card Deck View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                viewMode === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Standard List View
            </button>
          </div>

          {viewMode === "deck" ? (
            <ActionCardDeck />
          ) : list.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-border py-16 text-center">
              <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">You're all caught up</p>
              <p className="text-sm text-muted-foreground">
                No notifications in this view.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((n) => (
                <NotificationCard
                  key={n.id}
                  n={n}
                  selected={selectedId === n.id}
                  onSelect={() => setSelectedId(selectedId === n.id ? "" : n.id)}
                  onViewDetails={() => setDetailFor(n)}
                  onRaiseTicket={() => setTicketFor(n)}
                  onFlag={() => setFlagFor(n)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DetailDialog
        notification={detailFor}
        open={!!detailFor}
        onOpenChange={(v) => !v && setDetailFor(null)}
      />
      <RaiseTicketDialog
        notification={ticketFor}
        open={!!ticketFor}
        onOpenChange={(v) => !v && setTicketFor(null)}
      />
      <ReportMismatchDialog
        notification={flagFor}
        open={!!flagFor}
        onOpenChange={(v) => !v && setFlagFor(null)}
      />

    </AppShell>
  );
}

function NotificationCard({
  n,
  selected,
  onSelect,
  onViewDetails,
  onRaiseTicket,
  onFlag,
}: {
  n: AppNotification;
  selected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  onRaiseTicket: () => void;
  onFlag: () => void;
}) {

  const cat = CATEGORIES.find((c) => c.id === n.category)!;
  const c = colorClasses[cat.color];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-all",
        selected ? "border-primary/40 shadow-sm ring-1 ring-primary/10" : "border-border",
        n.expired && "opacity-60",
      )}
    >
      <button
        onClick={onSelect}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {!n.read && !selected && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
        {(n.read || selected) && (
          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", c.dot, "opacity-40")} />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge className={cn("text-[10px]", priorityBadgeClass(n.priority))}>
              {n.priority}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", c.text)}>
              {cat.label}
            </Badge>
            {n.expired && (
              <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" /> Expired
              </Badge>
            )}
            {n.attachment && (
              <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                <Paperclip className="h-3 w-3" /> {n.attachment.type}
              </Badge>
            )}
          </div>
          <p
            className={cn(
              "text-sm leading-snug",
              n.read ? "font-medium" : "font-semibold",
            )}
          >
            {n.subject}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{n.relativeTime}</p>
        </div>
      </button>

      {selected && (
        <div className="border-t border-border bg-muted/30 p-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {n.timestamp}
              </span>
              <Badge className={cn("text-[10px]", priorityBadgeClass(n.priority))}>
                {n.priority} · {cat.label}
              </Badge>
            </div>
            <h3 className="text-[15px] font-semibold leading-snug">{n.subject}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {n.message}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {n.cta === "view_details" ? (
                <Button size="sm" onClick={onViewDetails} className="gap-1.5">
                  <ExternalLink className="h-4 w-4" /> View Details
                </Button>
              ) : (
                <Button size="sm" onClick={onRaiseTicket} className="gap-1.5">
                  <LifeBuoy className="h-4 w-4" /> Raise Ticket
                </Button>
              )}
              {n.cta === "view_details" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRaiseTicket}
                  className="gap-1.5"
                >
                  <LifeBuoy className="h-4 w-4" /> Raise Ticket
                </Button>
              )}
            </div>
            {n.category === "reports_analytics" &&
              (n.attachment?.type === "PDF" ||
                n.attachment?.type === "Excel Export") && (
                <button
                  type="button"
                  onClick={onFlag}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <Flag className="h-3.5 w-3.5" /> Report data mismatch
                </button>
              )}


          </div>
          {n.expired && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleAlert className="h-3.5 w-3.5" /> This notification is past its
              configured expiry and is shown for reference only.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReportMismatchDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: AppNotification | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const cat = notification
    ? CATEGORIES.find((c) => c.id === notification.category)
    : null;

  const submit = () => {
    toast.success("Reported, Help and Support will review this");
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Report data mismatch
          </DialogTitle>
          <DialogDescription>
            Flag this report for review by Help and Support. This does not affect the
            notification itself.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Comm name</Label>
            <div className="mt-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              {notification?.subject ?? ""}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <div className="mt-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              {cat?.label ?? ""}
            </div>
          </div>
          <div>
            <Label htmlFor="mismatch-note" className="text-xs text-muted-foreground">
              What looks wrong
            </Label>
            <Textarea
              id="mismatch-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the mismatch you spotted…"
              className="mt-1 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={note.trim().length === 0}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

