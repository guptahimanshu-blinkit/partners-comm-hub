import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  APOLLO_SAMPLE_DATA,
  lookupApolloTemplate,
  type ApolloBannerTheme,
} from "@/lib/mock-data";

export type PreviewChannel = "email" | "whatsapp" | "dashboard";

const LIQUID_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function sampleFor(key: string): string {
  if (APOLLO_SAMPLE_DATA[key]) return APOLLO_SAMPLE_DATA[key];
  const k = key.toLowerCase();
  if (k.includes("date")) return "27 Jul 2026";
  if (k.includes("amount") || k.includes("value")) return "₹1,84,600";
  if (k.includes("vehicle") || k.includes("truck")) return "DL-01-EV-4412";
  if (k.includes("dock") || k.includes("bay")) return "Dock Bay 04";
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Replaces liquid tags with sample values, or wraps them in a highlight chip. */
function renderLiquid(html: string, hydrate: boolean): string {
  return html.replace(LIQUID_RE, (_m, key: string) =>
    hydrate
      ? `<span class="apollo-token apollo-token--filled">${sampleFor(key)}</span>`
      : `<span class="apollo-token">{{${key}}}</span>`,
  );
}

function plainLiquid(text: string, hydrate: boolean): string {
  return text.replace(LIQUID_RE, (_m, key: string) => (hydrate ? sampleFor(key) : `{{${key}}}`));
}

const BANNER_STYLES: Record<ApolloBannerTheme, { from: string; to: string; icon: string }> = {
  finance: { from: "#B45309", to: "#F59E0B", icon: "₹" },
  po: { from: "#1D4ED8", to: "#3B82F6", icon: "📦" },
  rtv: { from: "#B91C1C", to: "#EF4444", icon: "↩" },
  ops: { from: "#166534", to: "#22C55E", icon: "🏭" },
  generic: { from: "#1F2937", to: "#4B5563", icon: "✉" },
};

export interface ApolloEmailPreviewProps {
  templateId: string;
  subject?: string;
  bodyHtml?: string;
  sampleDataEnabled: boolean;
  selectedChannel: PreviewChannel;
  className?: string;
}

export function ApolloEmailPreview({
  templateId,
  subject,
  bodyHtml,
  sampleDataEnabled,
  selectedChannel,
  className,
}: ApolloEmailPreviewProps) {
  const tpl = useMemo(() => lookupApolloTemplate(templateId), [templateId]);

  if (!tpl) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        Enter an Apollo Template ID to auto-fetch the live email design.
      </div>
    );
  }

  const finalSubject = subject?.trim() ? subject : tpl.subject;
  const finalBody = bodyHtml?.trim() ? bodyHtml : tpl.bodyHtml;
  const banner = BANNER_STYLES[tpl.bannerTheme];
  const html = renderLiquid(finalBody, sampleDataEnabled);
  const subjectText = plainLiquid(finalSubject, sampleDataEnabled);

  if (selectedChannel === "whatsapp") {
    return (
      <div className={cn("rounded-2xl bg-[#ECE5DD] p-4", className)}>
        <div className="ml-auto max-w-md space-y-1 rounded-2xl rounded-tr-sm bg-[#DCF8C6] p-3 shadow-sm">
          <div className="text-[10px] font-semibold text-[#075E54]">PartnersBiz · Business</div>
          <p className="whitespace-pre-wrap text-[13px] leading-snug text-[#111]">
            {plainLiquid(tpl.whatsappMessage, sampleDataEnabled)}
          </p>
          <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781]">
            09:41 <span className="text-[#34B7F1]">✓✓</span>
          </div>
        </div>
      </div>
    );
  }

  if (selectedChannel === "dashboard") {
    return (
      <div className={cn("rounded-lg bg-muted/30 p-4", className)}>
        <div className="mx-auto max-w-md rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              PartnersBiz Portal Notification
            </span>
          </div>
          <div className="text-sm font-semibold">{subjectText}</div>
          <div
            className="apollo-body mt-1 line-clamp-3 text-[12px] text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
              View details
            </span>
            <span className="text-[10px] text-muted-foreground">Just now</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg bg-muted/30 p-4", className)}>
      <style>{`
        .apollo-body p { margin: 0 0 10px; }
        .apollo-body ul { margin: 0 0 10px; padding-left: 18px; list-style: disc; }
        .apollo-body li { margin-bottom: 4px; }
        .apollo-body .callout {
          margin: 12px 0; padding: 10px 12px; border-radius: 8px;
          background: #F1F5F9; border-left: 3px solid #2F7D32; font-size: 12.5px;
        }
        .apollo-token {
          border-radius: 4px; padding: 0 4px; font-family: ui-monospace, monospace;
          font-size: 11.5px; font-weight: 600; background: rgba(245,158,11,.18); color: #B45309;
        }
        .apollo-token--filled {
          font-family: inherit; font-size: inherit; background: rgba(47,125,50,.14); color: #1B5E20;
        }
      `}</style>
      <div className="mx-auto max-w-xl overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        {/* Mail client header */}
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <div className="text-[13px] font-semibold leading-tight text-foreground">
            {subjectText}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              P
            </span>
            <span className="font-medium text-foreground">PartnersBiz</span>
            <span>&lt;noreply@partnersbiz.com&gt;</span>
            <span>·</span>
            <span>to me</span>
          </div>
        </div>

        {/* Branded banner */}
        <div
          className="flex items-center gap-3 px-5 py-4 text-white"
          style={{ background: `linear-gradient(135deg, ${banner.from}, ${banner.to})` }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-lg">
            {banner.icon}
          </div>
          <div>
            <div className="text-[13px] font-bold uppercase tracking-wide">{tpl.bannerTitle}</div>
            <div className="text-[11px] opacity-90">{tpl.bannerSubtitle}</div>
          </div>
        </div>

        {/* Rich HTML body */}
        <div
          className="apollo-body px-5 py-4 text-[13px] leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="px-5 pb-4">
          <span className="inline-block rounded-md bg-primary px-3.5 py-2 text-[12px] font-semibold text-primary-foreground">
            Open in PartnersBiz
          </span>
        </div>

        {/* Footer graphic */}
        <div className="border-t border-border bg-[#0F1B14] px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-bold tracking-wide">PartnersBiz</div>
              <div className="text-[10px] opacity-70">Blinkit Vendor Partner Platform</div>
            </div>
            <svg viewBox="0 0 120 40" className="h-9 w-28 opacity-80" aria-hidden="true">
              <rect x="2" y="18" width="34" height="20" fill="#2F7D32" />
              <polygon points="2,18 19,8 36,18" fill="#43A047" />
              <rect x="40" y="24" width="26" height="14" fill="#2F7D32" opacity="0.7" />
              <polygon points="40,24 53,16 66,24" fill="#43A047" opacity="0.7" />
              <rect x="72" y="30" width="46" height="3" fill="#ffffff" opacity="0.35" />
              <circle cx="82" cy="36" r="3" fill="#ffffff" opacity="0.5" />
              <circle cx="108" cy="36" r="3" fill="#ffffff" opacity="0.5" />
              <rect x="76" y="20" width="38" height="10" fill="#ffffff" opacity="0.25" />
            </svg>
          </div>
          <div className="mt-2 text-[9px] leading-relaxed opacity-60">
            You are receiving this because you are a registered PartnersBiz vendor. Manage your
            notification preferences in the Preference Centre.
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Template ID · <span className="font-mono">{tpl.templateId}</span>
      </p>
    </div>
  );
}

/** Tab + sample-data control bar paired with <ApolloEmailPreview />. */
export function ApolloPreviewControls({
  channel,
  onChannelChange,
  sampleDataEnabled,
  onSampleDataChange,
}: {
  channel: PreviewChannel;
  onChannelChange: (c: PreviewChannel) => void;
  sampleDataEnabled: boolean;
  onSampleDataChange: (v: boolean) => void;
}) {
  const tabs: { key: PreviewChannel; label: string }[] = [
    { key: "email", label: "Email HTML Preview" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "dashboard", label: "Dashboard" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-2">
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChannelChange(t.key)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium",
              channel === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 pr-1 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={sampleDataEnabled}
          onChange={(e) => onSampleDataChange(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Toggle Sample Data
      </label>
    </div>
  );
}
