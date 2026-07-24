import type { ActionItem } from "@/lib/requests-store";
import type { AppNotification } from "@/lib/mock-data";

export type ActionCtaKind =
  | "po_cancel"
  | "reconcile"
  | "gate_pass"
  | "slot_change"
  | "invoice_fix"
  | "generic";

export const CTA_LABEL: Record<ActionCtaKind, string> = {
  po_cancel: "Acknowledge & Stop Dispatch",
  reconcile: "Reconcile Statement",
  gate_pass: "Download Gate Pass",
  slot_change: "Confirm Slot Change",
  invoice_fix: "Fix & Resubmit Invoice",
  generic: "Reconcile Now",
};

function detect(text: string, subCategory?: string): ActionCtaKind {
  const t = text.toLowerCase();
  const sc = (subCategory ?? "").toLowerCase();
  if (
    sc.includes("po_cancellation") ||
    /po cancellation|po cancelled|stop dispatch|po modification|quantity revision|price mismatch on po/.test(t)
  )
    return "po_cancel";
  if (/appointment confirmed|gate pass/.test(t)) return "gate_pass";
  if (/reschedule|slot update|slot change|missed appointment/.test(t)) return "slot_change";
  if (
    sc.includes("rejected_invoice") ||
    /invoice rejected|rejected invoice|resubmit.*invoice|tax invoice/.test(t)
  )
    return "invoice_fix";
  if (/rebate|payment dispute|debit note|credit note|reconcile|mismatch|tds/.test(t))
    return "reconcile";
  return "generic";
}

export function getActionItemCtaKind(a: ActionItem): ActionCtaKind {
  return detect(a.title, a.category);
}

export function getNotificationCtaKind(n: AppNotification): ActionCtaKind {
  return detect(n.subject, n.subCategory);
}
