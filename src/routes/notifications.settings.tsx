import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Lock, Plus, Info, Mail, MessageSquare, ChevronDown, X } from "lucide-react";


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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useRole } from "@/lib/role-context";
import { CATEGORIES, colorClasses, type CategoryId } from "@/lib/mock-data";
import { useRoleRouting, type AssignedRole } from "@/lib/role-routing";
import {
  useRoleAssignments,
  ROLE_OPTIONS,
  LOCKED_CATEGORIES,
  LOCKED_ROLES,
  type RoleOption,
} from "@/lib/role-assignments";


export const Route = createFileRoute("/notifications/settings")({
  head: () => ({
    meta: [{ title: "Preference Centre — PartnersBiz Comms Centre" }],
  }),
  component: SettingsPage,
});

type AdminChannel = "Mail" | "WhatsApp";
const ADMIN_CHANNELS: AdminChannel[] = ["Mail", "WhatsApp"];
type Digest = "Real-time" | "Daily" | "Weekly";

function SettingsPage() {
  const { role, employeeRole } = useRole();
  if (role === "internal_ops") return <Navigate to="/requests" />;
  if (role === "vendor_employee") return <EmployeePreferences employeeRole={employeeRole} />;
  return <SettingsInner isAdmin />;
}


function SettingsInner({ isAdmin }: { isAdmin: boolean }) {
  const [channels, setChannels] = useState<Record<CategoryId, AdminChannel>>({
    action_required: "Mail",
    finance_payments: "Mail",
    reports_analytics: "Mail",
    daily_ops: "Mail",
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
              Portal is always included. Choose what else gets added on top.
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
                    <div className="flex flex-wrap items-center gap-2">
                      {cat.mandatory ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
                                <ChannelIcon channel="Mail" />
                                Mail
                                <Lock className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Mail is mandatory for this category. Portal is always included.
                              You can add more ways to receive it.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="inline-flex rounded-lg border border-border p-0.5">
                          {ADMIN_CHANNELS.map((ch) => (
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => addExtra(cat.id)}
                      >
                        <Plus className="h-4 w-4" /> Add another way
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Role Assignment — Admin only */}
        {isAdmin ? <RoleAssignmentSection /> : null}



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
                Assign which employee role receives each category.
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

function ChannelIcon({ channel }: { channel: AdminChannel | "Mail" }) {
  if (channel === "Mail") return <Mail className="h-3.5 w-3.5" />;
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RoleAssignmentSection() {
  const { assignments, setAssignments } = useRoleAssignments();


  const toggle = (cat: CategoryId, role: RoleOption) => {
    setAssignments((p) => {
      const current = p[cat] ?? [];
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...p, [cat]: next };
    });
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-semibold">Role Assignment</h2>
        <p className="text-sm text-muted-foreground">
          Assign which roles can see each category. Individual users can set their own
          channel preference underneath this, but never above it.
        </p>
      </div>
      <div className="divide-y divide-border">
        {CATEGORIES.map((cat) => {
          const c = colorClasses[cat.color];
          const isLocked = LOCKED_CATEGORIES.includes(cat.id);
          const selected = assignments[cat.id] ?? [];
          return (
            <div
              key={cat.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-4 sm:flex sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} />
                <span className="truncate font-medium">{cat.label}</span>
              </div>
              <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                {isLocked ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex max-w-md cursor-not-allowed flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
                          {LOCKED_ROLES.map((r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className="bg-background text-[11px] font-normal text-foreground"
                            >
                              {r}
                            </Badge>
                          ))}
                          <Lock className="ml-1 h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Mandatory, visible to Account Owner and Admin by default, cannot be
                        restricted.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <RolePicker
                    selected={selected}
                    onToggle={(r) => toggle(cat.id, r)}
                    onRemove={(r) => toggle(cat.id, r)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-2 border-t border-border p-4 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Action Required and Account &amp; Access are mandatory for Account Owner and Admin
        and cannot be restricted.
      </div>
    </section>
  );
}

function RolePicker({
  selected,
  onToggle,
  onRemove,
}: {
  selected: RoleOption[];
  onToggle: (r: RoleOption) => void;
  onRemove: (r: RoleOption) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {selected.map((r) => (
        <Badge
          key={r}
          variant="outline"
          className="gap-1 bg-background text-[11px] font-normal text-foreground"
        >
          {r}
          <button
            type="button"
            onClick={() => onRemove(r)}
            className="ml-0.5 rounded hover:text-foreground/70"
            aria-label={`Remove ${r}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add role
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <div className="space-y-1">
            {ROLE_OPTIONS.map((r) => {
              const checked = selected.includes(r);
              return (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(r)}
                  />
                  <span>{r}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type EmployeeChannel = "Mail" | "WhatsApp" | "Both";
const EMPLOYEE_CHANNELS: EmployeeChannel[] = ["Mail", "WhatsApp", "Both"];

function EmployeePreferences({ employeeRole }: { employeeRole: string }) {
  const { assignments } = useRoleAssignments();
  const [prefs, setPrefs] = useState<Record<CategoryId, EmployeeChannel>>({
    action_required: "Both",
    finance_payments: "Mail",
    reports_analytics: "Mail",
    daily_ops: "Mail",
    reminders: "WhatsApp",
    account_access: "Mail",
  });

  const visible = CATEGORIES.filter(
    (cat) =>
      !cat.mandatory &&
      (assignments[cat.id] ?? []).includes(employeeRole as RoleOption),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Preference Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set your personal delivery preference for the categories assigned to you. Your
            admin controls which categories you can see, this only controls how you receive
            them.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Your delivery channels</h2>
            <p className="text-sm text-muted-foreground">
              Showing categories assigned to your role: {employeeRole}
            </p>
          </div>
          {visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No non-mandatory categories are assigned to your role yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map((cat) => {
                const c = colorClasses[cat.color];
                return (
                  <div
                    key={cat.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 sm:flex sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} />
                      <span className="truncate font-medium">{cat.label}</span>
                    </div>
                    <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                      <div className="inline-flex rounded-lg border border-border p-0.5">
                        {EMPLOYEE_CHANNELS.map((ch) => (
                          <button
                            key={ch}
                            onClick={() =>
                              setPrefs((p) => ({ ...p, [cat.id]: ch }))
                            }
                            className={cn(
                              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                              prefs[cat.id] === ch
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-start gap-2 border-t border-border p-4 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Mandatory categories (Action Required, Account &amp; Access) are always delivered
            and are not shown here.
          </div>
        </section>
      </div>
    </AppShell>
  );
}


