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


export interface MappedColumn {
  id: string;
  field: string;
  displayName: string;
}

export interface AttachmentBlock {
  id: string;
  query: string;
  checked: boolean;
  queryValid: boolean;
  detectedFields: string[];
  columns: MappedColumn[];
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

export const JIS_QUERIES: { id: string; name: string }[] = [
  { id: "jis-101", name: "Vendor GRN Charges Summary" },
  { id: "jis-102", name: "Pending Rebates Output" },
  { id: "jis-103", name: "Fill Rate Weekly Extract" },
  { id: "jis-104", name: "Invoice Ageing (Vendor Level)" },
  { id: "jis-105", name: "MFD Appointment Adherence" },
];

const ACCENT = "#2F7D32";
const AUDIENCE_ID_RE = /(vendor_id|manufacturer_id)/i;

let bid = 1;
const newBlock = (): AttachmentBlock => ({
  id: `blk-${++bid}`,
  query: "",
  checked: false,
  queryValid: false,
  detectedFields: [],
  columns: [],
});

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
  const [blocks, setBlocks] = useState<AttachmentBlock[]>([
    {
      id: "blk-1",
      query: "",
      checked: false,
      queryValid: false,
      detectedFields: [],
      columns: [],
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

  const [templateId, setTemplateId] = useState("");
  const [varChecked, setVarChecked] = useState(false);
  const [varQuery, setVarQuery] = useState("");
  const [varQueryChecked, setVarQueryChecked] = useState(false);
  const [varQueryValid, setVarQueryValid] = useState(false);

  const varsRequired = templateId.includes("9") || templateId.trim() === "1234567";
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
  const blocksDirty = blocks.some((b) => b.query.trim() || b.columns.length > 0);
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

  function patchBlock(id: string, patch: Partial<AttachmentBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
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
    if (attachmentType === "dynamic_table" && blocksDirty) {
      if (!window.confirm("Changing this selection will clear configured data. Continue?")) return;
      setBlocks([newBlock()]);
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
      if (!fileBlocks.every((b) => b.isReady))
        out.push("Every file attachment block must be Ready (query selected, or bulk CSV + audience).");
    } else if (attachmentType === "dynamic_table") {
      if (!blocks.every((b) => b.checked && b.queryValid))
        out.push("Every attachment block needs a passing query check.");
      if (!blocks.every((b) => b.columns.length > 0 && b.columns.every((c) => c.displayName.trim())))
        out.push("Every mapped table column needs a display name.");
    }
    if (varChecked && varsRequired && !(varQueryChecked && varQueryValid))
      out.push("Template variable query must pass the check.");
    return out;
  }, [
    isPdf,
    pdfMode,
    entityBlocks,
    userBlocks,
    entityDuplicateOf,
    userDuplicateOf,
    attachmentType,
    blocks,
    fileBlocks,

    varChecked,
    varsRequired,
    varQueryChecked,
    varQueryValid,
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
    blocks,
    setBlocks,
    patchBlock,
    fileBlocks,
    setFileBlocks,
    patchFileBlock,
    setFileBlockMode,

    templateId,
    setTemplateId,
    varChecked,
    setVarChecked,
    varQuery,
    setVarQuery,
    varQueryChecked,
    setVarQueryChecked,
    varQueryValid,
    setVarQueryValid,
    varsRequired,
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
            <div className="space-y-3">
              {f.blocks.map((b, i) => (
                <AttachmentBlockCard
                  key={b.id}
                  index={i}
                  block={b}
                  isTableMode={f.attachmentType === "dynamic_table"}
                  canRemove={f.blocks.length > 1}
                  onPatch={(patch) => f.patchBlock(b.id, patch)}
                  onRemove={() => f.setBlocks((prev) => prev.filter((p) => p.id !== b.id))}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => f.setBlocks((prev) => [...prev, newBlock()])}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add another attachment
              </Button>
            </div>
          )}

        </section>
      )}

      {/* Part D */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">D · Template variable check</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <div className="text-[12px] text-muted-foreground">Template ID</div>
            <Input
              value={f.templateId}
              placeholder="e.g. 1234567"
              className="h-9 w-56"
              onChange={(e) => {
                f.setTemplateId(e.target.value);
                f.setVarChecked(false);
                f.setVarQueryChecked(false);
                f.setVarQueryValid(false);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => f.setVarChecked(true)}
            disabled={!f.templateId.trim()}
          >
            Check Template Variables
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Note: manual button exists only for demo.
        </p>

        {f.varChecked && !f.varsRequired && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[13px] text-muted-foreground">
            No variables detected in this template.
          </div>
        )}

        {f.varChecked && f.varsRequired && (
          <div
            className="space-y-3 rounded-lg border-2 p-3"
            style={{
              borderColor:
                f.varQueryChecked && f.varQueryValid
                  ? ACCENT
                  : f.varQueryChecked
                    ? "hsl(var(--destructive))"
                    : "#f0b100",
              backgroundColor:
                f.varQueryChecked && f.varQueryValid ? `${ACCENT}0D` : "transparent",
            }}
          >
            <div className="text-[13px]">
              This template requires values for:{" "}
              {["{{vendor_name}}", "{{invoice_amount}}", "{{due_date}}"].map((v, i) => (
                <span key={v}>
                  {i === 2 ? "and " : ""}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">{v}</code>
                  {i < 2 ? ", " : ""}
                </span>
              ))}
              . Attach a query to fill this per recipient.
            </div>

            <Textarea
              rows={4}
              value={f.varQuery}
              placeholder="Paste your query here"
              className="bg-background font-mono text-[12px]"
              onChange={(e) => {
                f.setVarQuery(e.target.value);
                f.setVarQueryChecked(false);
                f.setVarQueryValid(false);
              }}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  f.setVarQueryValid(AUDIENCE_ID_RE.test(f.varQuery));
                  f.setVarQueryChecked(true);
                }}
              >
                Check Query
              </Button>
              {f.varQueryChecked && (
                <span
                  className="flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: f.varQueryValid ? ACCENT : "hsl(var(--destructive))" }}
                >
                  {f.varQueryValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Audience ID column found
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" /> No audience ID column detected
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
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

function AttachmentBlockCard({
  index,
  block,
  isTableMode,
  canRemove,
  onPatch,
  onRemove,
}: {
  index: number;
  block: AttachmentBlock;
  isTableMode: boolean;
  canRemove: boolean;
  onPatch: (patch: Partial<AttachmentBlock>) => void;
  onRemove: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  function runCheck() {
    const valid = AUDIENCE_ID_RE.test(block.query);
    const detected = valid
      ? Array.from(
          new Set(
            block.query
              .split(/[\s,();]+/)
              .map((w) => w.replace(/^[^a-z0-9_]+|[^a-z0-9_]+$/gi, ""))
              .filter((w) => w.includes("_") && /^[a-z0-9_]+$/i.test(w)),
          ),
        )
      : [];
    onPatch({ checked: true, queryValid: valid, detectedFields: detected });
  }

  function addColumn(field: string) {
    if (block.columns.some((c) => c.field === field)) return;
    onPatch({ columns: [...block.columns, { id: `col-${++cid}`, field, displayName: "" }] });
  }

  const ready =
    block.queryValid &&
    (!isTableMode || (block.columns.length > 0 && block.columns.every((c) => c.displayName.trim())));

  return (
    <div
      className="space-y-3 rounded-xl border-2 bg-card p-4"
      style={{
        borderColor: ready
          ? ACCENT
          : block.checked && !block.queryValid
            ? "hsl(var(--destructive))"
            : "hsl(var(--border))",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Attachment Block {index + 1}</div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              ready ? "bg-cat-green-soft" : "bg-muted text-muted-foreground",
            )}
            style={ready ? { color: ACCENT } : undefined}
          >
            {ready ? "🟢 Ready" : "⚪ Incomplete"}
          </span>
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

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-muted-foreground">Query</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Query requirements">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Make sure audience ID is included</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          rows={5}
          value={block.query}
          placeholder="Paste your query here"
          className="font-mono text-[12px]"
          onChange={(e) =>
            onPatch({
              query: e.target.value,
              checked: false,
              queryValid: false,
              detectedFields: [],
              columns: [],
            })
          }
        />
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={runCheck}>
            Check Query
          </Button>
          {block.checked && (
            <span
              className="flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: block.queryValid ? ACCENT : "hsl(var(--destructive))" }}
            >
              {block.queryValid ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Audience ID column found
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" /> No audience ID column detected
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {isTableMode && block.queryValid && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-[12px] font-medium text-muted-foreground">
            Detected fields — drag into table below.
          </div>
          <div className="flex flex-wrap gap-2">
            {block.detectedFields.length === 0 && (
              <span className="text-[12px] text-muted-foreground">
                No underscore fields detected in the query.
              </span>
            )}
            {block.detectedFields.map((f) => {
              const used = block.columns.some((c) => c.field === f);
              return (
                <button
                  key={f}
                  type="button"
                  draggable={!used}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", f)}
                  onClick={() => addColumn(f)}
                  disabled={used}
                  style={!used ? { borderColor: `${ACCENT}66`, backgroundColor: `${ACCENT}0D` } : undefined}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px]",
                    used
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground/60"
                      : "cursor-grab text-foreground",
                  )}
                >
                  <GripVertical className="h-3 w-3 opacity-60" />
                  {f}
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
              const fld = e.dataTransfer.getData("text/plain");
              if (fld) addColumn(fld);
            }}
            style={dragOver ? { borderColor: ACCENT, backgroundColor: `${ACCENT}0D` } : undefined}
            className={cn(
              "flex min-h-[110px] gap-3 overflow-x-auto rounded-lg border-2 border-dashed p-3 transition",
              !dragOver && "border-border bg-card",
            )}
          >
            {block.columns.length === 0 && (
              <div className="m-auto text-[12px] text-muted-foreground">
                Table Builder — drop fields here to create columns
              </div>
            )}
            {block.columns.map((c) => (
              <div
                key={c.id}
                className="w-48 shrink-0 space-y-2 rounded-lg border border-border bg-background p-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {c.field}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove column ${c.field}`}
                    onClick={() => onPatch({ columns: block.columns.filter((x) => x.id !== c.id) })}
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
                      columns: block.columns.map((x) =>
                        x.id === c.id ? { ...x, displayName: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Approver-side attachment summary (bound to global flow state) ---------------- */

export function DynamicAttachmentApproverSummary() {
  const f = useFlow();
  const passed = f.blocks.filter((b) => b.checked && b.queryValid);
  const varsMapped = f.varChecked && f.varsRequired && f.varQueryChecked && f.varQueryValid;

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
            {f.entityBlocks.map((b, i) => (
              <div key={b.id} className="rounded-lg border border-border bg-background p-2.5">
                <div className="text-[13px] font-medium">
                  Entity: {b.entity || `— (block ${i + 1})`}
                </div>
                <ul className="mt-1 space-y-1 text-[12px]">
                  <li className={b.hasPdfs ? "font-medium" : "text-muted-foreground"}>
                    {b.hasPdfs ? "✅ PDF set attached" : "⚠️ PDF set missing"}
                  </li>
                  <li className={b.hasMfdList ? "font-medium" : "text-muted-foreground"}>
                    {b.hasMfdList ? "✅ MFD list attached" : "⚠️ MFD list missing"}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        )}

        {f.attachmentType === "dynamic_pdf" && f.pdfMode === "user" && (
          <div className="space-y-2">
            <div className="text-[12px] font-semibold" style={{ color: ACCENT }}>
              Dynamic PDF (User Level)
            </div>
            <ul className="space-y-1.5">
              {f.userBlocks.map((b, i) => {
                const ready = userBlockReady(b);
                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                    {ready ? (
                      <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={ready ? "font-medium" : "text-muted-foreground"}>
                      {b.resolvedName || `Combination ${i + 1} not configured`}
                      {ready ? " — PDFs and lists attached" : " — pending uploads"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}


        {f.attachmentType === "dynamic_attachment" && (
          <p className="text-[13px]">
            {passed.length > 0 ? (
              <>
                <span className="font-medium">Data Export Configured:</span> Validated query
                attached.
                {passed.length > 1 ? ` (${passed.length} exports)` : ""}
              </>
            ) : (
              <span className="text-muted-foreground">
                Awaiting a validated query with audience IDs.
              </span>
            )}
          </p>
        )}

        {f.attachmentType === "dynamic_table" && (
          <div className="space-y-3">
            {passed.length === 0 && (
              <p className="text-[13px] text-muted-foreground">No validated table queries yet.</p>
            )}
            {passed.map((b, i) => (
              <div key={b.id} className="overflow-x-auto rounded-lg border border-border bg-background p-3">
                <div className="mb-2 text-[12px] font-medium text-muted-foreground">
                  Table preview · Block {i + 1}
                </div>
                {b.columns.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground">No columns mapped yet.</div>
                ) : (
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr>
                        {b.columns.map((c) => (
                          <th
                            key={c.id}
                            className="border border-border bg-muted/50 px-2 py-1 text-left font-semibold"
                          >
                            {c.displayName.trim() || c.field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((r) => (
                        <tr key={r}>
                          {b.columns.map((c) => (
                            <td key={c.id} className="border border-border px-2 py-1 text-muted-foreground">
                              {`${c.field}_${r}`}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}

        {varsMapped && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
            style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Template Variables: Query Mapped Successfully
          </span>
        )}
      </div>
    </div>
  );
}
