import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Paperclip } from "lucide-react";
import { priorityBadgeClass, type AppNotification } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";
import { useRoleRouting, isCategoryVisibleTo } from "@/lib/role-routing";

export function DetailDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: AppNotification | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { role, employeeRole } = useRole();
  const { routing } = useRoleRouting();
  if (!notification) return null;

  const canSeeAttachment =
    role !== "vendor_employee" ||
    isCategoryVisibleTo(notification.category, employeeRole, routing);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <Badge className={priorityBadgeClass(notification.priority)}>
              {notification.priority}
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px]">
              <ExternalLink className="h-3 w-3" /> Record Detail
            </Badge>
          </div>
          <DialogTitle className="text-base leading-snug">
            {notification.subject}
          </DialogTitle>
          <DialogDescription className="sr-only">Record detail panel</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <dl className="divide-y divide-border">
            {notification.detail.map((f) => (
              <div
                key={f.label}
                className="flex items-start justify-between gap-4 py-2.5 text-sm"
              >
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="text-right font-medium text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {notification.attachment && canSeeAttachment && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {notification.attachment.label}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {notification.attachment.type}
              </p>
            </div>
            <Button size="sm" variant="outline">
              Download
            </Button>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>Open in source system</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
