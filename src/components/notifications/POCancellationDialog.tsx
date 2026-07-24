import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertOctagon, LifeBuoy, PackageX, Check } from "lucide-react";
import { toast } from "sonner";
import type { AppNotification } from "@/lib/mock-data";
import type { ActionItem } from "@/lib/requests-store";
import { resolveActionItem, getActionItems } from "@/lib/requests-store";

export interface POCancellationPayload {
  poNumber: string;
  vendorName?: string;
  warehouse?: string;
  reason?: string;
  actionItemId?: string;
  sourceNotification?: AppNotification | null;
}

export function POCancellationDialog({
  open,
  onOpenChange,
  payload,
  onRaiseTicket,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payload: POCancellationPayload | null;
  onRaiseTicket: (n: AppNotification) => void;
}) {
  if (!payload) return null;

  const {
    poNumber,
    vendorName = "—",
    warehouse = "Kolkata K4 Feeder Warehouse",
    reason = "Buyer inventory adjustment / Facility capacity",
    actionItemId,
    sourceNotification,
  } = payload;

  const acknowledge = () => {
    if (actionItemId) resolveActionItem(actionItemId, "accept");
    toast.success("Cancellation acknowledged", {
      description: "Dispatch halted. Workdesk telemetry updated.",
    });
    onOpenChange(false);
  };

  const raiseDispute = () => {
    // Build a lightweight AppNotification for the ticket dialog if none was supplied
    const notif: AppNotification =
      sourceNotification ??
      ({
        id: (actionItemId ?? poNumber).toLowerCase(),
        category: "action_required",
        subCategory: "po_cancellation",
        subject: `PO ${poNumber} cancelled — ${warehouse}`,
        message: `PO ${poNumber} was cancelled post-approval. Reason: ${reason}.`,
        timestamp: new Date().toLocaleString("en-IN"),
        relativeTime: "just now",
        priority: "P1",
        cta: "raise_ticket",
        read: false,
        expired: false,
        audience: "Supply Chain Manager",
        detail: [
          { label: "PO Number", value: poNumber },
          { label: "Vendor", value: vendorName },
          { label: "Facility", value: warehouse },
          { label: "Reason", value: reason },
        ],
      } as AppNotification);
    onOpenChange(false);
    onRaiseTicket(notif);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <Badge className="bg-red-600 text-white hover:bg-red-600">P1</Badge>
            <Badge variant="outline" className="gap-1 text-[11px]">
              <PackageX className="h-3 w-3" /> PO Cancellation
            </Badge>
          </div>
          <DialogTitle className="text-base leading-snug">
            PO {poNumber} cancelled — {warehouse}
          </DialogTitle>
          <DialogDescription className="sr-only">
            PO cancellation acknowledgement panel
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex gap-2">
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-snug">
              PO cancelled post-approval. Please halt in-transit shipments and revoke
              active ASNs.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <dl className="divide-y divide-border text-sm">
            <Row label="PO Number" value={poNumber} />
            <Row label="Vendor Name" value={vendorName} />
            <Row label="Warehouse Location" value={warehouse} />
            <Row label="Cancellation Reason" value={reason} />
          </dl>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="gap-1.5" onClick={raiseDispute}>
            <LifeBuoy className="h-4 w-4" /> Raise Dispute / Ticket
          </Button>
          <Button className="gap-1.5 bg-red-600 text-white hover:bg-red-700" onClick={acknowledge}>
            <Check className="h-4 w-4" /> Acknowledge Cancellation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** Try to locate an ActionItem by PO reference; used when clicking View Details on the notification card. */
export function findActionItemByPO(poNumber: string): ActionItem | undefined {
  return getActionItems().find((a) => a.poInvoiceNo.replace(/\D/g, "").includes(poNumber.replace(/\D/g, "")));
}
