import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  Ban,
  Paperclip,
  Table2,
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  GripVertical,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ---------------- Schema ---------------- */

export type AttachmentType = "none" | "dynamic_attachment" | "dynamic_table" | "dynamic_pdf";

export type PdfMode = "entity" | "user" | null;

export type VendorScope = "Not included" | "All Vendors" | "Targeted Vendors";
export type MfdScope = "Not included" | "All MFDs" | "Targeted MFDs";

export interface EntityBlock {
  id: string;
  entity: string;
  hasPdfs: boolean;
  hasMfdList: boolean;
}

export interface UserCombinationBlock {
  id: string;
  vendorScope: VendorScope;
  mfdScope: MfdScope;
  resolvedName: string;
  hasPdf: boolean;
  hasTargetedVendorList: boolean;
  hasTargetedMfdList: boolean;
}


/* --- Dynamic Table (inline table in email body) — block-level Query vs Bulk branching --- */

export type TableMode = "query" | "bulk" | null;

export interface TableColumn {
  id: string;
  originalTag: string;
  displayName: string;
}

export interface TableAttachmentBlock {
  id: string;
  tableMode: TableMode;
  isReady: boolean;
  /* query mode */
  selectedQueryId: string | null;
  selectedQueryName: string | null;
  availableTags: string[];
  tableColumns: TableColumn[];
  /* bulk mode */
  vendorScope: VendorScope;
  mfdScope: MfdScope;
  resolvedAudienceName: string;
  hasTargetedVendorList: boolean;
  hasTargetedMfdList: boolean;
  hasBulkCsv: boolean;
}


/* --- Normal Dynamic Attachment (raw CSV/Excel export) — separate from Dynamic Tables --- */

export type FileAttachmentMode = "query" | "bulk" | null;

export interface FileAttachmentBlock {
  id: string;
  attachmentMode: FileAttachmentMode;
  isReady: boolean;
  selectedQueryId: string | null;
  selectedQueryName: string | null;
  vendorScope: VendorScope;
  mfdScope: MfdScope;
  resolvedAudienceName: string;
  hasTargetedVendorList: boolean;
  hasTargetedMfdList: boolean;
  hasBulkCsv: boolean;
}

/* --- Template variables (independent of any attachment configuration) --- */

export type VariableMode = "query" | "bulk" | null;

export const TEMPLATE_VARIABLES = ["{{vendor_name}}"];

export const VARIABLE_QUERIES: { id: string; name: string }[] = [
  { id: "vq-301", name: "Vendor Master — Name & Legal Entity" },
  { id: "vq-302", name: "Vendor Contact Directory (Active)" },
  { id: "vq-303", name: "Vendor Onboarding Snapshot" },
  { id: "vq-304", name: "MFD Master — Name & Site" },
];

export const JIS_QUERIES: { id: string; name: string }[] = [
  { id: "jis-101", name: "Vendor GRN Charges Summary" },
  { id: "jis-102", name: "Pending Rebates Output" },
  { id: "jis-103", name: "Fill Rate Weekly Extract" },
  { id: "jis-104", name: "Invoice Ageing (Vendor Level)" },
  { id: "jis-105", name: "MFD Appointment Adherence" },
];

const ACCENT = "#2F7D32";
const AUDIENCE_ID_RE = /(vendor_id|manufacturer_id)/i;

export const TABLE_QUERIES: { id: string; name: string; tags: string[] }[] = [
  {
    id: "tq-201",
    name: "Vendor GRN Charges Summary",
    tags: ["vendor_id", "grn_date", "instance_charges", "total_deduction", "city_name"],
  },
  {
    id: "tq-202",
    name: "Weekly Fill Rate Scorecard",
    tags: ["vendor_id", "week_start", "fill_rate", "po_count", "line_items"],
  },
  {
    id: "tq-203",
    name: "Invoice Ageing (Vendor Level)",
    tags: ["vendor_id", "invoice_no", "invoice_amount", "due_date", "ageing_bucket"],
  },
  {
    id: "tq-204",
    name: "MFD Appointment Adherence",
    tags: ["manufacturer_id", "appointment_date", "adherence_pct", "slot_missed"],
  },
];

let bid = 1;
const newTableBlock = (): TableAttachmentBlock => ({
  id: `tbl-${++bid}`,
  tableMode: null,
  isReady: false,
  selectedQueryId: null,
  selectedQueryName: null,
  availableTags: [],
  tableColumns: [],
  vendorScope: "Not included",
  mfdScope: "Not included",
  resolvedAudienceName: "",
  hasTargetedVendorList: false,
  hasTargetedMfdList: false,
  hasBulkCsv: false,
});

function computeTableBlockReady(b: TableAttachmentBlock): boolean {
  if (b.tableMode === "query") {
    if (!b.selectedQueryId) return false;
    return b.tableColumns.length > 0 && b.tableColumns.every((c) => c.displayName.trim().length > 0);
  }
  if (b.tableMode === "bulk") {
    if (b.vendorScope === "Not included" && b.mfdScope === "Not included") return false;
    if (b.vendorScope === "Targeted Vendors" && !b.hasTargetedVendorList) return false;
    if (b.mfdScope === "Targeted MFDs" && !b.hasTargetedMfdList) return false;
    return b.hasBulkCsv;
  }
  return false;
}

function tableBlockDirty(b: TableAttachmentBlock): boolean {
  return Boolean(
    b.selectedQueryId ||
      b.tableColumns.length > 0 ||
      b.hasBulkCsv ||
      b.hasTargetedVendorList ||
      b.hasTargetedMfdList ||
      b.vendorScope !== "Not included" ||
      b.mfdScope !== "Not included",
  );
}


let fid = 1;
const newFileBlock = (): FileAttachmentBlock => ({
  id: `file-${++fid}`,
  attachmentMode: null,
  isReady: false,
  selectedQueryId: null,
  selectedQueryName: null,
  vendorScope: "Not included",
  mfdScope: "Not included",
  resolvedAudienceName: "",
  hasTargetedVendorList: false,
  hasTargetedMfdList: false,
  hasBulkCsv: false,
});

function computeFileBlockReady(b: FileAttachmentBlock): boolean {
  if (b.attachmentMode === "query") return Boolean(b.selectedQueryId);
  if (b.attachmentMode === "bulk") {
    if (b.vendorScope === "Not included" && b.mfdScope === "Not included") return false;
    if (b.vendorScope === "Targeted Vendors" && !b.hasTargetedVendorList) return false;
    if (b.mfdScope === "Targeted MFDs" && !b.hasTargetedMfdList) return false;
    return b.hasBulkCsv;
  }
  return false;
}

function fileBlockDirty(b: FileAttachmentBlock): boolean {
  return Boolean(
    b.selectedQueryId ||
      b.hasBulkCsv ||
      b.hasTargetedVendorList ||
      b.hasTargetedMfdList ||
      b.vendorScope !== "Not included" ||
      b.mfdScope !== "Not included",
  );
}


let gid = 1;
const newEntityBlock = (): EntityBlock => ({
  id: `ent-${++gid}`,
  entity: "",
  hasPdfs: false,
  hasMfdList: false,
});

let uid = 1;
const newUserBlock = (): UserCombinationBlock => ({
  id: `usr-${++uid}`,
  vendorScope: "Not included",
  mfdScope: "Not included",
  resolvedName: "",
  hasPdf: false,
  hasTargetedVendorList: false,
  hasTargetedMfdList: false,
});

export function resolveCombinationName(v: VendorScope, m: MfdScope) {
  const parts: string[] = [];
  if (v !== "Not included") parts.push(v);
  if (m !== "Not included") parts.push(m);
  return parts.join(" + ");
}

function userBlockReady(b: UserCombinationBlock) {
  if (b.vendorScope === "Not included" && b.mfdScope === "Not included") return false;
  if (!b.hasPdf) return false;
  if (b.vendorScope === "Targeted Vendors" && !b.hasTargetedVendorList) return false;
  if (b.mfdScope === "Targeted MFDs" && !b.hasTargetedMfdList) return false;
  return true;
}


let cid = 1;

const TYPE_CARDS: { id: AttachmentType; label: string; desc: string; icon: typeof Ban }[] = [
  { id: "none", label: "None", desc: "Plain communication, no files attached.", icon: Ban },
  {
    id: "dynamic_attachment",
    label: "Dynamic Attachment",
    desc: "Query-driven CSV / Excel export per recipient.",
    icon: Paperclip,
  },
  {
    id: "dynamic_table",
    label: "Dynamic Table",
    desc: "Table rendered inline in the email body.",
    icon: Table2,
  },
  {
    id: "dynamic_pdf",
    label: "Dynamic PDF",
    desc: "Entity-wise PDF sets mapped to audience groups.",
    icon: FileText,
  },
];

const B1_OPTIONS = [
  "All Vendors",
  "All Manufacturers",
  "Targeted Vendor IDs",
  "Targeted Manufacturer IDs",
];
const ENTITIES = ["BPCL", "ZHPL", "Moonstone", "Sunshine"];
const VENDOR_SCOPES: VendorScope[] = ["Not included", "All Vendors", "Targeted Vendors"];
const MFD_SCOPES: MfdScope[] = ["Not included", "All MFDs", "Targeted MFDs"];

const TYPE_LABEL: Record<AttachmentType, string> = {
  none: "None",
  dynamic_attachment: "Dynamic Attachment",
  dynamic_table: "Dynamic Table",
  dynamic_pdf: "Dynamic PDF",
};

/* ---------------- Shared state ---------------- */

function useFlowState() {
  const [attachmentType, setAttachmentType] = useState<AttachmentType>("none");
  const [b1Audience, setB1Audience] = useState<string[]>([]);
  const [pdfMode, setPdfModeRaw] = useState<PdfMode>(null);
  const [entityBlocks, setEntityBlocks] = useState<EntityBlock[]>([
    { id: "ent-1", entity: "", hasPdfs: false, hasMfdList: false },
  ]);
  const [userBlocks, setUserBlocks] = useState<UserCombinationBlock[]>([
    {
      id: "usr-1",
      vendorScope: "Not included",
      mfdScope: "Not included",
      resolvedName: "",
      hasPdf: false,
      hasTargetedVendorList: false,
      hasTargetedMfdList: false,
    },
  ]);
  const [tableBlocks, setTableBlocks] = useState<TableAttachmentBlock[]>([
    {
      id: "tbl-1",
      tableMode: null,
      isReady: false,
      selectedQueryId: null,
      selectedQueryName: null,
      availableTags: [],
      tableColumns: [],
      vendorScope: "Not included",
      mfdScope: "Not included",
      resolvedAudienceName: "",
      hasTargetedVendorList: false,
      hasTargetedMfdList: false,
      hasBulkCsv: false,
    },
  ]);

  const [fileBlocks, setFileBlocks] = useState<FileAttachmentBlock[]>([
    {
      id: "file-1",
      attachmentMode: null,
      isReady: false,
      selectedQueryId: null,
      selectedQueryName: null,
      vendorScope: "Not included",
      mfdScope: "Not included",
      resolvedAudienceName: "",
      hasTargetedVendorList: false,
      hasTargetedMfdList: false,
      hasBulkCsv: false,
    },
  ]);

  /* --- Template variables (independent of attachment configuration) --- */
  const [templateHasVariables, setTemplateHasVariables] = useState<boolean | null>(null);
  const [variableMode, setVariableModeRaw] = useState<VariableMode>(null);
  const [variableQueryName, setVariableQueryName] = useState<string | null>(null);
  const [variableVendorScope, setVariableVendorScope] = useState<VendorScope>("Not included");
  const [variableMfdScope, setVariableMfdScope] = useState<MfdScope>("Not included");
  const [variableHasTargetedVendorList, setVariableHasTargetedVendorList] = useState(false);
  const [variableHasTargetedMfdList, setVariableHasTargetedMfdList] = useState(false);
  const [variableHasBulkCsv, setVariableHasBulkCsv] = useState(false);

  function resetVariableConfig() {
    setVariableQueryName(null);
    setVariableVendorScope("Not included");
    setVariableMfdScope("Not included");
    setVariableHasTargetedVendorList(false);
    setVariableHasTargetedMfdList(false);
    setVariableHasBulkCsv(false);
  }

  const variableDirty =
    Boolean(variableQueryName) ||
    variableVendorScope !== "Not included" ||
    variableMfdScope !== "Not included" ||
    variableHasTargetedVendorList ||
    variableHasTargetedMfdList ||
    variableHasBulkCsv;

  function setVariableMode(mode: Exclude<VariableMode, null>) {
    if (variableMode === mode) return;
    if (variableMode && variableDirty) {
      if (!window.confirm("Changing this mode will clear your variable configurations. Continue?"))
        return;
    }
    resetVariableConfig();
    setVariableModeRaw(mode);
  }

  /** Simulated Apollo variable check, fired by the top-of-form "Check Template" button. */
  function runTemplateVariableCheck(id: string) {
    const trimmed = id.trim();
    const hasVars = trimmed.includes("9") || trimmed === "1234567";
    setTemplateHasVariables(hasVars);
    if (!hasVars) {
      setVariableModeRaw(null);
      resetVariableConfig();
    }
  }

  function resetTemplateVariableCheck() {
    setTemplateHasVariables(null);
    setVariableModeRaw(null);
    resetVariableConfig();
  }

  const variableResolvedAudienceName = resolveCombinationName(
    variableVendorScope,
    variableMfdScope,
  );

  const isVariableBlockReady = (() => {
    if (templateHasVariables !== true) return false;
    if (variableMode === "query") return Boolean(variableQueryName);
    if (variableMode === "bulk") {
      if (variableVendorScope === "Not included" && variableMfdScope === "Not included")
        return false;
      if (variableVendorScope === "Targeted Vendors" && !variableHasTargetedVendorList)
        return false;
      if (variableMfdScope === "Targeted MFDs" && !variableHasTargetedMfdList) return false;
      return variableHasBulkCsv;
    }
    return false;
  })();


  const isPdf = attachmentType === "dynamic_pdf";

  const pdfDirty =
    entityBlocks.some((b) => b.entity || b.hasPdfs || b.hasMfdList) ||
    userBlocks.some(
      (b) =>
        b.vendorScope !== "Not included" ||
        b.mfdScope !== "Not included" ||
        b.hasPdf ||
        b.hasTargetedVendorList ||
        b.hasTargetedMfdList,
    );
  const tableBlocksDirty = tableBlocks.some((b) => b.tableMode !== null || tableBlockDirty(b));
  const fileBlocksDirty = fileBlocks.some((b) => b.attachmentMode !== null || fileBlockDirty(b));

  function patchFileBlock(id: string, patch: Partial<FileAttachmentBlock>) {
    setFileBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        next.resolvedAudienceName = resolveCombinationName(next.vendorScope, next.mfdScope);
        if (next.vendorScope !== "Targeted Vendors") next.hasTargetedVendorList = false;
        if (next.mfdScope !== "Targeted MFDs") next.hasTargetedMfdList = false;
        next.isReady = computeFileBlockReady(next);
        return next;
      }),
    );
  }

  function setFileBlockMode(id: string, mode: Exclude<FileAttachmentMode, null>) {
    const block = fileBlocks.find((b) => b.id === id);
    if (!block || block.attachmentMode === mode) return;
    if (block.attachmentMode && fileBlockDirty(block)) {
      if (!window.confirm("Changing this mode will clear data for this block. Continue?")) return;
    }
    setFileBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...newFileBlock(), id: b.id, attachmentMode: mode } : b)),
    );
  }


  function resetPdfState() {
    setEntityBlocks([newEntityBlock()]);
    setUserBlocks([newUserBlock()]);
  }

  function patchTableBlock(id: string, patch: Partial<TableAttachmentBlock>) {
    setTableBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        next.resolvedAudienceName = resolveCombinationName(next.vendorScope, next.mfdScope);
        if (next.vendorScope !== "Targeted Vendors") next.hasTargetedVendorList = false;
        if (next.mfdScope !== "Targeted MFDs") next.hasTargetedMfdList = false;
        next.isReady = computeTableBlockReady(next);
        return next;
      }),
    );
  }

  function setTableBlockMode(id: string, mode: Exclude<TableMode, null>) {
    const block = tableBlocks.find((b) => b.id === id);
    if (!block || block.tableMode === mode) return;
    if (block.tableMode && tableBlockDirty(block)) {
      if (!window.confirm("Changing this mode will clear data for this block. Continue?")) return;
    }
    setTableBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...newTableBlock(), id: b.id, tableMode: mode } : b)),
    );
  }

  function patchEntityBlock(id: string, patch: Partial<EntityBlock>) {
    setEntityBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function patchUserBlock(id: string, patch: Partial<UserCombinationBlock>) {
    setUserBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        next.resolvedName = resolveCombinationName(next.vendorScope, next.mfdScope);
        if (next.vendorScope !== "Targeted Vendors") next.hasTargetedVendorList = false;
        if (next.mfdScope !== "Targeted MFDs") next.hasTargetedMfdList = false;
        return next;
      }),
    );
  }

  function setPdfMode(next: PdfMode) {
    if (next === pdfMode) return;
    if (pdfMode && pdfDirty) {
      if (!window.confirm("Changing this selection will clear configured data. Continue?")) return;
      resetPdfState();
    }
    setPdfModeRaw(next);
  }

  function selectType(next: AttachmentType) {
    if (next === attachmentType) return;
    if (attachmentType === "dynamic_pdf" && (pdfDirty || pdfMode)) {
      if (!window.confirm("Changing this selection will clear configured data. Continue?")) return;
      resetPdfState();
      setPdfModeRaw(null);
    }
    if (attachmentType === "dynamic_table" && tableBlocksDirty) {
      if (!window.confirm("Changing this selection will clear configured data. Continue?")) return;
      setTableBlocks([newTableBlock()]);
    }

    if (attachmentType === "dynamic_attachment" && fileBlocksDirty) {
      if (!window.confirm("Changing this selection will clear configured data. Continue?")) return;
      setFileBlocks([newFileBlock()]);
    }

    setAttachmentType(next);
  }

  const entityDuplicateOf = useMemo(() => {
    const map: Record<string, number | null> = {};
    entityBlocks.forEach((b, i) => {
      map[b.id] = null;
      if (!b.entity) return;
      const prior = entityBlocks.findIndex((o, oi) => oi < i && o.entity === b.entity);
      map[b.id] = prior >= 0 ? prior + 1 : null;
    });
    return map;
  }, [entityBlocks]);

  const userDuplicateOf = useMemo(() => {
    const map: Record<string, number | null> = {};
    userBlocks.forEach((b, i) => {
      map[b.id] = null;
      if (b.vendorScope === "Not included" && b.mfdScope === "Not included") return;
      const prior = userBlocks.findIndex(
        (o, oi) => oi < i && o.vendorScope === b.vendorScope && o.mfdScope === b.mfdScope,
      );
      map[b.id] = prior >= 0 ? prior + 1 : null;
    });
    return map;
  }, [userBlocks]);

  const entityReady = (b: EntityBlock) => Boolean(b.entity) && b.hasPdfs && b.hasMfdList;

  const blockers = useMemo(() => {
    const out: string[] = [];
    if (isPdf) {
      if (!pdfMode) out.push("Pick a Dynamic PDF mode (Entity Level or User Level).");
      else if (pdfMode === "entity") {
        if (!entityBlocks.every(entityReady))
          out.push("Every entity block must be Ready (entity selected + PDFs + MFD list).");
        if (Object.values(entityDuplicateOf).some(Boolean))
          out.push("Duplicate entities configured.");
      } else {
        if (!userBlocks.every(userBlockReady))
          out.push("Every user combination block must be Ready (PDF + required targeted lists).");
        if (Object.values(userDuplicateOf).some(Boolean))
          out.push("Duplicate audience combinations configured.");
      }
    } else if (attachmentType === "dynamic_attachment") {
      if (fileBlocks.some((b) => b.attachmentMode === null))
        out.push("Pick a mode (Query or Bulk Upload) for every file attachment block.");
      if (!fileBlocks.every((b) => b.isReady))
        out.push("Every file attachment block must be Ready (query selected, or bulk CSV + audience).");
    } else if (attachmentType === "dynamic_table") {
      if (tableBlocks.some((b) => b.tableMode === null))
        out.push("Pick a mode (Query or Bulk Upload) for every dynamic table block.");
      if (!tableBlocks.every((b) => b.isReady))
        out.push(
          "Every table block must be Ready (JIS query + named columns, or bulk CSV + audience).",
        );
    }

    if (templateHasVariables === true && variableMode === null)
      out.push("Pick a source for the template variables (Query or Bulk Upload).");
    else if (templateHasVariables === true && !isVariableBlockReady)
      out.push("Template variable values must be configured (JIS query or bulk CSV).");
    return out;
  }, [
    isPdf,
    pdfMode,
    entityBlocks,
    userBlocks,
    entityDuplicateOf,
    userDuplicateOf,
    attachmentType,
    tableBlocks,

    fileBlocks,

    templateHasVariables,
    variableMode,
    isVariableBlockReady,
  ]);


  return {
    attachmentType,
    selectType,
    isPdf,
    b1Audience,
    setB1Audience,
    pdfMode,
    setPdfMode,
    entityBlocks,
    setEntityBlocks,
    patchEntityBlock,
    entityDuplicateOf,
    entityReady,
    userBlocks,
    setUserBlocks,
    patchUserBlock,
    userDuplicateOf,
    userBlockReady,
    tableBlocks,
    setTableBlocks,
    patchTableBlock,
    setTableBlockMode,

    fileBlocks,
    setFileBlocks,
    patchFileBlock,
    setFileBlockMode,

    templateHasVariables,
    runTemplateVariableCheck,
    resetTemplateVariableCheck,
    variableMode,
    setVariableMode,
    variableQueryName,
    setVariableQueryName,
    variableVendorScope,
    setVariableVendorScope,
    variableMfdScope,
    setVariableMfdScope,
    variableHasTargetedVendorList,
    setVariableHasTargetedVendorList,
    variableHasTargetedMfdList,
    setVariableHasTargetedMfdList,
    variableHasBulkCsv,
    setVariableHasBulkCsv,
    variableResolvedAudienceName,
    isVariableBlockReady,

    blockers,
  };
}


type FlowCtx = ReturnType<typeof useFlowState>;
const Ctx = createContext<FlowCtx | null>(null);

export function DynamicAttachmentProvider({ children }: { children: ReactNode }) {
  const value = useFlowState();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useFlow() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("DynamicAttachmentProvider is missing");
  return ctx;
}

export function useDynamicAttachmentBlockers() {
  return useFlow().blockers;
}

/* ---------------- Parts A – D ---------------- */

export function DynamicAttachmentSections() {
  const f = useFlow();
  

  return (
    <div className="space-y-6">
      {/* Part A */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold">A · Attachment type</h3>
          <p className="text-xs text-muted-foreground">
            Choose how data reaches the recipient. Switching modes clears configured data.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TYPE_CARDS.map((c) => {
            const Icon = c.icon;
            const active = f.attachmentType === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => f.selectType(c.id)}
                style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  active ? "bg-cat-green-soft/40" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: active ? ACCENT : undefined }}
                  {...(!active ? { color: undefined } : {})}
                />
                <div className="mt-2 text-sm font-semibold">{c.label}</div>
                <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Part B */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">B · Attachment audience</h3>

        {!f.isPdf && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {B1_OPTIONS.map((opt) => {
                const checked = f.b1Audience.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        f.setB1Audience((prev) =>
                          v ? [...prev, opt] : prev.filter((p) => p !== opt),
                        )
                      }
                    />
                    {opt}
                  </label>
                );
              })}
            </div>

            {(
              [
                ["Targeted Vendor IDs", "Upload Targeted Vendor List (.csv, .xlsx)"],
                ["Targeted Manufacturer IDs", "Upload Targeted Manufacturer List (.csv, .xlsx)"],
              ] as const
            )
              .filter(([opt]) => f.b1Audience.includes(opt))
              .map(([opt, label]) => (
                <div
                  key={opt}
                  className="rounded-lg border border-dashed p-6 text-center"
                  style={{ borderColor: `${ACCENT}80`, backgroundColor: `${ACCENT}0D` }}
                >
                  <Upload className="mx-auto h-5 w-5" style={{ color: ACCENT }} />
                  <div className="mt-2 text-sm font-medium">{label}</div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    .csv or .xlsx · one ID per row (mock upload)
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-3">
                    Choose file
                  </Button>
                </div>
              ))}
          </div>
        )}

        {f.isPdf && <PdfModeSections />}
      </section>

      {/* Part C */}
      {f.attachmentType !== "none" && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">C · Attachment configuration</h3>

          {f.isPdf ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {!f.pdfMode ? (
                "Pick a Dynamic PDF mode above to configure attachments."
              ) : f.pdfMode === "entity" ? (
                <>
                  Entity level ·{" "}
                  <span className="font-medium text-foreground">{f.entityBlocks.length}</span>{" "}
                  entity block(s),{" "}
                  <span className="font-medium text-foreground">
                    {f.entityBlocks.filter(f.entityReady).length}
                  </span>{" "}
                  ready.
                </>
              ) : (
                <>
                  User level ·{" "}
                  <span className="font-medium text-foreground">{f.userBlocks.length}</span>{" "}
                  combination(s),{" "}
                  <span className="font-medium text-foreground">
                    {f.userBlocks.filter(userBlockReady).length}
                  </span>{" "}
                  ready.
                </>
              )}
            </div>

          ) : f.attachmentType === "dynamic_attachment" ? (
            <FileAttachmentSections />
          ) : (
            <TableAttachmentSections />
          )}


        </section>
      )}

    </div>
  );
}

/* ---------------- Dynamic PDF: Step 0 + branching flows ---------------- */

function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        ready ? "bg-cat-green-soft" : "bg-muted text-muted-foreground",
      )}
      style={ready ? { color: ACCENT } : undefined}
    >
      {ready ? "🟢 Ready" : "⚪ Incomplete"}
    </span>
  );
}

function PdfModeSections() {
  const f = useFlow();

  const MODE_CARDS: { id: Exclude<PdfMode, null>; label: string; desc: string }[] = [
    {
      id: "entity",
      label: "Entity Level",
      desc: "Same PDF set goes to everyone mapped to a selected entity.",
    },
    {
      id: "user",
      label: "User Level",
      desc: "Different PDF sets go to different combinations of vendors and MFDs.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Step 0 */}
      <div className="space-y-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Step 0 · How should PDFs be mapped?
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODE_CARDS.map((c) => {
            const active = f.pdfMode === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => f.setPdfMode(c.id)}
                style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  active ? "bg-cat-green-soft/40" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" style={{ color: active ? ACCENT : undefined }} />
                  {c.label}
                </div>
                <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {!f.pdfMode && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[13px] text-muted-foreground">
          <Info className="h-4 w-4" />
          Select a mapping mode to configure the PDF audience.
        </div>
      )}

      {f.pdfMode === "entity" && <EntityLevelFlow />}
      {f.pdfMode === "user" && <UserLevelFlow />}
    </div>
  );
}

function EntityLevelFlow() {
  const f = useFlow();
  return (
    <div className="space-y-3">
      {f.entityBlocks.map((b, i) => {
        const dup = f.entityDuplicateOf[b.id];
        const ready = f.entityReady(b);
        return (
          <div
            key={b.id}
            className="space-y-3 rounded-xl border-2 bg-card p-4"
            style={{ borderColor: ready ? ACCENT : "hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Entity Block {i + 1}</div>
              <div className="flex items-center gap-2">
                <StatusBadge ready={ready} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={f.entityBlocks.length === 1}
                  onClick={() => f.setEntityBlocks((prev) => prev.filter((p) => p.id !== b.id))}
                  aria-label={`Remove entity block ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[12px] text-muted-foreground">Step 1 · Select entity</div>
              <Select
                value={b.entity}
                onValueChange={(v) => f.patchEntityBlock(b.id, { entity: v })}
              >
                <SelectTrigger className="sm:max-w-xs">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dup && (
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  This entity is already configured above.
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[12px] text-muted-foreground">Step 2 · PDFs</div>
                <UploadButton
                  label="Attach PDFs corresponding to the selected entity"
                  done={b.hasPdfs}
                  doneLabel="PDF set attached"
                  onClick={() => f.patchEntityBlock(b.id, { hasPdfs: !b.hasPdfs })}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[12px] text-muted-foreground">Step 3 · MFD list</div>
                <UploadButton
                  label="Attach the list of MFDs corresponding to the selected entity"
                  done={b.hasMfdList}
                  doneLabel="MFD list attached"
                  onClick={() => f.patchEntityBlock(b.id, { hasMfdList: !b.hasMfdList })}
                />
              </div>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={() => f.setEntityBlocks((prev) => [...prev, newEntityBlock()])}
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add another entity
      </Button>
    </div>
  );
}

function UserLevelFlow() {
  const f = useFlow();
  return (
    <div className="space-y-3">
      {f.userBlocks.map((b, i) => {
        const dup = f.userDuplicateOf[b.id];
        const noneSelected = b.vendorScope === "Not included" && b.mfdScope === "Not included";
        const valid = !noneSelected && !dup;
        const ready = userBlockReady(b) && !dup;
        const uploaded = b.hasPdf || b.hasTargetedVendorList || b.hasTargetedMfdList;

        function changeScope(patch: Partial<UserCombinationBlock>) {
          if (uploaded) {
            if (
              !window.confirm(
                "Changing this selection will clear configured data. Continue?",
              )
            )
              return;
            f.patchUserBlock(b.id, {
              ...patch,
              hasPdf: false,
              hasTargetedVendorList: false,
              hasTargetedMfdList: false,
            });
            return;
          }
          f.patchUserBlock(b.id, patch);
        }

        return (
          <div
            key={b.id}
            className="space-y-3 rounded-xl border-2 bg-card p-4"
            style={{ borderColor: ready ? ACCENT : "hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Combination {i + 1}</div>
              <div className="flex items-center gap-2">
                <StatusBadge ready={ready} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={f.userBlocks.length === 1}
                  onClick={() => f.setUserBlocks((prev) => prev.filter((p) => p.id !== b.id))}
                  aria-label={`Remove combination ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-[12px] text-muted-foreground">Vendor scope</div>
                {VENDOR_SCOPES.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name={`vendor-${b.id}`}
                      checked={b.vendorScope === s}
                      onChange={() => changeScope({ vendorScope: s })}
                      style={{ accentColor: ACCENT }}
                    />
                    {s}
                  </label>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="text-[12px] text-muted-foreground">MFD scope</div>
                {MFD_SCOPES.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name={`mfd-${b.id}`}
                      checked={b.mfdScope === s}
                      onChange={() => changeScope({ mfdScope: s })}
                      style={{ accentColor: ACCENT }}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {noneSelected && (
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                Select at least one audience type
              </div>
            )}
            {dup && (
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                This combination is already configured in Combination {dup}.
              </div>
            )}

            {valid && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[13px] font-semibold">{b.resolvedName}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <UploadButton
                    label="Upload PDF for this combination"
                    done={b.hasPdf}
                    doneLabel="PDF uploaded"
                    onClick={() => f.patchUserBlock(b.id, { hasPdf: !b.hasPdf })}
                  />
                  {b.vendorScope === "Targeted Vendors" && (
                    <UploadButton
                      label="Upload targeted vendor list (.csv, .xlsx)"
                      done={b.hasTargetedVendorList}
                      doneLabel="Vendor list uploaded"
                      onClick={() =>
                        f.patchUserBlock(b.id, {
                          hasTargetedVendorList: !b.hasTargetedVendorList,
                        })
                      }
                    />
                  )}
                  {b.mfdScope === "Targeted MFDs" && (
                    <UploadButton
                      label="Upload targeted MFD list (.csv, .xlsx)"
                      done={b.hasTargetedMfdList}
                      doneLabel="MFD list uploaded"
                      onClick={() =>
                        f.patchUserBlock(b.id, { hasTargetedMfdList: !b.hasTargetedMfdList })
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={() => f.setUserBlocks((prev) => [...prev, newUserBlock()])}
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add another combination
      </Button>
    </div>
  );
}



/* ---------------- Normal Dynamic Attachment: Query vs Bulk branching ---------------- */

function FileAttachmentSections() {
  const f = useFlow();
  return (
    <div className="space-y-3">
      {f.fileBlocks.map((b, i) => (
        <FileAttachmentBlockCard
          key={b.id}
          index={i}
          block={b}
          canRemove={f.fileBlocks.length > 1}
          onMode={(m) => f.setFileBlockMode(b.id, m)}
          onPatch={(patch) => f.patchFileBlock(b.id, patch)}
          onRemove={() => f.setFileBlocks((prev) => prev.filter((p) => p.id !== b.id))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => f.setFileBlocks((prev) => [...prev, newFileBlock()])}
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add another attachment
      </Button>
    </div>
  );
}

function FileAttachmentBlockCard({
  index,
  block,
  canRemove,
  onMode,
  onPatch,
  onRemove,
}: {
  index: number;
  block: FileAttachmentBlock;
  canRemove: boolean;
  onMode: (mode: Exclude<FileAttachmentMode, null>) => void;
  onPatch: (patch: Partial<FileAttachmentBlock>) => void;
  onRemove: () => void;
}) {
  const noAudience =
    block.attachmentMode === "bulk" &&
    block.vendorScope === "Not included" &&
    block.mfdScope === "Not included";

  const MODE_CARDS: { id: "query" | "bulk"; label: string; desc: string; icon: typeof Paperclip }[] =
    [
      {
        id: "query",
        label: "Query Attachment",
        desc: "Use a query already approved on JIS Analytics.",
        icon: Paperclip,
      },
      {
        id: "bulk",
        label: "Bulk Upload Attachment",
        desc: "For urgent templates with no time to get a query approved on JIS — upload data directly.",
        icon: Upload,
      },
    ];

  return (
    <div
      className="space-y-3 rounded-xl border-2 bg-card p-4"
      style={{ borderColor: block.isReady ? ACCENT : "hsl(var(--border))" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Attachment Block {index + 1}</div>
        <div className="flex items-center gap-2">
          <StatusBadge ready={block.isReady} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canRemove}
            onClick={onRemove}
            aria-label={`Remove attachment block ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Step 0 · Mode */}
      <div className="space-y-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Step 0 · How is the file produced?
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODE_CARDS.map((c) => {
            const Icon = c.icon;
            const active = block.attachmentMode === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onMode(c.id)}
                style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  active ? "bg-cat-green-soft/40" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <Icon className="h-4 w-4" style={{ color: active ? ACCENT : undefined }} />
                  {c.label}
                </div>
                <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {!block.attachmentMode && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[13px] text-muted-foreground">
          <Info className="h-4 w-4" />
          Pick how this file will be sourced to continue.
        </div>
      )}

      {/* Query mode */}
      {block.attachmentMode === "query" && (
        <div className="space-y-2">
          <div className="text-[12px] text-muted-foreground">Select your query</div>
          <Select
            value={block.selectedQueryId ?? ""}
            onValueChange={(v) =>
              onPatch({
                selectedQueryId: v,
                selectedQueryName: JIS_QUERIES.find((q) => q.id === v)?.name ?? null,
              })
            }
          >
            <SelectTrigger className="sm:max-w-md">
              <SelectValue placeholder="Select a JIS-approved query" />
            </SelectTrigger>
            <SelectContent>
              {JIS_QUERIES.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {block.selectedQueryId && (
            <div className="space-y-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
                style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Audience ID column found
              </span>
              <p className="text-[12px] text-muted-foreground">
                The output file corresponding to this query will be attached with this template.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bulk mode */}
      {block.attachmentMode === "bulk" && (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-[12px] text-muted-foreground">Vendor scope</div>
              {VENDOR_SCOPES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name={`file-vendor-${block.id}`}
                    checked={block.vendorScope === s}
                    onChange={() => onPatch({ vendorScope: s })}
                    style={{ accentColor: ACCENT }}
                  />
                  {s}
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="text-[12px] text-muted-foreground">MFD scope</div>
              {MFD_SCOPES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name={`file-mfd-${block.id}`}
                    checked={block.mfdScope === s}
                    onChange={() => onPatch({ mfdScope: s })}
                    style={{ accentColor: ACCENT }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {noAudience && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              Select at least one audience type
            </div>
          )}

          {!noAudience && (
            <>
              <div className="text-[13px] font-semibold">{block.resolvedAudienceName}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {block.vendorScope === "Targeted Vendors" && (
                  <UploadButton
                    label="Upload targeted vendor list (.csv, .xlsx)"
                    done={block.hasTargetedVendorList}
                    doneLabel="Vendor list uploaded"
                    onClick={() =>
                      onPatch({ hasTargetedVendorList: !block.hasTargetedVendorList })
                    }
                  />
                )}
                {block.mfdScope === "Targeted MFDs" && (
                  <UploadButton
                    label="Upload targeted MFD list (.csv, .xlsx)"
                    done={block.hasTargetedMfdList}
                    doneLabel="MFD list uploaded"
                    onClick={() => onPatch({ hasTargetedMfdList: !block.hasTargetedMfdList })}
                  />
                )}
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => onPatch({ hasBulkCsv: !block.hasBulkCsv })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onPatch({ hasBulkCsv: !block.hasBulkCsv });
                }}
                className="cursor-pointer rounded-lg border border-dashed p-5 text-center"
                style={{
                  borderColor: block.hasBulkCsv ? ACCENT : `${ACCENT}80`,
                  backgroundColor: `${ACCENT}0D`,
                }}
              >
                {block.hasBulkCsv ? (
                  <CheckCircle2 className="mx-auto h-5 w-5" style={{ color: ACCENT }} />
                ) : (
                  <Upload className="mx-auto h-5 w-5" style={{ color: ACCENT }} />
                )}
                <div className="mt-2 text-[13px] font-medium">
                  {block.hasBulkCsv
                    ? "Bulk CSV uploaded"
                    : "Upload your query output as a CSV. This file must contain every vendor's row together, not one file per vendor."}
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  At send time, the system will filter this file to find each vendor's row using
                  vendor_id and attach it individually. The query behind this file should already
                  have been run once, before uploading.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UploadButton({

  label,
  done,
  doneLabel,
  onClick,
}: {
  label: string;
  done: boolean;
  doneLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={done ? { borderColor: ACCENT, color: ACCENT, backgroundColor: `${ACCENT}12` } : undefined}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[13px] font-medium transition",
        !done && "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
      {done ? (doneLabel ?? `${label} · uploaded`) : label}
    </button>
  );
}

/* ---------------- Dynamic Table: Query vs Bulk branching ---------------- */

function TableAttachmentSections() {
  const f = useFlow();
  return (
    <div className="space-y-3">
      {f.tableBlocks.map((b, i) => (
        <TableAttachmentBlockCard
          key={b.id}
          index={i}
          block={b}
          canRemove={f.tableBlocks.length > 1}
          onMode={(m) => f.setTableBlockMode(b.id, m)}
          onPatch={(patch) => f.patchTableBlock(b.id, patch)}
          onRemove={() => f.setTableBlocks((prev) => prev.filter((p) => p.id !== b.id))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => f.setTableBlocks((prev) => [...prev, newTableBlock()])}
      >
        <Plus className="mr-1.5 h-4 w-4" /> Add another attachment
      </Button>
    </div>
  );
}

function TableAttachmentBlockCard({
  index,
  block,
  canRemove,
  onMode,
  onPatch,
  onRemove,
}: {
  index: number;
  block: TableAttachmentBlock;
  canRemove: boolean;
  onMode: (mode: Exclude<TableMode, null>) => void;
  onPatch: (patch: Partial<TableAttachmentBlock>) => void;
  onRemove: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const noAudience =
    block.tableMode === "bulk" &&
    block.vendorScope === "Not included" &&
    block.mfdScope === "Not included";

  const MODE_CARDS: { id: "query" | "bulk"; label: string; desc: string; icon: typeof Table2 }[] = [
    {
      id: "query",
      label: "Query Attachment",
      desc: "Use a query already approved on JIS Analytics.",
      icon: Table2,
    },
    {
      id: "bulk",
      label: "Bulk Upload Attachment",
      desc: "For urgent templates with no time to get a query approved on JIS — upload data directly.",
      icon: Upload,
    },
  ];

  function addColumn(tag: string) {
    if (block.tableColumns.some((c) => c.originalTag === tag)) return;
    onPatch({
      tableColumns: [
        ...block.tableColumns,
        { id: `col-${++cid}`, originalTag: tag, displayName: "" },
      ],
    });
  }

  return (
    <div
      className="space-y-3 rounded-xl border-2 bg-card p-4"
      style={{ borderColor: block.isReady ? ACCENT : "hsl(var(--border))" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Table Block {index + 1}</div>
        <div className="flex items-center gap-2">
          <StatusBadge ready={block.isReady} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canRemove}
            onClick={onRemove}
            aria-label={`Remove table block ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Step 0 · Mode */}
      <div className="space-y-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Step 0 · How is this table's data produced?
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODE_CARDS.map((c) => {
            const Icon = c.icon;
            const active = block.tableMode === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onMode(c.id)}
                style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  active ? "bg-cat-green-soft/40" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <Icon className="h-4 w-4" style={{ color: active ? ACCENT : undefined }} />
                  {c.label}
                </div>
                <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {!block.tableMode && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-[13px] text-muted-foreground">
          <Info className="h-4 w-4" />
          Pick how this table will be sourced to continue.
        </div>
      )}

      {/* Query mode */}
      {block.tableMode === "query" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="text-[12px] text-muted-foreground">Select your query</div>
            <Select
              value={block.selectedQueryId ?? ""}
              onValueChange={(v) => {
                const q = TABLE_QUERIES.find((x) => x.id === v);
                onPatch({
                  selectedQueryId: v,
                  selectedQueryName: q?.name ?? null,
                  availableTags: q?.tags ?? [],
                  tableColumns: [],
                });
              }}
            >
              <SelectTrigger className="sm:max-w-md">
                <SelectValue placeholder="Select a JIS-approved query" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_QUERIES.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {block.selectedQueryId && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
                style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Audience ID column found
              </span>
            )}
          </div>

          {block.selectedQueryId && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-[12px] font-medium text-muted-foreground">
                Fields returned by this query — drag into the table below.
              </div>
              <div className="flex flex-wrap gap-2">
                {block.availableTags.map((tag) => {
                  const used = block.tableColumns.some((c) => c.originalTag === tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      draggable={!used}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", tag)}
                      onClick={() => addColumn(tag)}
                      disabled={used}
                      style={
                        !used ? { borderColor: `${ACCENT}66`, backgroundColor: `${ACCENT}0D` } : undefined
                      }
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px]",
                        used
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground/60"
                          : "cursor-grab text-foreground",
                      )}
                    >
                      <GripVertical className="h-3 w-3 opacity-60" />
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const tag = e.dataTransfer.getData("text/plain");
                  if (tag) addColumn(tag);
                }}
                style={dragOver ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` } : undefined}
                className={cn(
                  "flex min-h-[110px] gap-3 overflow-x-auto rounded-lg border-2 border-dashed p-3 transition",
                  !dragOver && "border-border bg-card",
                )}
              >
                {block.tableColumns.length === 0 && (
                  <div className="m-auto text-[12px] text-muted-foreground">
                    Table Builder — drop fields here to create columns
                  </div>
                )}
                {block.tableColumns.map((c) => (
                  <div
                    key={c.id}
                    className="w-48 shrink-0 space-y-2 rounded-lg border border-border bg-background p-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        {c.originalTag}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove column ${c.originalTag}`}
                        onClick={() =>
                          onPatch({ tableColumns: block.tableColumns.filter((x) => x.id !== c.id) })
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      value={c.displayName}
                      placeholder="Display name"
                      className="h-8 text-[12px]"
                      onChange={(e) =>
                        onPatch({
                          tableColumns: block.tableColumns.map((x) =>
                            x.id === c.id ? { ...x, displayName: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              {block.tableColumns.length > 0 &&
                block.tableColumns.some((c) => !c.displayName.trim()) && (
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Every mapped column needs a display name.
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Bulk mode */}
      {block.tableMode === "bulk" && (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-[12px] text-muted-foreground">Vendor scope</div>
              {VENDOR_SCOPES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name={`table-vendor-${block.id}`}
                    checked={block.vendorScope === s}
                    onChange={() => onPatch({ vendorScope: s })}
                    style={{ accentColor: ACCENT }}
                  />
                  {s}
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="text-[12px] text-muted-foreground">MFD scope</div>
              {MFD_SCOPES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name={`table-mfd-${block.id}`}
                    checked={block.mfdScope === s}
                    onChange={() => onPatch({ mfdScope: s })}
                    style={{ accentColor: ACCENT }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {noAudience && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              Select at least one audience type
            </div>
          )}

          {!noAudience && (
            <>
              <div className="text-[13px] font-semibold">{block.resolvedAudienceName}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {block.vendorScope === "Targeted Vendors" && (
                  <UploadButton
                    label="Upload targeted vendor list (.csv, .xlsx)"
                    done={block.hasTargetedVendorList}
                    doneLabel="Vendor list uploaded"
                    onClick={() => onPatch({ hasTargetedVendorList: !block.hasTargetedVendorList })}
                  />
                )}
                {block.mfdScope === "Targeted MFDs" && (
                  <UploadButton
                    label="Upload targeted MFD list (.csv, .xlsx)"
                    done={block.hasTargetedMfdList}
                    doneLabel="MFD list uploaded"
                    onClick={() => onPatch({ hasTargetedMfdList: !block.hasTargetedMfdList })}
                  />
                )}
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => onPatch({ hasBulkCsv: !block.hasBulkCsv })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onPatch({ hasBulkCsv: !block.hasBulkCsv });
                }}
                className="cursor-pointer rounded-lg border border-dashed p-5 text-center"
                style={{
                  borderColor: block.hasBulkCsv ? ACCENT : `${ACCENT}80`,
                  backgroundColor: `${ACCENT}0D`,
                }}
              >
                {block.hasBulkCsv ? (
                  <CheckCircle2 className="mx-auto h-5 w-5" style={{ color: ACCENT }} />
                ) : (
                  <Upload className="mx-auto h-5 w-5" style={{ color: ACCENT }} />
                )}
                <div className="mt-2 text-[13px] font-medium">
                  {block.hasBulkCsv
                    ? "Bulk CSV uploaded"
                    : "Upload your query output as a CSV. This file must contain every vendor's row together, not one file per vendor."}
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  At send time, the system will filter this file to find each vendor's row using
                  vendor_id and render it as the inline table. The query behind this file should
                  already have been run once, before uploading.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}



const AMBER = "#B45309";
const AMBER_BG = "#FFFBEB";

function IncompleteBadge() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${AMBER}1A`, color: AMBER }}
    >
      ⚠️ Incomplete
    </span>
  );
}

function ApproverBlockCard({
  ready,
  children,
}: {
  ready: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-background p-2.5"
      style={
        ready
          ? { borderLeft: `3px solid ${ACCENT}` }
          : { borderLeft: `3px solid ${AMBER}`, backgroundColor: AMBER_BG }
      }
    >
      {children}
    </div>
  );
}

function ReadyCountLine({ ready, total }: { ready: number; total: number }) {
  const complete = total > 0 && ready === total;
  return (
    <p
      className="text-[12px] font-semibold"
      style={{ color: complete ? ACCENT : AMBER }}
    >
      {ready} of {total} blocks ready.
    </p>
  );
}

/* ---------------- Approver-side attachment summary (bound to global flow state) ---------------- */

export function DynamicAttachmentApproverSummary() {
  const f = useFlow();
  const readyTables = f.tableBlocks.filter((b) => b.isReady);

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Attachment Type (Live from submitter form)
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          {TYPE_LABEL[f.attachmentType]}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {f.attachmentType === "none" && (
          <p className="text-[13px] text-muted-foreground">
            No dynamic attachment configured for this communication.
          </p>
        )}

        {f.attachmentType === "dynamic_pdf" && !f.pdfMode && (
          <p className="text-[13px] text-muted-foreground">
            Dynamic PDF selected — submitter has not picked a mode yet.
          </p>
        )}

        {f.attachmentType === "dynamic_pdf" && f.pdfMode === "entity" && (
          <div className="space-y-2.5">
            <div className="text-[12px] font-semibold" style={{ color: ACCENT }}>
              Dynamic PDF (Entity Level)
            </div>
            <ReadyCountLine
              ready={f.entityBlocks.filter(f.entityReady).length}
              total={f.entityBlocks.length}
            />
            {f.entityBlocks.map((b, i) => {
              const ready = f.entityReady(b);
              return (
                <ApproverBlockCard key={b.id} ready={ready}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-medium">
                      Entity: {b.entity || `— (block ${i + 1})`}
                    </div>
                    {!ready && <IncompleteBadge />}
                  </div>
                  <ul className="mt-1 space-y-1 text-[12px]">
                    <li className={b.hasPdfs ? "font-medium" : "text-muted-foreground"}>
                      {b.hasPdfs ? "✅ PDF set attached" : "⚠️ PDF set missing"}
                    </li>
                    <li className={b.hasMfdList ? "font-medium" : "text-muted-foreground"}>
                      {b.hasMfdList ? "✅ MFD list attached" : "⚠️ MFD list missing"}
                    </li>
                  </ul>
                </ApproverBlockCard>
              );
            })}
          </div>
        )}

        {f.attachmentType === "dynamic_pdf" && f.pdfMode === "user" && (
          <div className="space-y-2">
            <div className="text-[12px] font-semibold" style={{ color: ACCENT }}>
              Dynamic PDF (User Level)
            </div>
            <ReadyCountLine
              ready={f.userBlocks.filter(userBlockReady).length}
              total={f.userBlocks.length}
            />
            <div className="space-y-2">
              {f.userBlocks.map((b, i) => {
                const ready = userBlockReady(b);
                return (
                  <ApproverBlockCard key={b.id} ready={ready}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[13px]">
                        {ready ? (
                          <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
                        ) : (
                          <XCircle className="h-4 w-4" style={{ color: AMBER }} />
                        )}
                        <span className={ready ? "font-medium" : "text-muted-foreground"}>
                          {b.resolvedName || `Combination ${i + 1} not configured`}
                          {ready ? " — PDFs and lists attached" : " — pending uploads"}
                        </span>
                      </div>
                      {!ready && <IncompleteBadge />}
                    </div>
                  </ApproverBlockCard>
                );
              })}
            </div>
          </div>
        )}


        {f.attachmentType === "dynamic_attachment" && (
          <div className="space-y-2.5">
            <ReadyCountLine
              ready={f.fileBlocks.filter((b) => b.isReady).length}
              total={f.fileBlocks.length}
            />
            {f.fileBlocks.length === 0 && (
              <p className="text-[13px] text-muted-foreground">
                Awaiting a configured raw file attachment (JIS query or bulk CSV).
              </p>
            )}
            {f.fileBlocks
              .map((b) => (
                <ApproverBlockCard key={b.id} ready={b.isReady}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold">
                    {b.attachmentMode === "query"
                      ? "Raw File Attachment (JIS Query)"
                      : b.attachmentMode === "bulk"
                        ? "Raw File Attachment (Bulk CSV Upload)"
                        : "Raw File Attachment (mode not selected)"}
                  </div>
                  {!b.isReady && <IncompleteBadge />}
                  </div>
                  {!b.isReady ? (
                    <p className="mt-1.5 text-[12px]" style={{ color: AMBER }}>
                      {b.attachmentMode === null
                        ? "Submitter has not picked Query vs Bulk Upload for this block."
                        : "Configuration incomplete — missing query selection or required uploads."}
                    </p>
                  ) : b.attachmentMode === "query" ? (
                    <div className="mt-1.5 space-y-1.5">
                      <div className="text-[12px]">
                        <span className="text-muted-foreground">Selected Query: </span>
                        <span className="font-medium">{b.selectedQueryName}</span>
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
                        style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Raw CSV/Excel output file configured for attachment.
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <div className="text-[12px]">
                        <span className="text-muted-foreground">Audience Scope: </span>
                        <span className="font-medium">{b.resolvedAudienceName}</span>
                      </div>
                      <ul className="space-y-0.5 text-[12px] font-medium">
                        <li>✅ Master Bulk CSV Data Attached</li>
                        {b.hasTargetedVendorList && <li>✅ Targeted Vendor List Attached</li>}
                        {b.hasTargetedMfdList && <li>✅ Targeted MFD List Attached</li>}
                      </ul>
                    </div>
                  )}
                </ApproverBlockCard>
              ))}
          </div>
        )}


        {f.attachmentType === "dynamic_table" && (
          <div className="space-y-3">
            <ReadyCountLine ready={readyTables.length} total={f.tableBlocks.length} />
            {f.tableBlocks.length === 0 && (
              <p className="text-[13px] text-muted-foreground">
                Awaiting a configured dynamic table (JIS query mapping or bulk CSV).
              </p>
            )}
            {f.tableBlocks.map((b, i) =>
              !b.isReady ? (
                <ApproverBlockCard key={b.id} ready={false}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold">
                      Dynamic Table {i + 1}
                      {b.tableMode === "query"
                        ? " (JIS Query)"
                        : b.tableMode === "bulk"
                          ? " (Bulk CSV Upload)"
                          : " (mode not selected)"}
                    </div>
                    <IncompleteBadge />
                  </div>
                  <p className="mt-1.5 text-[12px]" style={{ color: AMBER }}>
                    {b.tableMode === null
                      ? "Submitter has not picked Query vs Bulk Upload for this table."
                      : "Configuration incomplete — missing query mapping, column names or required uploads."}
                  </p>
                </ApproverBlockCard>
              ) : b.tableMode === "query" ? (
                <div
                  key={b.id}
                  className="overflow-x-auto rounded-lg border border-border bg-background p-3"
                  style={{ borderLeft: `3px solid ${ACCENT}` }}
                >
                  <div className="mb-2 text-[13px] font-semibold">
                    Dynamic Table (JIS Query): {b.selectedQueryName}
                  </div>
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr>
                        {b.tableColumns.map((c) => (
                          <th
                            key={c.id}
                            className="border border-border bg-muted/50 px-2 py-1 text-left font-semibold"
                          >
                            {c.displayName.trim() || c.originalTag}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((r) => (
                        <tr key={r}>
                          {b.tableColumns.map((c) => (
                            <td
                              key={c.id}
                              className="border border-border px-2 py-1 text-muted-foreground"
                            >
                              {`${c.originalTag}_${r}`}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  key={b.id}
                  className="rounded-lg border border-border bg-background p-3"
                  style={{ borderLeft: `3px solid ${ACCENT}` }}
                >
                  <div className="text-[13px] font-semibold">Dynamic Table (Bulk CSV Upload)</div>
                  <div className="mt-1 text-[12px]">
                    <span className="text-muted-foreground">Audience Scope: </span>
                    <span className="font-medium">{b.resolvedAudienceName}</span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[12px] font-medium">
                    <li>✅ Master Bulk CSV Data Attached</li>
                    {b.hasTargetedVendorList && <li>✅ Targeted Vendor List Attached</li>}
                    {b.hasTargetedMfdList && <li>✅ Targeted MFD List Attached</li>}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}


      </div>
    </div>
  );
}

/* ---------------- Template Variables (triggered by top "Check Template") ---------------- */

/** Exposes the variable-check trigger + status to the submitter form header. */
export function useTemplateVariables() {
  const f = useFlow();
  return {
    templateHasVariables: f.templateHasVariables,
    runTemplateVariableCheck: f.runTemplateVariableCheck,
    resetTemplateVariableCheck: f.resetTemplateVariableCheck,
    isVariableBlockReady: f.isVariableBlockReady,
  };
}

function VarList() {
  return (
    <>
      {TEMPLATE_VARIABLES.map((v, i) => (
        <span key={v}>
          {i > 0 ? ", " : ""}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">{v}</code>
        </span>
      ))}
    </>
  );
}

function ScopeRadios<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[12px] font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={active ? { borderColor: ACCENT, color: ACCENT, backgroundColor: `${ACCENT}0D` } : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-medium transition",
                active ? "" : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UploadTile({
  done,
  title,
  hint,
  onToggle,
}: {
  done: boolean;
  title: string;
  hint?: string;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-dashed p-4 text-center"
      style={{ borderColor: `${ACCENT}80`, backgroundColor: `${ACCENT}0D` }}
    >
      {done ? (
        <CheckCircle2 className="mx-auto h-5 w-5" style={{ color: ACCENT }} />
      ) : (
        <Upload className="mx-auto h-5 w-5" style={{ color: ACCENT }} />
      )}
      <div className="mt-2 text-[13px] font-medium">{done ? `${title} — uploaded` : title}</div>
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onToggle}>
        {done ? "Remove file" : "Choose file"}
      </Button>
    </div>
  );
}

/** Submitter-side variable configuration card. Render directly under the fetched Template Name. */
export function TemplateVariableSection() {
  const f = useFlow();

  if (f.templateHasVariables === null) return null;

  if (f.templateHasVariables === false) {
    return (
      <p className="mt-2 text-[12px] text-muted-foreground">
        No variables detected in this template.
      </p>
    );
  }

  return (
    <div
      className="mt-3 space-y-4 rounded-xl border-2 p-4"
      style={{ borderColor: f.isVariableBlockReady ? ACCENT : "#f0b100" }}
    >
      <div>
        <div className="text-sm font-semibold">
          This template requires values for: <VarList />
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Attach a source so these values can be filled in per recipient at send time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["query", "Query Attachment", "Use a query already approved on JIS Analytics."],
            [
              "bulk",
              "Bulk Upload Attachment",
              "For urgent templates with no time to get a query approved on JIS — upload values directly.",
            ],
          ] as const
        ).map(([mode, title, desc]) => {
          const active = f.variableMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => f.setVariableMode(mode)}
              style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                active ? "bg-cat-green-soft/40" : "border-border bg-card hover:border-primary/50",
              )}
            >
              <div className="text-[13px] font-semibold">{title}</div>
              <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{desc}</div>
            </button>
          );
        })}
      </div>

      {f.variableMode === "query" && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="space-y-1.5">
            <div className="text-[12px] font-medium">Select your query</div>
            <Select
              value={f.variableQueryName ?? ""}
              onValueChange={(v) => f.setVariableQueryName(v)}
            >
              <SelectTrigger className="h-9 w-full sm:w-96">
                <SelectValue placeholder="Pick a JIS-approved query" />
              </SelectTrigger>
              <SelectContent>
                {VARIABLE_QUERIES.map((q) => (
                  <SelectItem key={q.id} value={q.name}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {f.variableQueryName && (
            <div className="space-y-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
                style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Audience ID column found
              </span>
              <p className="text-[12px] text-muted-foreground">
                Selected query will supply values for: <VarList />
              </p>
            </div>
          )}
        </div>
      )}

      {f.variableMode === "bulk" && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <ScopeRadios
            label="Vendor Scope"
            value={f.variableVendorScope}
            options={VENDOR_SCOPES}
            onChange={f.setVariableVendorScope}
          />
          <ScopeRadios
            label="MFD Scope"
            value={f.variableMfdScope}
            options={MFD_SCOPES}
            onChange={f.setVariableMfdScope}
          />
          {f.variableVendorScope === "Not included" && f.variableMfdScope === "Not included" && (
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Select at least one audience type
            </p>
          )}

          {f.variableVendorScope === "Targeted Vendors" && (
            <UploadTile
              done={f.variableHasTargetedVendorList}
              title="Upload Targeted Vendor List (.csv, .xlsx, .xls)"
              onToggle={() => f.setVariableHasTargetedVendorList(!f.variableHasTargetedVendorList)}
            />
          )}
          {f.variableMfdScope === "Targeted MFDs" && (
            <UploadTile
              done={f.variableHasTargetedMfdList}
              title="Upload Targeted MFD List (.csv, .xlsx, .xls)"
              onToggle={() => f.setVariableHasTargetedMfdList(!f.variableHasTargetedMfdList)}
            />
          )}

          <UploadTile
            done={f.variableHasBulkCsv}
            title="Upload a CSV with one row per recipient, including the values for the template variables."
            hint="Accepts .csv, .xlsx, .xls. At send time, the system will filter this file to find each vendor's row using vendor_id and fill in their values individually."
            onToggle={() => f.setVariableHasBulkCsv(!f.variableHasBulkCsv)}
          />
        </div>
      )}
    </div>
  );
}

/** Approver-side mirror of the template variable configuration. */
export function TemplateVariableApproverSummary() {
  const f = useFlow();
  if (f.templateHasVariables !== true) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Template Variables Configuration
      </div>

      {!f.variableMode && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Variables detected — submitter has not picked a source mode yet.
        </p>
      )}

      {f.variableMode === "query" && (
        <div className="mt-2 space-y-1.5">
          <div className="text-[13px]">
            <span className="text-muted-foreground">Mode: </span>
            <span className="font-medium">JIS Query Attachment</span>
          </div>
          <div className="text-[13px]">
            <span className="text-muted-foreground">Query Name: </span>
            <span className="font-medium">{f.variableQueryName ?? "—"}</span>
          </div>
          {f.isVariableBlockReady && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
              style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Variables mapped successfully via query.
            </span>
          )}
        </div>
      )}

      {f.variableMode === "bulk" && (
        <div className="mt-2 space-y-1.5">
          <div className="text-[13px]">
            <span className="text-muted-foreground">Mode: </span>
            <span className="font-medium">Bulk CSV Upload</span>
          </div>
          <div className="text-[13px]">
            <span className="text-muted-foreground">Scope: </span>
            <span className="font-medium">{f.variableResolvedAudienceName || "—"}</span>
          </div>
          <ul className="space-y-0.5 text-[12px] font-medium">
            {f.variableHasBulkCsv && <li>✅ Master Values CSV Attached</li>}
            {f.variableHasTargetedVendorList && <li>✅ Targeted Vendor List Attached</li>}
            {f.variableHasTargetedMfdList && <li>✅ Targeted MFD List Attached</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
