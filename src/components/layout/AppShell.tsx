import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  SlidersHorizontal,
  ShieldAlert,
  
  CalendarPlus,
  PlusCircle,
  Inbox,
  Truck,
  Menu,
  ChevronDown,
  Radio,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import {
  useRole,
  ROLE_LABELS,
  type PortalRole,
  type InternalRole,
} from "@/lib/role-context";
import type { EmployeeRole } from "@/lib/mock-data";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Bell;
  roles: PortalRole[];
}

const NAV: NavItem[] = [
  {
    to: "/notifications",
    label: "Notification Centre",
    icon: Bell,
    roles: ["vendor_admin", "vendor_employee"],
  },
  {
    to: "/notifications/settings",
    label: "Preference Centre",
    icon: SlidersHorizontal,
    roles: ["vendor_admin", "vendor_employee"],
  },
  {
    to: "/add-communication",
    label: "Add Communication",
    icon: PlusCircle,
    roles: ["internal_ops"],
  },
  {
    to: "/requests",
    label: "Requests",
    icon: Inbox,
    roles: ["internal_ops"],
  },
  {
    to: "/notifications/schedule",
    label: "Add New Notification",
    icon: CalendarPlus,
    roles: ["internal_ops"],
  },
  {
    to: "/vendor-delivery-profiles",
    label: "Vendor Delivery Profiles",
    icon: Truck,
    roles: ["internal_ops"],
  },
];

const SUPPORT_NAV: NavItem[] = [
  {
    to: "/notifications/escalation-queue",
    label: "Escalation Queue",
    icon: ShieldAlert,
    roles: ["vendor_admin", "vendor_employee", "internal_ops"],
  },
];


function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Radio className="h-5 w-5" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[15px] font-bold tracking-tight text-sidebar-foreground">
          PartnersBiz
        </div>
        <div className="truncate text-[11px] font-medium text-muted-foreground">
          Comms Centre
        </div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { role, internalRole } = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((n) => {
    if (!n.roles.includes(role)) return false;
    if (
      n.to === "/add-communication" &&
      role === "internal_ops" &&
      internalRole === "Template Submitter"
    )
      return false;
    if (
      n.to === "/vendor-delivery-profiles" &&
      role === "internal_ops"
    )
      return false;
    return true;
  });
  const supportItems = SUPPORT_NAV.filter((n) => {
    if (!n.roles.includes(role)) return false;
    if (
      n.to === "/notifications/escalation-queue" &&
      role === "internal_ops"
    )
      return false;
    return true;
  });

  const renderItem = (item: NavItem) => {
    const active =
      item.to === "/notifications"
        ? pathname === "/notifications"
        : pathname.startsWith(item.to);
    const Icon = item.icon;
    const label = item.label;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex flex-col gap-1">{items.map(renderItem)}</nav>
      {supportItems.length > 0 && (
        <div>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Help & Support
          </p>
          <nav className="flex flex-col gap-1">{supportItems.map(renderItem)}</nav>
        </div>
      )}
    </div>
  );
}


function RoleSwitcher() {
  const {
    role,
    setRole,
    employeeRole,
    setEmployeeRole,
    internalRole,
    setInternalRole,
  } = useRole();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={role} onValueChange={(v) => setRole(v as PortalRole)}>
        <SelectTrigger className="h-9 w-full sm:w-[190px]" aria-label="Switch role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ROLE_LABELS) as PortalRole[]).map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {role === "vendor_employee" && (
        <Select
          value={employeeRole}
          onValueChange={(v) => setEmployeeRole(v as EmployeeRole)}
        >
          <SelectTrigger className="h-9 w-full sm:w-[190px]" aria-label="Employee role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Account Owner">Account Owner</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Finance Manager">Finance Manager</SelectItem>
            <SelectItem value="Supply Chain Manager">Supply Chain Manager</SelectItem>
          </SelectContent>

        </Select>
      )}
      {role === "internal_ops" && (
        <Select
          value={internalRole}
          onValueChange={(v) => setInternalRole(v as InternalRole)}
        >
          <SelectTrigger className="h-9 w-full sm:w-[190px]" aria-label="Internal ops role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Template Submitter">Template Submitter</SelectItem>
            <SelectItem value="Approver">Approver</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}


export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList />
        </div>
        <div className="border-t border-sidebar-border p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Prototype · sample data only. Switch roles from the top bar to preview each
            experience.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border lg:hidden">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center border-b border-sidebar-border px-5">
                <Logo />
              </div>
              <div className="p-3">
                <NavList onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <span className="truncate text-sm font-semibold text-foreground">
              ITC Limited
            </span>
            <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
              MANUFACTURER
            </Badge>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <RoleSwitcher />
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                H
              </div>
              <div className="hidden leading-tight xl:block">
                <div className="text-sm font-medium text-foreground">Himanshu Gupta</div>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground xl:block" />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
