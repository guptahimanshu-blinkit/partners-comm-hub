import { useEffect, useState, useCallback } from "react";
import type { CategoryId } from "./mock-data";

export type AssignedRole = "Supply Chain Manager" | "Finance" | "All Roles";

export interface RoutingEntry {
  role: AssignedRole;
  mode: string;
}

export type RoleRouting = Record<CategoryId, RoutingEntry>;

export const DEFAULT_ROUTING: RoleRouting = {
  action_required: { role: "Supply Chain Manager", mode: "Real-time" },
  finance_payments: { role: "Finance", mode: "Real-time" },
  reports_analytics: { role: "Supply Chain Manager", mode: "Weekly digest" },
  daily_ops: { role: "Supply Chain Manager", mode: "Daily digest" },
  reminders: { role: "Supply Chain Manager", mode: "Real-time" },
  account_access: { role: "All Roles", mode: "Real-time" },
};

const STORAGE_KEY = "pbc_role_routing";

function readStored(): RoleRouting {
  if (typeof window === "undefined") return DEFAULT_ROUTING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ROUTING;
    const parsed = JSON.parse(raw) as Partial<RoleRouting>;
    return { ...DEFAULT_ROUTING, ...parsed };
  } catch {
    return DEFAULT_ROUTING;
  }
}

export function useRoleRouting() {
  const [routing, setRoutingState] = useState<RoleRouting>(DEFAULT_ROUTING);

  useEffect(() => {
    setRoutingState(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRoutingState(readStored());
    };
    window.addEventListener("storage", onStorage);
    const onLocal = () => setRoutingState(readStored());
    window.addEventListener("pbc_role_routing_changed", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pbc_role_routing_changed", onLocal);
    };
  }, []);

  const setRouting = useCallback(
    (updater: RoleRouting | ((prev: RoleRouting) => RoleRouting)) => {
      setRoutingState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.dispatchEvent(new Event("pbc_role_routing_changed"));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  return { routing, setRouting };
}

export function isCategoryVisibleTo(
  category: CategoryId,
  employeeRole: string,
  routing: RoleRouting,
): boolean {
  const assigned = routing[category]?.role;
  if (!assigned) return false;
  if (assigned === "All Roles") return true;
  return assigned === employeeRole;
}
