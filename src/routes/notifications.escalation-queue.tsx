import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { ESCALATION_QUEUE, priorityBadgeClass } from "@/lib/mock-data";

export const Route = createFileRoute("/notifications/escalation-queue")({
  head: () => ({
    meta: [{ title: "Escalation Queue — PartnersBiz Comms Centre" }],
  }),
  component: EscalationQueuePage,
});

function EscalationQueuePage() {
  useRole();

  const breached = ESCALATION_QUEUE.filter((r) => r.sla === "breached").length;


  return (
    <AppShell>
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                P1 Escalation Queue
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Unactioned P1 notifications across all vendors. This is a shared role-based
              queue — items are owned by a role, not a named individual.
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Open P1s" value={String(ESCALATION_QUEUE.length)} />
          <StatCard label="SLA Breached" value={String(breached)} tone="danger" />
          <StatCard
            label="On Time"
            value={String(ESCALATION_QUEUE.length - breached)}
            tone="ok"
          />
          <StatCard label="Vendors Affected" value="5" />
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Time Elapsed</TableHead>
                <TableHead>SLA Status</TableHead>
                <TableHead>Owner Role</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ESCALATION_QUEUE.map((row) => {
                const breachedRow = row.sla === "breached";
                return (
                  <TableRow
                    key={row.id}
                    className={cn(breachedRow && "bg-cat-red-soft/50 hover:bg-cat-red-soft/70")}
                  >
                    <TableCell className="max-w-[280px] font-medium">
                      {row.notification}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.vendor}</TableCell>
                    <TableCell>
                      <Badge className={priorityBadgeClass(row.priority)}>
                        {row.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {row.elapsed}
                    </TableCell>
                    <TableCell>
                      <SlaBadge breached={breachedRow} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.ownerRole}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={breachedRow ? "default" : "outline"}
                        className="gap-1.5"
                        onClick={() =>
                          toast.success(`Escalated: ${row.vendor} → ${row.ownerRole} queue`)
                        }
                      >
                        <ArrowUpRight className="h-4 w-4" /> Escalate
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {ESCALATION_QUEUE.map((row) => {
            const breachedRow = row.sla === "breached";
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-xl border bg-card p-4",
                  breachedRow ? "border-cat-red/40 bg-cat-red-soft/40" : "border-border",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge className={priorityBadgeClass(row.priority)}>{row.priority}</Badge>
                  <SlaBadge breached={breachedRow} />
                </div>
                <p className="text-sm font-medium">{row.notification}</p>
                <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                  <dt className="text-muted-foreground">Vendor</dt>
                  <dd className="text-right font-medium">{row.vendor}</dd>
                  <dt className="text-muted-foreground">Elapsed</dt>
                  <dd className="text-right font-medium tabular-nums">{row.elapsed}</dd>
                  <dt className="text-muted-foreground">Owner</dt>
                  <dd className="text-right font-medium">{row.ownerRole}</dd>
                </dl>
                <Button
                  size="sm"
                  className="mt-3 w-full gap-1.5"
                  variant={breachedRow ? "default" : "outline"}
                  onClick={() =>
                    toast.success(`Escalated: ${row.vendor} → ${row.ownerRole} queue`)
                  }
                >
                  <ArrowUpRight className="h-4 w-4" /> Escalate to Queue
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "ok";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        tone === "danger" && "bg-cat-red-soft/50",
        tone === "ok" && "bg-cat-green-soft/50",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "danger" && "text-cat-red",
          tone === "ok" && "text-cat-green",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SlaBadge({ breached }: { breached: boolean }) {
  return breached ? (
    <Badge className="gap-1 bg-cat-red-soft text-cat-red">
      <AlertTriangle className="h-3 w-3" /> Breached
    </Badge>
  ) : (
    <Badge className="gap-1 bg-cat-green-soft text-cat-green">
      <CheckCircle2 className="h-3 w-3" /> On time
    </Badge>
  );
}
