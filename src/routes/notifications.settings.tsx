import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Lock, Info, ChevronDown, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useRole } from "@/lib/role-context";
import {
  CATEGORIES,
  colorClasses,
  type Category,
  type CategoryId,
} from "@/lib/mock-data";
import { COMM_CATALOG, commsByCategory } from "@/lib/comm-catalog";
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



type CommChannels = { mail: boolean; whatsapp: boolean };
type CommPrefs = Record<string, CommChannels>; // key = comm id from COMM_CATALOG

function buildDefaultPrefs(): CommPrefs {
  const out: CommPrefs = {};
  for (const item of COMM_CATALOG) {
    out[item.id] = { ...item.defaults };
  }
  return out;
}


function SettingsPage() {
  const { role, employeeRole } = useRole();
  if (role === "internal_ops") return <Navigate to="/requests" />;
  if (role === "vendor_employee")
    return <EmployeePreferences employeeRole={employeeRole} />;
  return <SettingsInner isAdmin />;
}

function SettingsInner({ isAdmin }: { isAdmin: boolean }) {
  const [prefs, setPrefs] = useState<CommPrefs>(() => buildDefaultPrefs());
  const [digest, setDigest] = useState<Record<string, Digest>>({
    reports_analytics: "Weekly",
    daily_ops: "Daily",
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Preference Centre
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Configure how each notification category is delivered for ITC Limited."
              : "Your personal delivery preferences. Org-wide settings are managed by your Vendor Admin."}
          </p>
        </div>

        <CommSubscriptionSection
          categories={CATEGORIES}
          prefs={prefs}
          setPrefs={setPrefs}
          footerNote="Mandatory comms are always delivered on Mail. You can add WhatsApp on top."
        />

        {isAdmin ? <RoleAssignmentSection /> : null}


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
            <p className="text-sm font-medium">
              Role routing is managed by your Vendor Admin
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Only admins can change which roles receive which categories.
            </p>
          </section>
        )}

        <PageDisclaimer />
      </div>
    </AppShell>
  );
}

function PageDisclaimer() {
  return (
    <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Prototype, sample data only, built to demonstrate the workflow, not the
      actual current mandatory list or channel availability.
    </p>
  );
}


function CommSubscriptionSection({
  categories,
  prefs,
  setPrefs,
  footerNote,
  emptyState,
}: {
  categories: Category[];
  prefs: CommPrefs;
  setPrefs: React.Dispatch<React.SetStateAction<CommPrefs>>;
  footerNote: string;
  emptyState?: string;
}) {
  const [openId, setOpenId] = useState<CategoryId | null>(
    categories[0]?.id ?? null,
  );

  const toggle = (
    commId: string,
    channel: keyof CommChannels,
  ) => {
    setPrefs((p) => {
      const cur = p[commId] ?? { mail: true, whatsapp: false };
      const item = COMM_CATALOG.find((c) => c.id === commId);
      // WhatsApp can't be toggled on for comms where it isn't available.
      if (channel === "whatsapp" && item && !item.whatsappAvailable) return p;
      // Mandatory comms: Mail is locked on.
      if (channel === "mail" && item?.mandatory) return p;
      return { ...p, [commId]: { ...cur, [channel]: !cur[channel] } };
    });
  };


  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-semibold">Delivery channels</h2>
        <p className="text-sm text-muted-foreground">
          Portal is always included. Choose what else gets added on top —
          per comm.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          {emptyState ?? "No categories assigned yet."}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {categories.map((cat) => {
            const c = colorClasses[cat.color];
            const isOpen = openId === cat.id;
            const summary = summarize(cat, prefs);
            return (
              <div key={cat.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : cat.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      c.dot,
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{cat.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {summary}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-muted/20 px-4 py-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Comm type</TableHead>
                          <TableHead className="w-[110px] text-center">
                            Mail
                          </TableHead>
                          <TableHead className="w-[160px] text-center">
                            WhatsApp
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commsByCategory(cat.id).map((comm) => {
                          const val =
                            prefs[comm.id] ?? { mail: true, whatsapp: false };
                          const mailLocked = !!comm.mandatory;
                          return (
                            <TableRow key={comm.id}>
                              <TableCell className="font-medium">
                                <span className="inline-flex items-center gap-2">
                                  {comm.name}
                                  {comm.mandatory && (
                                    <Badge
                                      variant="outline"
                                      className="gap-1 text-[10px] text-muted-foreground"
                                    >
                                      <Lock className="h-3 w-3" /> Mandatory
                                    </Badge>
                                  )}
                                </span>
                              </TableCell>
                              <ChannelCell
                                checked={val.mail}
                                locked={mailLocked}
                                onToggle={() => toggle(comm.id, "mail")}
                                label={`Mail for ${comm.name}`}
                              />

                              {comm.whatsappAvailable ? (
                                <ChannelCell
                                  checked={val.whatsapp}
                                  locked={false}
                                  onToggle={() => toggle(comm.id, "whatsapp")}
                                  label={`WhatsApp for ${comm.name}`}
                                />
                              ) : (
                                <TableCell className="text-center">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                          <span aria-hidden>—</span>
                                          <span className="hidden sm:inline">
                                            Not on WhatsApp
                                          </span>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        This comm isn't sent on WhatsApp today.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>

                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 border-t border-border p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {footerNote}
      </div>
    </section>
  );
}


function ChannelCell({
  checked,
  locked,
  onToggle,
  label,
}: {
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const box = (
    <Checkbox
      checked={checked}
      disabled={locked}
      onCheckedChange={onToggle}
      aria-label={locked ? `${label} (locked)` : label}
    />
  );
  if (!locked) {
    return <TableCell className="text-center">{box}</TableCell>;
  }
  return (
    <TableCell className="text-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              {box}
              <Lock className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Mandatory, at least one channel required.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  );
}

function summarize(cat: Category, prefs: CommPrefs) {
  const items = commsByCategory(cat.id);
  const total = items.length;
  let mail = 0;
  let wa = 0;
  let both = 0;
  let off = 0;
  for (const comm of items) {
    const v = prefs[comm.id] ?? { mail: true, whatsapp: false };
    if (v.mail && v.whatsapp) both++;
    else if (v.mail) mail++;
    else if (v.whatsapp) wa++;
    else off++;
  }
  const parts: string[] = [`${total} comm${total === 1 ? "" : "s"}`];
  if (both) parts.push(`${both} on Mail + WhatsApp`);
  if (mail) parts.push(`${mail} on Mail`);
  if (wa) parts.push(`${wa} on WhatsApp`);
  if (off) parts.push(`${off} off`);
  return parts.join(" · ");
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
                  <SelectItem value="Supply Chain Manager">
                    Supply Chain Manager
                  </SelectItem>
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
          Assign which roles can see each category. Individual users can set
          their own channel preference underneath this, but never above it.
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
                        Mandatory, visible to Account Owner and Admin by
                        default, cannot be restricted.
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
        Action Required and Account &amp; Access are mandatory for Account
        Owner and Admin and cannot be restricted.
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

function EmployeePreferences({ employeeRole }: { employeeRole: string }) {
  const { assignments } = useRoleAssignments();
  const [prefs, setPrefs] = useState<CommPrefs>(() =>
    buildDefaultPrefs(),
  );

  const visible = useMemo(
    () =>
      CATEGORIES.filter(
        (cat) =>
          cat.mandatory ||
          (assignments[cat.id] ?? []).includes(employeeRole as RoleOption),
      ),
    [assignments, employeeRole],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Preference Centre
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set your personal delivery preference for the categories assigned
            to you. Your admin controls which categories you can see, this only
            controls how you receive them.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Showing categories assigned to your role: {employeeRole}
          </p>
        </div>

        <CommSubscriptionSection
          categories={visible}
          prefs={prefs}
          setPrefs={setPrefs}
          footerNote="Mandatory comms are always delivered on Mail. You can add WhatsApp on top."
          emptyState="No categories are assigned to your role yet."
        />

        <PageDisclaimer />
      </div>

    </AppShell>
  );
}
