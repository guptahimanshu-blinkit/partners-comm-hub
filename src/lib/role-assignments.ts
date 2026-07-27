import { useCallback, useEffect, useState } from "react";
import type { CategoryId } from "./mock-data";

export const ROLE_OPTIONS: string[] = [
  "Account Owner",
  "Admin",
  "Finance Manager",
  "Supply Chain Manager",
  "Warehouse Ops",
  "Catalog Lead",
  "Dispatch Executive",
  "Quality Lead",
  "Commercial Manager",
];
export type RoleOption = string;

export const LOCKED_CATEGORIES: CategoryId[] = ["action_required", "account_access"];
export const LOCKED_ROLES: RoleOption[] = ["Account Owner", "Admin"];

export type RoleAssignments = Record<CategoryId, RoleOption[]>;

export const DEFAULT_ASSIGNMENTS: RoleAssignments = {
  action_required: LOCKED_ROLES,
  finance_payments: ["Finance Manager", "Admin"],
  reports_analytics: ["Supply Chain Manager"],
  daily_ops: ["Supply Chain Manager"],
  reminders: ["Supply Chain Manager", "Finance Manager"],
  account_access: LOCKED_ROLES,
};

const STORAGE_KEY = "pbc_role_assignments";
const EVENT = "pbc_role_assignments_changed";

function readStored(): RoleAssignments {
  if (typeof window === "undefined") return DEFAULT_ASSIGNMENTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ASSIGNMENTS;
    const parsed = JSON.parse(raw) as Partial<RoleAssignments>;
    return { ...DEFAULT_ASSIGNMENTS, ...parsed };
  } catch {
    return DEFAULT_ASSIGNMENTS;
  }
}

export function useRoleAssignments() {
  const [assignments, setState] = useState<RoleAssignments>(DEFAULT_ASSIGNMENTS);

  useEffect(() => {
    setState(readStored());
    const onLocal = () => setState(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(readStored());
    };
    window.addEventListener(EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setAssignments = useCallback(
    (updater: RoleAssignments | ((prev: RoleAssignments) => RoleAssignments)) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.dispatchEvent(new Event(EVENT));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  return { assignments, setAssignments };
}

export function isCategoryAssignedTo(
  category: CategoryId,
  role: string,
  assignments: RoleAssignments,
): boolean {
  const roles = assignments[category] ?? [];
  return roles.includes(role as RoleOption);
}
