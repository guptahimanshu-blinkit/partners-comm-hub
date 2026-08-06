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

export interface AudienceGroup {
  id: string;
  entity: string;
  subType: string;
  pdfFiles: string[];
  hasTargetedList: boolean;
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

let gid = 1;
const newGroup = (): AudienceGroup => ({
  id: `grp-${++gid}`,
  entity: "",
  subType: "",
  pdfFiles: [],
  hasTargetedList: false,
});

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
const ENTITIES = ["BPCL", "Moonstone", "ZHPL"];
const SUB_TYPES = ["Non-Food", "Food"];

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
  const [b2AudienceGroups, setB2AudienceGroups] = useState<AudienceGroup[]>([
    { id: "grp-1", entity: "", subType: "", pdfFiles: [], hasTargetedList: false },
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
  const [templateId, setTemplateId] = useState("");
  const [varChecked, setVarChecked] = useState(false);
  const [varQuery, setVarQuery] = useState("");
  const [varQueryChecked, setVarQueryChecked] = useState(false);
  const [varQueryValid, setVarQueryValid] = useState(false);

  const varsRequired = templateId.includes("9") || templateId.trim() === "1234567";
  const isPdf = attachmentType === "dynamic_pdf";

  const groupsDirty = b2AudienceGroups.some(
    (g) => g.entity || g.subType || g.pdfFiles.length > 0 || g.hasTargetedList,
  );
  const blocksDirty = blocks.some((b) => b.query.trim() || b.columns.length > 0);

  function patchBlock(id: string, patch: Partial<AttachmentBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function patchGroup(id: string, patch: Partial<AudienceGroup>) {
    setB2AudienceGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function selectType(next: AttachmentType) {
    if (next === attachmentType) return;
    if (attachmentType === "dynamic_pdf" && groupsDirty) {
      if (
        !window.confirm(
          "Switching attachment type will clear your entity audience groups. Continue?",
        )
      )
        return;
      setB2AudienceGroups([newGroup()]);
    }
    if (
      (attachmentType === "dynamic_attachment" || attachmentType === "dynamic_table") &&
      blocksDirty
    ) {
      if (
        !window.confirm(
          "Switching attachment type will clear your configured queries and tables. Continue?",
        )
      )
        return;
      setBlocks([newBlock()]);
    }
    setAttachmentType(next);
  }

  const duplicateOf = useMemo(() => {
    const map: Record<string, number | null> = {};
    b2AudienceGroups.forEach((g, i) => {
      map[g.id] = null;
      if (!g.entity || !g.subType) return;
      const prior = b2AudienceGroups.findIndex(
        (o, oi) => oi < i && o.entity === g.entity && o.subType === g.subType,
      );
      map[g.id] = prior >= 0 ? prior + 1 : null;
    });
    return map;
  }, [b2AudienceGroups]);

  const blockers = useMemo(() => {
    const out: string[] = [];
    if (isPdf) {
      if (!b2AudienceGroups.every((g) => g.pdfFiles.length > 0 && g.hasTargetedList))
        out.push("Every audience group must be Ready (at least 1 PDF + MFD list uploaded).");
    } else if (attachmentType !== "none") {
      if (!blocks.every((b) => b.checked && b.queryValid))
        out.push("Every attachment block needs a passing query check.");
      if (
        attachmentType === "dynamic_table" &&
        !blocks.every((b) => b.columns.length > 0 && b.columns.every((c) => c.displayName.trim()))
      )
        out.push("Every mapped table column needs a display name.");
    }
    if (varChecked && varsRequired && !(varQueryChecked && varQueryValid))
      out.push("Template variable query must pass the check.");
    return out;
  }, [
    isPdf,
    attachmentType,
    b2AudienceGroups,
    blocks,
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
    b2AudienceGroups,
    setB2AudienceGroups,
    patchGroup,
    duplicateOf,
    blocks,
    setBlocks,
    patchBlock,
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

        {f.isPdf && (
          <div className="space-y-3">
            {f.b2AudienceGroups.map((g, i) => {
              const dup = f.duplicateOf[g.id];
              const ready = g.pdfFiles.length > 0 && g.hasTargetedList;
              return (
                <div
                  key={g.id}
                  className="space-y-3 rounded-xl border-2 bg-card p-4"
                  style={{ borderColor: ready ? ACCENT : "hsl(var(--border))" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Audience Group {i + 1}</div>
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
                        disabled={f.b2AudienceGroups.length === 1}
                        onClick={() =>
                          f.setB2AudienceGroups((prev) => prev.filter((p) => p.id !== g.id))
                        }
                        aria-label={`Remove audience group ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-[12px] text-muted-foreground">Entity</div>
                      <Select value={g.entity} onValueChange={(v) => f.patchGroup(g.id, { entity: v })}>
                        <SelectTrigger>
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
                    </div>
                    <div className="space-y-1">
                      <div className="text-[12px] text-muted-foreground">Sub-type</div>
                      <Select
                        value={g.subType}
                        onValueChange={(v) => f.patchGroup(g.id, { subType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUB_TYPES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {dup && (
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Combination already used in Group {dup}.
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <UploadButton
                        label="Upload PDF set"
                        done={g.pdfFiles.length > 0}
                        doneLabel={`Upload PDF set · ${g.pdfFiles.length} file${g.pdfFiles.length === 1 ? "" : "s"}`}
                        onClick={() =>
                          f.patchGroup(g.id, {
                            pdfFiles: [
                              ...g.pdfFiles,
                              `${(g.entity || "entity").toLowerCase()}_${(g.subType || "doc").toLowerCase()}_${g.pdfFiles.length + 1}.pdf`,
                            ],
                          })
                        }
                      />
                      {g.pdfFiles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
                          >
                            {g.pdfFiles.length} file{g.pdfFiles.length === 1 ? "" : "s"} uploaded
                          </span>
                          <button
                            type="button"
                            className="text-[11px] text-muted-foreground underline hover:text-destructive"
                            onClick={() => f.patchGroup(g.id, { pdfFiles: [] })}
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                    <UploadButton
                      label="Upload MFD list"
                      done={g.hasTargetedList}
                      onClick={() => f.patchGroup(g.id, { hasTargetedList: !g.hasTargetedList })}
                    />
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() => f.setB2AudienceGroups((prev) => [...prev, newGroup()])}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add another audience group
            </Button>
          </div>
        )}
      </section>

      {/* Part C */}
      {f.attachmentType !== "none" && (
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">C · Attachment configuration</h3>

          {f.isPdf ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              PDF attachments are configured per audience group above.{" "}
              <span className="font-medium text-foreground">{f.b2AudienceGroups.length}</span>{" "}
              group(s) configured,{" "}
              <span className="font-medium text-foreground">
                {f.b2AudienceGroups.filter((g) => g.pdfFiles.length > 0 && g.hasTargetedList).length}
              </span>{" "}
              ready.
            </div>
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

/* ---------------- Approver Dashboard (read-only live sync) ---------------- */

export function DynamicAttachmentApproverDashboard() {
  const f = useFlow();
  const groups = f.b2AudienceGroups;
  const blocks = f.blocks;
  const varsMapped = f.varChecked && f.varsRequired && f.varQueryChecked && f.varQueryValid;
  const passed = blocks.filter((b) => b.checked && b.queryValid);

  return (
    <section
      className="rounded-xl border p-5"
      style={{ borderColor: `${ACCENT}4D`, backgroundColor: `${ACCENT}0A` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Approver Dashboard (Live Sync Preview)</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Read-only mirror of the submitter form state.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Mode: {TYPE_LABEL[f.attachmentType]}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {f.attachmentType === "none" && (
          <div className="rounded-lg border border-border bg-background p-3 text-[13px] text-muted-foreground">
            No attachment configured for this communication.
          </div>
        )}

        {f.attachmentType === "dynamic_pdf" && (
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="text-[13px] font-medium">PDF Clearance Checklist</div>
            <ul className="mt-2 space-y-1.5">
              {groups.map((g, i) => {
                const clear = g.hasPdf && g.hasTargetedList;
                return (
                  <li key={g.id} className="flex items-center gap-2 text-[13px]">
                    {clear ? (
                      <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT }} />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={clear ? "" : "text-muted-foreground"}>
                      {g.entity || "—"} · {g.subType || "—"}
                    </span>
                    {!clear && (
                      <span className="text-[11px] text-muted-foreground">
                        (Group {i + 1} pending uploads)
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {f.attachmentType === "dynamic_attachment" && (
          <div className="rounded-lg border border-border bg-background p-3 text-[13px]">
            {passed.length > 0 ? (
              <span>
                <span className="font-medium">Data Export Configured:</span> Validated query
                containing audience IDs attached.
                {passed.length > 1 ? ` (${passed.length} exports)` : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Awaiting a validated query with audience IDs.
              </span>
            )}
          </div>
        )}

        {f.attachmentType === "dynamic_table" && (
          <div className="space-y-3">
            {passed.length === 0 && (
              <div className="rounded-lg border border-border bg-background p-3 text-[13px] text-muted-foreground">
                No validated table queries yet.
              </div>
            )}
            {passed.map((b, i) => (
              <div
                key={b.id}
                className="overflow-x-auto rounded-lg border border-border bg-background p-3"
              >
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
                            <td
                              key={c.id}
                              className="border border-border px-2 py-1 text-muted-foreground"
                            >
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

      <div
        className="mt-4 border-t pt-3 text-[11px] text-muted-foreground"
        style={{ borderColor: `${ACCENT}40` }}
      >
        Approver view syncs in real-time with the form above.
      </div>
    </section>
  );
}
