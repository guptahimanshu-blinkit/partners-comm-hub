import { useState } from "react";
import { Monitor, Tablet, Smartphone, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApolloEmailPreview } from "@/components/requests/ApolloEmailPreview";

type DeviceKey = "desktop" | "tablet" | "mobile";

const DEVICES: { key: DeviceKey; label: string; icon: typeof Monitor; width: number }[] = [
  { key: "desktop", label: "Desktop", icon: Monitor, width: 720 },
  { key: "tablet", label: "Tablet", icon: Tablet, width: 480 },
  { key: "mobile", label: "Mobile", icon: Smartphone, width: 320 },
];

export interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateId: string;
  subject?: string;
  bodyHtml?: string;
  apolloUrl?: string;
}

function DeviceFrame({ device, children }: { device: DeviceKey; children: React.ReactNode }) {
  const cfg = DEVICES.find((d) => d.key === device)!;

  if (device === "desktop") {
    return (
      <div className="flex flex-col items-center">
        <div
          className="w-full rounded-t-xl border-[10px] border-b-0 border-[#1B1F23] bg-background"
          style={{ maxWidth: cfg.width }}
        >
          <div className="flex items-center gap-1.5 bg-[#1B1F23] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
            <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
            <span className="h-2 w-2 rounded-full bg-[#28C840]" />
          </div>
          <div className="max-h-[62vh] overflow-y-auto bg-background">{children}</div>
        </div>
        <div
          className="h-3 w-full rounded-b-lg bg-[#1B1F23]"
          style={{ maxWidth: cfg.width + 60 }}
        />
      </div>
    );
  }

  const radius = device === "mobile" ? "rounded-[2rem]" : "rounded-[1.5rem]";
  return (
    <div
      className={cn("border-[10px] border-[#1B1F23] bg-background shadow-xl", radius)}
      style={{ width: cfg.width, maxWidth: "100%" }}
    >
      <div className="flex justify-center py-1.5">
        <span className="h-1.5 w-14 rounded-full bg-[#1B1F23]/30" />
      </div>
      <div className="max-h-[58vh] overflow-y-auto">{children}</div>
      <div className="flex justify-center py-2">
        <span className="h-1 w-16 rounded-full bg-[#1B1F23]/30" />
      </div>
    </div>
  );
}

export function TemplatePreviewModal({
  open,
  onOpenChange,
  templateId,
  subject,
  bodyHtml,
  apolloUrl,
}: TemplatePreviewModalProps) {
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [sampleData, setSampleData] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1120px,95vw)] gap-0 overflow-hidden p-0 [&>button]:hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Template Preview</div>
            <div className="truncate text-[11px] text-muted-foreground">
              Apollo Template ID · <span className="font-mono">{templateId || "—"}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sampleData}
                onChange={(e) => setSampleData(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Toggle Sample Data
            </label>
            {apolloUrl && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => window.open(apolloUrl, "_blank", "noopener,noreferrer")}
              >
                Open in Apollo <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-[60vh]">
          {/* Left device switcher */}
          <aside className="w-[92px] shrink-0 border-r border-border bg-muted/30 p-2 sm:w-[140px]">
            <div className="mb-2 hidden px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
              Devices
            </div>
            <div className="space-y-1">
              {DEVICES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDevice(d.key)}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] font-medium sm:flex-row sm:gap-2",
                    device === d.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <d.icon className="h-4 w-4 shrink-0" />
                  {d.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Canvas */}
          <div className="flex flex-1 justify-center overflow-auto bg-[#F3F4F6] p-4 dark:bg-muted/20">
            <div className="w-full max-w-full">
              <DeviceFrame device={device}>
                <ApolloEmailPreview
                  templateId={templateId}
                  subject={subject}
                  bodyHtml={bodyHtml}
                  sampleDataEnabled={sampleData}
                  selectedChannel="email"
                  className="bg-transparent p-2"
                />
              </DeviceFrame>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
