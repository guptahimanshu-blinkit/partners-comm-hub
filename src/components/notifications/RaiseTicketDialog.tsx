import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import type { AppNotification } from "@/lib/mock-data";

export function RaiseTicketDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: AppNotification | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && notification) {
      setSubmitted(false);
      setDescription(
        `Regarding: ${notification.subject}\n\nContext auto-populated from notification ${notification.id.toUpperCase()}. `,
      );
    }
  }, [open, notification]);

  if (!notification) return null;

  const type =
    notification.category === "finance_payments"
      ? "Invoice / Payment issue"
      : notification.category === "action_required"
        ? "PO discrepancy"
        : "Other";

  const ticketId = `HS-${notification.id.replace("n", "10")}42`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {submitted ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-cat-green-soft">
              <CheckCircle2 className="h-8 w-8 text-cat-green" />
            </div>
            <h3 className="text-lg font-semibold">Ticket raised</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your Help &amp; Support ticket{" "}
              <span className="font-semibold text-foreground">{ticketId}</span> has been
              created. Our team will respond within 24 hours.
            </p>
            <Button className="mt-5 w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <LifeBuoy className="h-3 w-3" /> Help &amp; Support
                </Badge>
              </div>
              <DialogTitle className="text-base">Raise a ticket</DialogTitle>
              <DialogDescription>
                Context has been auto-populated from this notification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <span className="text-muted-foreground">Linked notification</span>
                <p className="mt-0.5 font-medium text-foreground">{notification.subject}</p>
              </div>

              <div className="grid gap-2">
                <Label>Issue type</Label>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                  <p className="font-medium text-foreground">{type}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Auto detected from notification
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ref">Reference ID</Label>
                <Input
                  id="ref"
                  defaultValue={notification.detail[0]?.value ?? ""}
                  readOnly
                  className="bg-muted/40"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSubmitted(true);
                  toast.success("Ticket submitted to Help & Support");
                }}
              >
                Submit ticket
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
