import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Clock, Info, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/po-extension-request")({
  head: () => ({
    meta: [{ title: "PO Extension Request — PartnersBiz Comms Centre" }],
  }),
  component: PoExtensionPage,
});

const REASONS = [
  "Stock replenishment in progress",
  "Transport / logistics delay",
  "Awaiting production batch",
  "Facility scheduling conflict",
  "Other",
];

type Result = { status: "auto" | "pending"; hours: number } | null;

function PoExtensionPage() {
  const [reason, setReason] = useState<string>("");
  const [reasonText, setReasonText] = useState("");
  const [newDate, setNewDate] = useState("2026-07-16");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState(false);

  const currentExpiry = "2026-07-14";

  const hoursRequested = Math.max(
    0,
    Math.round(
      (new Date(newDate).getTime() - new Date(currentExpiry).getTime()) / 36e5,
    ),
  );

  const submit = () => {
    if (!reason) {
      setError(true);
      return;
    }
    setError(false);
    // First request + under 24h => auto-approved, else pending
    const auto = hoursRequested > 0 && hoursRequested <= 24;
    setResult({ status: auto ? "auto" : "pending", hours: hoursRequested });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="mb-6 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            PO Extension Request
          </h1>
        </div>

        {result ? (
          <ResultCard result={result} onReset={() => setResult(null)} />
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <p className="text-sm text-muted-foreground">
                Request more time to schedule an ASN against a purchase order before it
                expires.
              </p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-2">
                <Label htmlFor="poid">PO ID</Label>
                <Input
                  id="poid"
                  defaultValue="5383910053280"
                  readOnly
                  className="bg-muted/40 font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  Pre-filled from Farukhnagar F2 near-expiry reminder.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="cur">Current expiry date</Label>
                  <Input
                    id="cur"
                    type="date"
                    value={currentExpiry}
                    readOnly
                    className="bg-muted/40"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new">Requested new expiry</Label>
                  <Input
                    id="new"
                    type="date"
                    value={newDate}
                    min={currentExpiry}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
              </div>

              {hoursRequested > 0 && (
                <p className="text-xs text-muted-foreground">
                  Requesting{" "}
                  <span className="font-semibold text-foreground">
                    {hoursRequested} hours
                  </span>{" "}
                  extension.
                </p>
              )}

              <div className="grid gap-2">
                <Label>
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className={cn(error && "border-destructive")}>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error && (
                  <p className="text-xs text-destructive">Please select a reason.</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rt">Additional details</Label>
                <Textarea
                  id="rt"
                  rows={3}
                  placeholder="Add any context for the category manager…"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Max 1 extension per PO, up to 72 hours. Requests under 24 hours on a
                first-time PO are auto-approved.
              </div>

              <Button className="w-full gap-1.5" onClick={submit}>
                Submit request <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ResultCard({
  result,
  onReset,
}: {
  result: NonNullable<Result>;
  onReset: () => void;
}) {
  const auto = result.status === "auto";
  return (
    <div
      className={cn(
        "rounded-xl border p-6 text-center",
        auto ? "border-cat-green/40 bg-cat-green-soft/40" : "border-cat-amber/40 bg-cat-amber-soft/40",
      )}
    >
      <div
        className={cn(
          "mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full",
          auto ? "bg-cat-green-soft" : "bg-cat-amber-soft",
        )}
      >
        {auto ? (
          <CheckCircle2 className="h-8 w-8 text-cat-green" />
        ) : (
          <Clock className="h-8 w-8 text-cat-amber" />
        )}
      </div>
      <h2
        className={cn(
          "text-lg font-bold",
          auto ? "text-cat-green" : "text-cat-amber",
        )}
      >
        {auto ? "Auto-approved" : "Pending Category Manager Review"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {auto
          ? `Your ${result.hours}-hour extension for PO #5383910053280 was auto-approved. The new expiry has been applied and your reminder cleared.`
          : `Your ${result.hours}-hour extension for PO #5383910053280 has been submitted for review. Extensions over 24 hours require a category manager's approval — you'll be notified of the decision.`}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="outline" onClick={onReset}>
          Submit another
        </Button>
      </div>
    </div>
  );
}
