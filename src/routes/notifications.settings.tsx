import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Lock, Plus, Info, Mail, MonitorSmartphone, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { toast } from "sonner";
import { useRole } from "@/lib/role-context";
import { CATEGORIES, colorClasses, type Channel, type CategoryId } from "@/lib/mock-data";

export const Route = createFileRoute("/notifications/settings")({
  head: () => ({
    meta: [{ title: "Preference Centre — PartnersBiz Comms Centre" }],
  }),
  component: SettingsPage,
});

const CHANNELS: Channel[] = ["Mail", "Portal", "Both"];
type Digest = "Real-time" | "Daily" | "Weekly";

function SettingsPage() {
  const { role } = useRole();
  if (role === "internal_ops") return <Navigate to="/notifications/escalation-queue" />;
  return <SettingsInner isAdmin={role === "vendor_admin"} />;
}

function SettingsInner({ isAdmin }: { isAdmin: boolean }) {
  const [channels, setChannels] = useState<Record<CategoryId, Channel>>({
    action_required: "Both",
    finance_payments: "Both",
    reports_analytics: "Portal",
    daily_ops: "Portal",
    reminders: "Mail",
    account_access: "Mail",
  });
  const [extras, setExtras] = useState<Record<string, string[]>>({});
  const [digest, setDigest] = useState<Record<string, Digest>>({
    reports_analytics: "Weekly",
    daily_ops: "Daily",
  });

  const addExtra = (cat: CategoryId) => {
    setExtras((prev) => ({ ...prev, [cat]: [...(prev[cat] ?? []), "SMS"] }));
    toast.success("SMS added as an additional delivery channel");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Preference Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Configure how each notification category is delivered for ITC Limited."
              : "Your personal delivery preferences. Org-wide settings are managed by your Vendor Admin."}
          </p>
        </div>

        {/* Channel preferences */}
        <section className="mb-8 rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Delivery channels</h2>
            <p className="text-sm text-muted-foreground">
              Mandatory categories are always delivered — you can add channels but not remove
              the default.
            </p>
          </div>
          <div className="divide-y divide-border">
            {CATEGORIES.map((cat) => {
              const c = colorClasses[cat.color];
              return (
                <div
                  key={cat.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 sm:flex sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{cat.label}</span>
                        {cat.mandatory && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px] text-muted-foreground"
                          >
                            <Lock className="h-3 w-3" /> Mandatory
                          </Badge>
                        )}
                      </div>
                      {extras[cat.id]?.length ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Also via: {extras[cat.id].join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                    {cat.mandatory ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
                                <ChannelIcon channel={channels[cat.id]} />
                                {channels[cat.id]}
                                <Lock className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              This is a critical category. Its default delivery can't be turned
                              off — you can only add more ways to receive it.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => addExtra(cat.id)}
                        >
                          <Plus className="h-4 w-4" /> Add another way
                        </Button>
                      </div>
                    ) : (
                      <div className="inline-flex rounded-lg border border-border p-0.5">
                        {CHANNELS.map((ch) => (
                          <button
                            key={ch}
                            onClick={() =>
                              setChannels((p) => ({ ...p, [cat.id]: ch }))
                            }
                            className={cn(
                              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                              channels[cat.id] === ch
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Digest frequency */}
        <section className="mb-8 rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Digest frequency</h2>
            <p className="text-sm text-muted-foreground">
              Available for informational categories only. Weekly is the minimum frequency.
            </p>
          </div>
          <div className="divide-y divide-border">
            {CATEGORIES.filter((c) => c.digestEligible).map((cat) => (
              <div
                key={cat.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      colorClasses[cat.color].dot,
                    )}
                  />
                  <span className="font-medium">{cat.label}</span>
                </div>
                <Select
                  value={digest[cat.id] ?? "Weekly"}
                  onValueChange={(v) =>
                    setDigest((p) => ({ ...p, [cat.id]: v as Digest }))
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Real-time">Real-time</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly (min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 border-t border-border p-4 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            You can't set a digest lower than Weekly — this prevents important summaries from
            being missed.
          </div>
        </section>

        {/* Role routing table — Admin only */}
        {isAdmin ? (
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold">Role routing</h2>
              <p className="text-sm text-muted-foreground">
                Assign which employee role receives each category, and how.
              </p>
            </div>
            <div className="overflow-x-auto">
              <RoleRoutingTable />
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <Lock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Role routing is managed by your Vendor Admin</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Only admins can change which roles receive which categories.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel === "Mail") return <Mail className="h-3.5 w-3.5" />;
  if (channel === "Portal") return <MonitorSmartphone className="h-3.5 w-3.5" />;
  return <MessageSquare className="h-3.5 w-3.5" />;
}

function RoleRoutingTable() {
  const { routing, setRouting } = useRoleRouting();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Assigned role</TableHead>
          <TableHead>Delivery mode</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {CATEGORIES.map((cat) => (
          <TableRow key={cat.id}>
            <TableCell className="font-medium">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    colorClasses[cat.color].dot,
                  )}
                />
                {cat.label}
              </span>
            </TableCell>
            <TableCell>
              <Select
                value={routing[cat.id].role}
                onValueChange={(v) =>
                  setRouting((p) => ({
                    ...p,
                    [cat.id]: { ...p[cat.id], role: v as AssignedRole },
                  }))
                }
              >
                <SelectTrigger className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supply Chain Manager">Supply Chain Manager</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="All Roles">All Roles</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Select
                value={routing[cat.id].mode}
                onValueChange={(v) =>
                  setRouting((p) => ({ ...p, [cat.id]: { ...p[cat.id], mode: v } }))
                }
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Real-time">Real-time</SelectItem>
                  <SelectItem value="Daily digest">Daily digest</SelectItem>
                  <SelectItem value="Weekly digest">Weekly digest</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
