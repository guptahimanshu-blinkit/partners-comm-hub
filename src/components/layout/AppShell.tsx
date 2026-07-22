import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  SlidersHorizontal,
  
  CalendarPlus,
  PlusCircle,
  Inbox,
  Menu,
  ChevronDown,
  Radio,
  BarChart3,
  ClipboardCheck,
  Megaphone,
} from "lucide-react";


import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import {
  useRole,
  ROLE_LABELS,
  type PortalRole,
  type InternalRole,
} from "@/lib/role-context";
import type { EmployeeRole } from "@/lib/mock-data";
import {
  useRoleAssignments,
  isCategoryAssignedTo,
} from "@/lib/role-assignments";
import { usePublishLogs } from "@/lib/requests-store";

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
    to: "/comms-performance",
    label: "Comms Performance",
    icon: BarChart3,
    roles: ["internal_ops"],
  },
  {
    to: "/notifications/schedule",
    label: "Add New Notification",
    icon: CalendarPlus,
    roles: ["internal_ops"],
  },
  {
    to: "/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    roles: ["internal_ops"],
  },

  {
    to: "/help/my-tickets",
    label: "Ticket Scorecard",
    icon: ClipboardCheck,
    roles: ["vendor_admin", "vendor_employee"],
  },
];

const SUPPORT_NAV: NavItem[] = [];



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
  const { role, internalRole, employeeRole } = useRole();
  const { assignments } = useRoleAssignments();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const publishLogs = usePublishLogs();
  const pendingReviewCount = publishLogs.filter(
    (l) => l.status === "Pending Review",
  ).length;
  const items = NAV.filter((n) => {
    if (!n.roles.includes(role)) return false;
    if (
      n.to === "/add-communication" &&
      role === "internal_ops"
    )
      return false;
    if (n.to === "/help/my-tickets" && role === "vendor_employee") {
      return isCategoryAssignedTo("reports_analytics", employeeRole, assignments);
    }
    return true;
  });
  const supportItems = SUPPORT_NAV.filter((n) => n.roles.includes(role));

  const renderItem = (item: NavItem) => {
    const active =
      item.to === "/notifications"
        ? pathname === "/notifications"
        : pathname.startsWith(item.to);
    const Icon = item.icon;
    const label = item.label;
    const showBadge =
      item.to === "/requests" &&
      role === "internal_ops" &&
      internalRole === "Approver" &&
      pendingReviewCount > 0;
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
        {showBadge && (
          <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-cat-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-cat-amber">
            {pendingReviewCount}
          </span>
        )}
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

  const employeeSubRoles: EmployeeRole[] = [
    "Account Owner",
    "Finance Manager",
    "Supply Chain Manager",
  ];
  const internalSubRoles: InternalRole[] = ["Template Submitter", "Approver"];

  const ROLE_SURFACE_LABELS: Record<PortalRole, string> = {
    vendor_admin: "Vendor Admin (PartnersBiz Portal)",
    vendor_employee: "Vendor Employee (PartnersBiz Portal)",
    internal_ops: "Internal Ops (Blinkit) (Workdesk)",
  };

  const label =
    role === "vendor_employee"
      ? `${ROLE_SURFACE_LABELS[role]} · ${employeeRole}`
      : role === "internal_ops"
        ? `${ROLE_SURFACE_LABELS[role]} · ${internalRole}`
        : ROLE_SURFACE_LABELS[role];


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full justify-between gap-2 sm:w-[280px]"
          aria-label="Switch role"
        >
          <span className="truncate text-left">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px]">
        <DropdownMenuLabel>Switch role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={role}
          onValueChange={(v) => setRole(v as PortalRole)}
        >
          {(Object.keys(ROLE_LABELS) as PortalRole[]).map((r) => {
            if (r === "vendor_employee") {
              return (
                <DropdownMenuSub key={r}>
                  <DropdownMenuSubTrigger className="pl-8 data-[state=open]:bg-accent">
                    <span
                      className={cn(
                        "flex-1",
                        role === r && "font-medium",
                      )}
                    >
                      {ROLE_SURFACE_LABELS[r]}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[220px]">
                    <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
                      {ROLE_SURFACE_LABELS[r]}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={role === r ? employeeRole : ""}
                      onValueChange={(v) => {
                        if (role !== r) setRole(r);
                        setEmployeeRole(v as EmployeeRole);
                      }}
                    >
                      {employeeSubRoles.map((sr) => (
                        <DropdownMenuRadioItem key={sr} value={sr}>
                          {sr}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            }
            if (r === "internal_ops") {
              return (
                <DropdownMenuSub key={r}>
                  <DropdownMenuSubTrigger className="pl-8 data-[state=open]:bg-accent">
                    <span
                      className={cn(
                        "flex-1",
                        role === r && "font-medium",
                      )}
                    >
                      {ROLE_SURFACE_LABELS[r]}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[220px]">
                    <DropdownMenuLabel className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
                      {ROLE_SURFACE_LABELS[r]}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={role === r ? internalRole : ""}
                      onValueChange={(v) => {
                        if (role !== r) setRole(r);
                        setInternalRole(v as InternalRole);
                      }}
                    >
                      {internalSubRoles.map((sr) => (
                        <DropdownMenuRadioItem key={sr} value={sr}>
                          {sr}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            }
            return (
              <DropdownMenuRadioItem key={r} value={r}>
                {ROLE_SURFACE_LABELS[r]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


// Route → breadcrumb trail. Each entry is the segment path shown after "PartnersBiz".
const BREADCRUMBS: Array<{ match: (p: string) => boolean; trail: string[] }> = [
  { match: (p) => p === "/notifications", trail: ["Notification Centre"] },
  { match: (p) => p.startsWith("/notifications/settings"), trail: ["Preference Centre"] },
  { match: (p) => p.startsWith("/notifications/schedule"), trail: ["Workdesk", "Add New Notification"] },
  
  { match: (p) => p.startsWith("/notifications/send-calendar"), trail: ["Send Calendar"] },
  { match: (p) => p.startsWith("/requests"), trail: ["Workdesk", "Requests"] },
  { match: (p) => p.startsWith("/comms-performance"), trail: ["Workdesk", "Comms Performance"] },
  { match: (p) => p.startsWith("/campaigns"), trail: ["Workdesk", "Campaigns"] },

  { match: (p) => p.startsWith("/help/my-tickets"), trail: ["Ticket Scorecard"] },

  { match: (p) => p.startsWith("/add-communication"), trail: ["Add Communication"] },
  { match: (p) => p.startsWith("/vendor-delivery-profiles"), trail: ["Vendor Delivery Profiles"] },
  { match: (p) => p.startsWith("/po-extension-request"), trail: ["PO Extension Request"] },
  { match: (p) => p === "/", trail: ["Home"] },
];

function Breadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const entry = BREADCRUMBS.find((b) => b.match(pathname));
  const trail = entry?.trail ?? [];
  return (
    <nav
      aria-label="Breadcrumb"
      className="min-w-0 truncate text-[13px] leading-none text-muted-foreground"
    >
      <span className="font-semibold text-foreground">PartnersBiz</span>
      {trail.map((seg, i) => (
        <span key={i}>
          <span className="mx-1.5 text-muted-foreground/60">/</span>
          <span
            className={cn(
              i === trail.length - 1 ? "font-medium text-foreground" : "",
            )}
          >
            {seg}
          </span>
        </span>
      ))}
    </nav>
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

          <Breadcrumb />

          <div className="ml-auto hidden min-w-0 items-center gap-2 md:flex">
            <span className="truncate text-sm font-semibold text-foreground">
              ITC Limited
            </span>
            <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
              MANUFACTURER
            </Badge>
          </div>

          <div className="flex items-center gap-3">
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
