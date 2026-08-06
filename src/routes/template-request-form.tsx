import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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

import { AppShell } from "@/components/layout/AppShell";
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

export const Route = createFileRoute("/template-request-form")({
  head: () => ({
    meta: [
      { title: "Template Request Form — Audience & Attachments" },
      {
        name: "description",
        content:
          "State-driven prototype for selecting a template attachment type and configuring vendor audience groups with entity PDF clearance.",
      },
      { property: "og:title", content: "Template Request Form — Audience & Attachments" },
      {
        property: "og:description",
        content:
          "Pick an attachment type and configure audience groups, targeted ID lists and entity PDF uploads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplateRequestFormPage,
});

/* ---------------- Schema ---------------- */

type AttachmentType = "none" | "dynamic_attachment" | "dynamic_table" | "dynamic_pdf";

interface AudienceGroup {
  id: string;
  entity: string;
  subType: string;
  hasPdf: boolean;
  hasTargetedList: boolean;
}

interface MappedColumn {
  id: string;
  field: string;
  displayName: string;
}

interface AttachmentBlock {
  id: string;
  query: string;
  checked: boolean;
  queryValid: boolean;
  detectedFields: string[];
  columns: MappedColumn[];
}

let bid = 1;
const newBlock = (): AttachmentBlock => ({
  id: `blk-${++bid}`,
  query: "",
  checked: false,
  queryValid: false,
  detectedFields: [],
  columns: [],
});


const TYPE_CARDS: {
  id: AttachmentType;
  label: string;
  desc: string;
  icon: typeof Ban;
}[] = [
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

let gid = 1;
const newGroup = (): AudienceGroup => ({
  id: String(++gid),
  entity: "",
  subType: "",
  hasPdf: false,
  hasTargetedList: false,
});

/* ---------------- Page ---------------- */

function TemplateRequestFormPage() {
  const [attachmentType, setAttachmentType] = useState<AttachmentType>("none");
  const [b1Audience, setB1Audience] = useState<string[]>([]);
  const [b2AudienceGroups, setB2AudienceGroups] = useState<AudienceGroup[]>([
    { id: "1", entity: "", subType: "", hasPdf: false, hasTargetedList: false },
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

  function patchBlock(id: string, patch: Partial<AttachmentBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  const groupsDirty = b2AudienceGroups.some(
    (g) => g.entity || g.subType || g.hasPdf || g.hasTargetedList,
  );

  function selectType(next: AttachmentType) {
    if (next === attachmentType) return;
    if (attachmentType === "dynamic_pdf" && groupsDirty) {
      const ok = window.confirm(
        "Switching attachment type will clear your entity audience groups. Continue?",
      );
      if (!ok) return;
      gid = 1;
      setB2AudienceGroups([
        { id: "1", entity: "", subType: "", hasPdf: false, hasTargetedList: false },
      ]);
    }
    setAttachmentType(next);
  }

  function patchGroup(id: string, patch: Partial<AudienceGroup>) {
    setB2AudienceGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
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

  const showTargetedUpload = b1Audience.some((a) => a.startsWith("Targeted"));
  const isPdf = attachmentType === "dynamic_pdf";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        <header>
          <h1 className="text-xl font-semibold">Template Request Form</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how data reaches the recipient, then define who receives it.
          </p>
        </header>

        {/* Part A */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            A · Attachment type
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TYPE_CARDS.map((c) => {
              const Icon = c.icon;
              const active = attachmentType === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectType(c.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div className="mt-2 text-sm font-semibold">{c.label}</div>
                  <div className="mt-1 text-[12px] leading-snug text-muted-foreground">
                    {c.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Part B */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            B · Audience
          </h2>

          {!isPdf && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium">Select audience</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {B1_OPTIONS.map((opt) => {
                  const checked = b1Audience.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setB1Audience((prev) =>
                            v ? [...prev, opt] : prev.filter((p) => p !== opt),
                          )
                        }
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>

              {showTargetedUpload && (
                <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-6 text-center">
                  <Upload className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-2 text-sm font-medium">Upload targeted ID list</div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    .csv or .xlsx · one ID per row (mock upload)
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-3">
                    Choose file
                  </Button>
                </div>
              )}
            </div>
          )}

          {isPdf && (
            <div className="space-y-3">
              {b2AudienceGroups.map((g, i) => {
                const dup = duplicateOf[g.id];
                const ready = g.hasPdf && g.hasTargetedList;
                return (
                  <div
                    key={g.id}
                    className="space-y-3 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">Audience Group {i + 1}</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            ready
                              ? "bg-cat-green-soft text-cat-green"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {ready ? "🟢 Ready" : "⚪ Incomplete"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={b2AudienceGroups.length === 1}
                          onClick={() =>
                            setB2AudienceGroups((prev) =>
                              prev.filter((p) => p.id !== g.id),
                            )
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
                        <Select
                          value={g.entity}
                          onValueChange={(v) => patchGroup(g.id, { entity: v })}
                        >
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
                          onValueChange={(v) => patchGroup(g.id, { subType: v })}
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
                      <UploadButton
                        label="Upload PDF"
                        done={g.hasPdf}
                        onClick={() => patchGroup(g.id, { hasPdf: !g.hasPdf })}
                      />
                      <UploadButton
                        label="Upload MFD list"
                        done={g.hasTargetedList}
                        onClick={() =>
                          patchGroup(g.id, { hasTargetedList: !g.hasTargetedList })
                        }
                      />
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() => setB2AudienceGroups((prev) => [...prev, newGroup()])}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add another audience group
              </Button>
            </div>
          )}
        </section>

        {/* Part C */}
        {attachmentType !== "none" && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              C · Attachment configuration
            </h2>

            {isPdf ? (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                PDF attachments are configured per audience group above.{" "}
                <span className="font-medium text-foreground">
                  {b2AudienceGroups.length}
                </span>{" "}
                group(s) configured,{" "}
                <span className="font-medium text-foreground">
                  {b2AudienceGroups.filter((g) => g.hasPdf && g.hasTargetedList).length}
                </span>{" "}
                ready.
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((b, i) => (
                  <AttachmentBlockCard
                    key={b.id}
                    index={i}
                    block={b}
                    isTableMode={attachmentType === "dynamic_table"}
                    canRemove={blocks.length > 1}
                    onPatch={(patch) => patchBlock(b.id, patch)}
                    onRemove={() =>
                      setBlocks((prev) => prev.filter((p) => p.id !== b.id))
                    }
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBlocks((prev) => [...prev, newBlock()])}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add another attachment block
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function UploadButton({
  label,
  done,
  onClick,
}: {
  label: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[13px] font-medium transition",
        done
          ? "border-cat-green bg-cat-green-soft text-cat-green"
          : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
      {done ? `${label} · uploaded` : label}
    </button>
  );
}
