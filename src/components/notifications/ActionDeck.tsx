import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Check,
  X as XIcon,
  Clock,
  MoonStar,
  Paperclip,
  Keyboard,
  ArrowRight,
  LifeBuoy,
  PackageX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useActionItems, resolveActionItem, recordVendorAction, type ActionItem } from "@/lib/requests-store";
import type { AppNotification } from "@/lib/mock-data";
import { RaiseTicketDialog } from "@/components/notifications/RaiseTicketDialog";
import {
  POCancellationDialog,
  type POCancellationPayload,
} from "@/components/notifications/POCancellationDialog";
import { getActionItemCtaKind, CTA_LABEL } from "@/lib/action-cta";

function useCountdown(dueHours: number) {
  const [target] = useState(() => Date.now() + dueHours * 3_600_000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s, expired: diff === 0 };
}

function CountdownChip({ dueHours, urgent }: { dueHours: number; urgent?: boolean }) {
  const { h, m, s, expired } = useCountdown(dueHours);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        expired
          ? "bg-muted text-muted-foreground"
          : urgent
            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
      )}
    >
      <Clock className="h-3 w-3" />
      {expired
        ? "SLA breached"
        : `Due in ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`}
    </span>
  );
}

function actionToPOPayload(a: ActionItem): POCancellationPayload {
  return {
    poNumber: a.poInvoiceNo,
    vendorName: a.vendorName,
    warehouse: "Kolkata K4 Feeder Warehouse",
    reason: "Buyer inventory adjustment / Facility capacity",
    actionItemId: a.id,
  };
}

/** Pinned red P1 banners for the most critical pending actions. */
export function PinnedP1Banners() {
  const items = useActionItems();
  const p1 = items.filter((i) => i.status === "pending" && i.dueHours <= 12).slice(0, 6);
  const [poPayload, setPoPayload] = useState<POCancellationPayload | null>(null);
  const [ticketFor, setTicketFor] = useState<AppNotification | null>(null);

  if (p1.length === 0) return null;

  const handleClick = (a: ActionItem, kind: ReturnType<typeof getActionItemCtaKind>) => {
    if (kind === "po_cancel") {
      setPoPayload(actionToPOPayload(a));
      return;
    }
    resolveActionItem(a.id, "accept");
    toast.success("Confirmed & Reconciled ✓");
  };

  return (
    <div className="mb-4 space-y-2">
      {p1.map((a) => {
        const kind = getActionItemCtaKind(a);
        const label = CTA_LABEL[kind];
        return (
          <div
            key={a.id}
            className="flex flex-col gap-3 rounded-xl border border-red-300/70 bg-red-50 p-4 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-600 text-white">
                {kind === "po_cancel" ? (
                  <PackageX className="h-5 w-5" />
                ) : (
                  <AlertOctagon className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <Badge className="bg-red-600 text-white hover:bg-red-600">P1</Badge>
                  <span className="text-[11px] font-medium text-red-900/80 dark:text-red-200/80">
                    {a.category}
                  </span>
                  <CountdownChip dueHours={a.dueHours} urgent />
                </div>
                <p className="truncate text-sm font-semibold text-red-950 dark:text-red-100">
                  {a.title}
                </p>
                <p className="text-xs text-red-900/80 dark:text-red-200/80">
                  {a.poInvoiceNo} · {a.amountDue}
                </p>
              </div>
            </div>
            <div className="sm:ml-auto">
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleClick(a, kind)}
              >
                {label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      <POCancellationDialog
        open={!!poPayload}
        onOpenChange={(v) => !v && setPoPayload(null)}
        payload={poPayload}
        onRaiseTicket={(n) => setTicketFor(n)}
      />
      <RaiseTicketDialog
        notification={ticketFor}
        open={!!ticketFor}
        onOpenChange={(v) => !v && setTicketFor(null)}
      />
    </div>
  );
}

function actionToNotification(a: ActionItem): AppNotification {
  return {
    id: a.id.toLowerCase(),
    category: a.category.toLowerCase().includes("finance")
      ? "finance_payments"
      : "action_required",
    subCategory: "action_deck",
    subject: a.title,
    message: `${a.poInvoiceNo} — ${a.amountDue}`,
    timestamp: new Date().toLocaleString("en-IN"),
    relativeTime: `Due in ${a.dueHours}h`,
    priority: "P1",
    cta: "raise_ticket",
    read: false,
    expired: false,
    audience: "Account Owner",
    detail: [{ label: "Reference", value: a.poInvoiceNo }],
    attachment: a.attachmentName
      ? { type: "PDF", label: a.attachmentName }
      : undefined,
  };
}

/** Swipeable Tinder-style deck for pending action items. */
export function ActionCardDeck() {
  const items = useActionItems();
  const pending = useMemo(() => items.filter((i) => i.status === "pending"), [items]);
  const [disputeFor, setDisputeFor] = useState<AppNotification | null>(null);
  const [poPayload, setPoPayload] = useState<POCancellationPayload | null>(null);

  const top = pending[0];
  const peek = pending[1];
  const topKind = top ? getActionItemCtaKind(top) : "generic";
  const isPOCancel = topKind === "po_cancel";

  const doAccept = (a: ActionItem) => {
    const kind = getActionItemCtaKind(a);
    if (kind === "po_cancel") {
      setPoPayload(actionToPOPayload(a));
      return;
    }
    resolveActionItem(a.id, "accept");
    toast.success("Confirmed & Reconciled ✓");
  };
  const doDispute = (a: ActionItem) => {
    setDisputeFor(actionToNotification(a));
    resolveActionItem(a.id, "dispute");
  };
  const doSnooze = (a: ActionItem) => {
    resolveActionItem(a.id, "snooze");
    toast("Snoozed for 24h", { description: "No SLA penalty applied." });
  };

  useEffect(() => {
    if (!top) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      const k = e.key.toLowerCase();
      if (k === "d") doAccept(top);
      else if (k === "a") doDispute(top);
      else if (k === "w") doSnooze(top);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [top]);

  if (!top) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border py-16 text-center">
        <Check className="mb-3 h-8 w-8 text-cat-green" />
        <p className="font-medium">Deck cleared</p>
        <p className="text-sm text-muted-foreground">
          Every pending action has been resolved.
        </p>
      </div>
    );
  }

  const acceptLabel = isPOCancel ? "Stop Dispatch" : "Confirm";
  const disputeLabel = isPOCancel ? "Raise Support Ticket" : "Dispute";
  const AcceptIcon = isPOCancel ? PackageX : Check;
  const DisputeIcon = isPOCancel ? LifeBuoy : XIcon;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {pending.length} pending {pending.length === 1 ? "action" : "actions"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Keyboard className="h-3.5 w-3.5" />
          <kbd className="rounded border bg-muted px-1">A</kbd> {disputeLabel.toLowerCase()} ·
          <kbd className="rounded border bg-muted px-1">D</kbd> {acceptLabel.toLowerCase()} ·
          <kbd className="rounded border bg-muted px-1">W</kbd> snooze
        </span>
      </div>

      <div className="relative h-[280px]">
        {peek && (
          <div className="absolute inset-x-6 top-3 h-full rounded-2xl border border-border bg-muted/40" />
        )}
        <div
          key={top.id}
          className="absolute inset-0 flex flex-col rounded-2xl border border-border bg-card p-5 shadow-md"
        >
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge className="bg-red-600 text-white hover:bg-red-600">P1</Badge>
            <Badge variant="outline" className="text-[10px]">
              {top.category}
            </Badge>
            <CountdownChip dueHours={top.dueHours} urgent={top.dueHours <= 6} />
          </div>
          <h3 className="text-base font-semibold leading-snug">{top.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Ref:</span>
            <span className="font-medium">{top.poInvoiceNo}</span>
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-semibold">{top.amountDue}</span>
            {top.vendorName && (
              <>
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-medium">{top.vendorName}</span>
              </>
            )}
          </div>
          {top.attachmentName && (
            <button
              type="button"
              className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Download {top.attachmentName}
            </button>
          )}

          <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
              onClick={() => doDispute(top)}
            >
              <DisputeIcon className="mr-1 h-4 w-4" /> {disputeLabel}
              <kbd className="ml-1 rounded border bg-muted px-1 text-[10px]">A</kbd>
            </Button>
            <Button
              variant="outline"
              className="border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-950/40"
              onClick={() => doSnooze(top)}
            >
              <MoonStar className="mr-1 h-4 w-4" /> Snooze 24h
              <kbd className="ml-1 rounded border bg-muted px-1 text-[10px]">W</kbd>
            </Button>
            <Button
              className="bg-cat-green text-white hover:bg-cat-green/90"
              onClick={() => doAccept(top)}
            >
              <AcceptIcon className="mr-1 h-4 w-4" /> {acceptLabel}
              <kbd className="ml-1 rounded border bg-white/20 px-1 text-[10px]">D</kbd>
            </Button>
          </div>
        </div>
      </div>

      <RaiseTicketDialog
        notification={disputeFor}
        open={!!disputeFor}
        onOpenChange={(v) => !v && setDisputeFor(null)}
      />
      <POCancellationDialog
        open={!!poPayload}
        onOpenChange={(v) => !v && setPoPayload(null)}
        payload={poPayload}
        onRaiseTicket={(n) => setDisputeFor(n)}
      />
    </div>
  );
}
