import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Paperclip,
  FileText,
  Table2,
  Type,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  Beaker,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attachment-flow")({
  head: () => ({
    meta: [
      { title: "Dynamic Attachment Flow — Template Request" },
      {
        name: "description",
        content:
          "Prototype for configuring dynamic attachments on a vendor template request: field tiles, entity PDF sets and live table builders.",
      },
      { property: "og:title", content: "Dynamic Attachment Flow — Template Request" },
      {
        property: "og:description",
        content:
          "Configure query-driven attachments, entity PDF sets and live email tables against mock data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttachmentFlowPage,
});

/* ------------------------------------------------------------------ */
/* 1. MOCK DATA SCHEMA                                                 */
/* ------------------------------------------------------------------ */

interface MockQueryResult {
  queryName: string;
  columns: string[];
  entities: string[];
  sampleRow: Record<string, string | number> | null;
}

const VALID_MOCK: MockQueryResult = {
  queryName: "Vendor Rebate Data",
  columns: ["vendor_id", "instances", "charges", "entity_name"],
  entities: ["Entity A", "Entity B"],
  sampleRow: { vendor_id: "V-101", instances: 4, charges: 1250.5, entity_name: "Entity A" },
};

/** Broken variant — vendor_id and charges are missing from the query output. */
const MISSING_MOCK: MockQueryResult = {
  queryName: "Vendor Rebate Data",
  columns: ["instances", "entity_name"],
  entities: ["Entity A", "Entity B"],
  sampleRow: { instances: 4, entity_name: "Entity A" },
};

const PRE_APPROVED_QUERIES = [
  "Vendor Rebate Data",
  "Monthly Fee Reconciliation",
  "RTV Instance Summary",
];

const NUMERIC_COLUMNS = new Set(["instances", "charges"]);

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function SectionCard({
  step,
  title,
  subtitle,
  children,
  invalid,
}: {
  step: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  invalid?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm sm:p-5",
        invalid ? "border-destructive" : "border-border",
      )}
    >
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {step}
        </div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function FieldTile({
  name,
  onClick,
  disabled,
  active,
}: {
  name: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", name)}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/50 text-foreground hover:border-primary hover:bg-primary/10",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {name}
    </button>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-[11px] font-medium text-destructive">
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Solution 1 — insert tokens into email text                          */
/* ------------------------------------------------------------------ */

const TOKEN_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function TokenizedText({ text, values }: { text: string; values?: Record<string, unknown> }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE.source, "g");
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const key = m[1];
    const hydrated = values ? values[key] : undefined;
    const missing = values ? hydrated === undefined : false;
    parts.push(
      <span
        key={`${key}-${m.index}`}
        className={cn(
          "mx-0.5 inline-block rounded px-1.5 py-0.5 align-baseline text-[11px] font-semibold",
          missing
            ? "bg-destructive/15 text-destructive"
            : values
              ? "bg-primary/15 text-primary"
              : "bg-amber-500/20 font-mono text-amber-700 dark:text-amber-400",
        )}
      >
        {values ? (missing ? `no value for ${key}` : String(hydrated)) : `{{${key}}}`}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function EmailTextSolution({
  body,
  setBody,
  columns,
  cursor,
  setCursor,
}: {
  body: string;
  setBody: (v: string) => void;
  columns: string[];
  cursor: number;
  setCursor: (n: number) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insert = (col: string) => {
    const tag = `{{${col}}}`;
    const at = Math.min(cursor, body.length);
    const next = body.slice(0, at) + tag + body.slice(at);
    setBody(next);
    setCursor(at + tag.length);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(at + tag.length, at + tag.length);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Click a field to insert at cursor:</span>
        {columns.map((c) => (
          <FieldTile key={c} name={c} onClick={() => insert(c)} />
        ))}
      </div>
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setCursor(e.target.selectionStart);
        }}
        onClick={(e) => setCursor(e.currentTarget.selectionStart)}
        onKeyUp={(e) => setCursor(e.currentTarget.selectionStart)}
        rows={5}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
      />
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Locked token preview
        </div>
        <TokenizedText text={body} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Solution 2 — entity PDF sets                                        */
/* ------------------------------------------------------------------ */

function EntityPdfSolution({
  entities,
  uploaded,
  toggle,
}: {
  entities: string[];
  uploaded: Record<string, boolean>;
  toggle: (e: string, v: boolean) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entities.map((e) => {
        const ready = !!uploaded[e];
        return (
          <div
            key={e}
            className={cn(
              "rounded-lg border p-3",
              ready ? "border-primary/40 bg-primary/5" : "border-destructive/50 bg-destructive/5",
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{e}</span>
            </div>
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-[11px] font-medium",
                ready ? "text-primary" : "text-destructive",
              )}
            >
              {ready ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {ready ? "PDF set ready" : "Upload needed"}
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toggle(e, true)}>
                <Upload className="h-3.5 w-3.5" /> Upload
              </Button>
              {ready && (
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => toggle(e, false)}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Solution 3 — live table builder                                     */
/* ------------------------------------------------------------------ */

interface HighlightRule {
  op: "lt" | "gt";
  value: string;
  color: string;
}

const HIGHLIGHT_COLORS = ["#EF4444", "#F59E0B", "#2F7D32", "#3B82F6"];

function DropSlot({
  label,
  value,
  onAssign,
  onClear,
  invalid,
  hint,
}: {
  label: string;
  value?: string;
  onAssign: (field: string) => void;
  onClear: () => void;
  invalid?: boolean;
  hint?: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.getData("text/plain");
        if (f) onAssign(f);
      }}
      className={cn(
        "rounded-lg border-2 border-dashed p-2.5 transition",
        over && "border-primary bg-primary/10",
        !over && invalid && "border-destructive bg-destructive/5",
        !over && !invalid && "border-border bg-muted/20",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {value ? (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
            {value}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Clear ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-muted-foreground">
          {hint ?? "Drop or click-assign a field tile"}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type SolutionKey = "text" | "pdf" | "table";

function AttachmentFlowPage() {
  /* Dev-control mock state */
  const [validColumns, setValidColumns] = useState(true);
  const [pdfPreUploaded, setPdfPreUploaded] = useState(false);
  const [vendorMatch, setVendorMatch] = useState(true);

  const mock: MockQueryResult = validColumns ? VALID_MOCK : MISSING_MOCK;

  /* Step 1 */
  const [dynamicAttachment, setDynamicAttachment] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<string>("");

  /* Step 3 */
  const [solution, setSolution] = useState<SolutionKey | null>(null);

  const [body, setBody] = useState(
    "Hi team, we have logged {{instances}} instances this cycle. Please review.",
  );
  const [cursor, setCursor] = useState(0);

  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setUploaded(
      Object.fromEntries(mock.entities.map((e) => [e, pdfPreUploaded])) as Record<string, boolean>,
    );
  }, [pdfPreUploaded, validColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tableSlots, setTableSlots] = useState<(string | undefined)[]>([
    undefined,
    undefined,
    undefined,
  ]);
  const [summarySlot, setSummarySlot] = useState<string | undefined>();
  const [activeTile, setActiveTile] = useState<string | undefined>();
  const [highlight, setHighlight] = useState<HighlightRule>({
    op: "lt",
    value: "1000",
    color: HIGHLIGHT_COLORS[0],
  });
  const [highlightOn, setHighlightOn] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  /* Drop stale field assignments when the mock columns change */
  useEffect(() => {
    setTableSlots((s) => s.map((v) => (v && mock.columns.includes(v) ? v : undefined)));
    setSummarySlot((v) => (v && mock.columns.includes(v) ? v : undefined));
  }, [validColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignedNumeric = tableSlots.some((s) => s && NUMERIC_COLUMNS.has(s));
  useEffect(() => {
    if (!assignedNumeric) setHighlightOn(false);
  }, [assignedNumeric]);

  /* ---------------- Live validation engine ---------------- */
  const usedFields = useMemo(() => {
    if (solution === "text") {
      const out: string[] = [];
      const re = new RegExp(TOKEN_RE.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(body))) out.push(m[1]);
      return Array.from(new Set(out));
    }
    if (solution === "table") {
      return Array.from(
        new Set([...tableSlots.filter(Boolean), summarySlot].filter(Boolean) as string[]),
      );
    }
    if (solution === "pdf") return mock.columns.filter((c) => c === "entity_name");
    return [];
  }, [solution, body, tableSlots, summarySlot, mock.columns]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!dynamicAttachment) return e;
    if (!selectedQuery) e.push("Select a pre-approved query to continue.");
    if (selectedQuery && !mock.columns.includes("vendor_id"))
      e.push("Query output is missing vendor_id — per-vendor personalisation cannot resolve.");
    const orphan = usedFields.filter((f) => !mock.columns.includes(f));
    if (orphan.length)
      e.push(`Fields no longer returned by the query: ${orphan.join(", ")}. Remove or re-assign.`);
    if (!solution && selectedQuery) e.push("Pick a solution type.");
    if (solution === "pdf") {
      const missing = mock.entities.filter((x) => !uploaded[x]);
      if (missing.length) e.push(`PDF set missing for: ${missing.join(", ")}.`);
    }
    if (solution === "table" && tableSlots.every((s) => !s))
      e.push("Assign at least one field to a table column slot.");
    if (solution === "text" && usedFields.length === 0)
      e.push("Insert at least one field tile into the email body.");
    return e;
  }, [dynamicAttachment, selectedQuery, mock, usedFields, solution, uploaded, tableSlots]);

  const canSubmit = errors.length === 0;

  const sampleRow = vendorMatch ? mock.sampleRow : null;

  const assignTile = (field: string) => {
    const idx = tableSlots.findIndex((s) => !s);
    if (idx >= 0) setTableSlots((s) => s.map((v, i) => (i === idx ? field : v)));
    setActiveTile(field);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24 sm:p-6">
        <header className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/15 p-2 text-primary">
            <Paperclip className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Template Request: Dynamic Attachment Flow
            </h1>
            <p className="text-sm text-muted-foreground">
              Everything below is generated from a mock query result object.
            </p>
          </div>
        </header>

        {/* Step 1 */}
        <SectionCard step="Step 1" title="Query selection">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dynamicAttachment}
              onChange={(e) => setDynamicAttachment(e.target.checked)}
              className="h-4 w-4"
            />
            Dynamic Attachment: <strong>{dynamicAttachment ? "Yes" : "No"}</strong>
          </label>
          {dynamicAttachment && (
            <div className="mt-3 max-w-sm">
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                Select a pre-approved query
              </div>
              <select
                value={selectedQuery}
                onChange={(e) => setSelectedQuery(e.target.value)}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm",
                  selectedQuery ? "border-border" : "border-destructive",
                )}
              >
                <option value="">— Choose a query —</option>
                {PRE_APPROVED_QUERIES.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
          )}
        </SectionCard>

        {/* Step 2 */}
        {dynamicAttachment && selectedQuery && (
          <SectionCard
            step="Step 2"
            title="Available field tiles"
            subtitle={`Auto-generated from the ${mock.columns.length} column(s) returned by "${selectedQuery}".`}
            invalid={!mock.columns.includes("vendor_id")}
          >
            <div className="flex flex-wrap gap-2">
              {mock.columns.map((c) => (
                <FieldTile
                  key={c}
                  name={c}
                  active={activeTile === c}
                  onClick={() => setActiveTile(c === activeTile ? undefined : c)}
                />
              ))}
            </div>
            {!mock.columns.includes("vendor_id") && (
              <div className="mt-2">
                <ErrorLine>vendor_id is not returned by this query.</ErrorLine>
              </div>
            )}
          </SectionCard>
        )}

        {/* Step 3 */}
        {dynamicAttachment && selectedQuery && (
          <SectionCard step="Step 3" title="Solution type">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { key: "text", label: "Insert values into email text", icon: Type },
                  { key: "pdf", label: "Attach entity-level PDF set", icon: FileText },
                  { key: "table", label: "Build a live table in email body", icon: Table2 },
                ] as { key: SolutionKey; label: string; icon: typeof Type }[]
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSolution(s.key)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    solution === s.key
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/50",
                  )}
                >
                  <s.icon className="h-4 w-4 text-primary" />
                  <div className="mt-1.5 text-sm font-semibold leading-snug">{s.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              {solution === "text" && (
                <EmailTextSolution
                  body={body}
                  setBody={setBody}
                  columns={mock.columns}
                  cursor={cursor}
                  setCursor={setCursor}
                />
              )}

              {solution === "pdf" && (
                <EntityPdfSolution
                  entities={mock.entities}
                  uploaded={uploaded}
                  toggle={(e, v) => setUploaded((u) => ({ ...u, [e]: v }))}
                />
              )}

              {solution === "table" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      Drag a tile onto a slot, or click a tile to fill the next empty slot:
                    </span>
                    {mock.columns.map((c) => (
                      <FieldTile
                        key={c}
                        name={c}
                        active={activeTile === c}
                        onClick={() => assignTile(c)}
                      />
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {tableSlots.map((v, i) => (
                      <DropSlot
                        key={i}
                        label={`Column ${i + 1}`}
                        value={v}
                        onAssign={(f) => setTableSlots((s) => s.map((x, j) => (j === i ? f : x)))}
                        onClear={() => setTableSlots((s) => s.map((x, j) => (j === i ? undefined : x)))}
                        invalid={i === 0 && !v}
                      />
                    ))}
                  </div>

                  {assignedNumeric && (
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <label className="flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={highlightOn}
                          onChange={(e) => setHighlightOn(e.target.checked)}
                          className="h-3.5 w-3.5"
                        />
                        Conditional formatting on numeric column
                      </label>
                      {highlightOn && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span>Highlight if</span>
                          <select
                            value={highlight.op}
                            onChange={(e) =>
                              setHighlight((h) => ({ ...h, op: e.target.value as "lt" | "gt" }))
                            }
                            className="rounded-md border border-border bg-background px-2 py-1"
                          >
                            <option value="lt">less than</option>
                            <option value="gt">greater than</option>
                          </select>
                          <input
                            value={highlight.value}
                            onChange={(e) => setHighlight((h) => ({ ...h, value: e.target.value }))}
                            inputMode="decimal"
                            className={cn(
                              "w-28 rounded-md border bg-background px-2 py-1",
                              highlight.value.trim() ? "border-border" : "border-destructive",
                            )}
                          />
                          <span className="ml-1">Colour</span>
                          <div className="flex gap-1">
                            {HIGHLIGHT_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                aria-label={`Highlight colour ${c}`}
                                onClick={() => setHighlight((h) => ({ ...h, color: c }))}
                                style={{ background: c }}
                                className={cn(
                                  "h-6 w-6 rounded-full border-2",
                                  highlight.color === c ? "border-foreground" : "border-transparent",
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <DropSlot
                    label="Summary Row (optional)"
                    value={summarySlot}
                    onAssign={(f) => setSummarySlot(f)}
                    onClear={() => setSummarySlot(undefined)}
                    hint="Does not require a vendor_id tile"
                  />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Step 4 */}
        {dynamicAttachment && selectedQuery && solution && (
          <SectionCard step="Step 4" title="Approver review (read-only)">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Pre-approved query
                </div>
                <div className="text-sm font-semibold">{selectedQuery}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Fields utilised
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {usedFields.length === 0 && (
                    <span className="text-xs text-muted-foreground">None yet</span>
                  )}
                  {usedFields.map((f) => (
                    <span
                      key={f}
                      className={cn(
                        "rounded px-2 py-0.5 font-mono text-[11px] font-semibold",
                        mock.columns.includes(f)
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button className="mt-3 gap-1.5" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" /> Preview for one vendor
            </Button>
          </SectionCard>
        )}

        {/* Validation + submit */}
        <div className="rounded-xl border border-border bg-card p-4">
          {errors.length > 0 ? (
            <div className="space-y-1">
              {errors.map((e) => (
                <ErrorLine key={e}>{e}</ErrorLine>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> All validation rules pass.
            </div>
          )}
          <Button className="mt-3" disabled={!canSubmit}>
            Submit template request
          </Button>
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Preview for one vendor</DialogTitle>
          {!sampleRow ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
              No matching row for this vendor in the query output — the attachment would be skipped
              at send time.
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="text-[11px] text-muted-foreground">
                Hydrated with sample row · vendor_id{" "}
                <span className="font-mono">{String(sampleRow.vendor_id ?? "—")}</span>
              </div>
              {solution === "text" && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 leading-relaxed">
                  <TokenizedText text={body} values={sampleRow} />
                </div>
              )}
              {solution === "pdf" && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  Attached: <strong>{String(sampleRow.entity_name)}_statement.pdf</strong>
                </div>
              )}
              {solution === "table" && (
                <table className="w-full overflow-hidden rounded-lg border border-border text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {tableSlots.filter(Boolean).map((c) => (
                        <th key={c} className="p-2 text-left font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {tableSlots.filter(Boolean).map((c) => {
                        const raw = sampleRow[c as string];
                        const num = typeof raw === "number" ? raw : Number.NaN;
                        const threshold = Number(highlight.value);
                        const hit =
                          highlightOn &&
                          NUMERIC_COLUMNS.has(c as string) &&
                          !Number.isNaN(num) &&
                          !Number.isNaN(threshold) &&
                          (highlight.op === "lt" ? num < threshold : num > threshold);
                        return (
                          <td
                            key={c}
                            className="border-t border-border p-2 font-medium"
                            style={hit ? { color: highlight.color } : undefined}
                          >
                            {raw === undefined ? "—" : String(raw)}
                          </td>
                        );
                      })}
                    </tr>
                    {summarySlot && (
                      <tr className="bg-muted/30">
                        <td
                          className="border-t border-border p-2 font-semibold"
                          colSpan={Math.max(1, tableSlots.filter(Boolean).length)}
                        >
                          Summary · {summarySlot}:{" "}
                          {String(sampleRow[summarySlot] ?? "—")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dev controls */}
      <div className="fixed right-4 top-20 z-40 w-56 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Beaker className="h-3.5 w-3.5" /> Dev controls
        </div>
        <div className="space-y-2 text-[11px]">
          <label className="flex items-center justify-between gap-2">
            <span>Query data</span>
            <button
              type="button"
              onClick={() => setValidColumns((v) => !v)}
              className={cn(
                "rounded px-2 py-1 font-semibold",
                validColumns ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
              )}
            >
              {validColumns ? "Valid columns" : "Missing columns"}
            </button>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>PDF upload</span>
            <button
              type="button"
              onClick={() => setPdfPreUploaded((v) => !v)}
              className={cn(
                "rounded px-2 py-1 font-semibold",
                pdfPreUploaded ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
              )}
            >
              {pdfPreUploaded ? "PDF uploaded" : "Missing PDF"}
            </button>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>Vendor match</span>
            <button
              type="button"
              onClick={() => setVendorMatch((v) => !v)}
              className={cn(
                "rounded px-2 py-1 font-semibold",
                vendorMatch ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
              )}
            >
              {vendorMatch ? "Matching row" : "No match"}
            </button>
          </label>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-2 right-3 z-40 text-[10px] text-muted-foreground">
        Prototype — simulates logic with mock data, not connected to live query/S3 infrastructure.
      </div>
    </AppShell>
  );
}
