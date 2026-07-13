import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { EmployeeRole } from "./mock-data";

export type PortalRole = "vendor_admin" | "vendor_employee" | "internal_ops";

export interface RoleState {
  role: PortalRole;
  employeeRole: EmployeeRole;
  setRole: (r: PortalRole) => void;
  setEmployeeRole: (r: EmployeeRole) => void;
}

const RoleContext = createContext<RoleState | null>(null);

const STORAGE_KEY = "pbc_role";
const STORAGE_EMP_KEY = "pbc_emp_role";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<PortalRole>("vendor_admin");
  const [employeeRole, setEmployeeRoleState] =
    useState<EmployeeRole>("Supply Chain Manager");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as PortalRole | null;
    if (stored) setRoleState(stored);
    const empStored = window.localStorage.getItem(STORAGE_EMP_KEY) as EmployeeRole | null;
    if (empStored) setEmployeeRoleState(empStored);
  }, []);

  const setRole = (r: PortalRole) => {
    setRoleState(r);
    window.localStorage.setItem(STORAGE_KEY, r);
  };
  const setEmployeeRole = (r: EmployeeRole) => {
    setEmployeeRoleState(r);
    window.localStorage.setItem(STORAGE_EMP_KEY, r);
  };

  return (
    <RoleContext.Provider value={{ role, employeeRole, setRole, setEmployeeRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export const ROLE_LABELS: Record<PortalRole, string> = {
  vendor_admin: "Vendor Admin",
  vendor_employee: "Vendor Employee",
  internal_ops: "Internal Ops (Blinkit)",
};
