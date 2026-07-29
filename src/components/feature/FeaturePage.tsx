import { AlertOctagon, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useFeatureComms,
  markCommRead,
  markCommsReadByTab,
  type SidebarTab,
  type FeatureComm,
} from "@/lib/feature-comms";

const PRIORITY_CLASS: Record<FeatureComm["priority"], string> = {
  P1: "bg-cat-red-soft text-cat-red",
  P2: "bg-cat-amber-soft text-cat-amber",
  P3: "bg-cat-grey-soft text-cat-grey",
};

interface Props {
  tab: SidebarTab;
  title: string;
  description: string;
}

export function FeaturePage({ tab, title, description }: Props) {
  const comms = useFeatureComms();
  const items = comms.filter((c) => c.sidebarTab === tab);
  const unread = items.filter((c) => !c.isRead);
  const actionable = unread.filter((c) => c.actionRequired);
  const banner = actionable[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {unread.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markCommsReadByTab(tab)}
          >
            Mark all read ({unread.length})
          </Button>
        )}
      </div>

      {banner && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-cat-red/40 bg-cat-red-soft/60 px-4 py-3">
          <AlertOctagon className="h-5 w-5 shrink-0 text-cat-red" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cat-red">
              🛑 {actionable.length} Action Required
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {banner.title}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {banner.description}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => markCommRead(banner.id)}
            className="shrink-0"
          >
            {banner.actionCta} →
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b px-4 py-3 text-sm font-semibold text-foreground">
          {tab} — {items.length} communications
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No communications for this tab yet.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex flex-wrap items-start gap-3 px-4 py-3",
                  !c.isRead && "bg-primary/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge className={cn("h-5 rounded-md px-1.5 text-[10px]", PRIORITY_CLASS[c.priority])}>
                      {c.priority}
                    </Badge>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {c.subCategory}
                    </span>
                    {c.actionRequired && (
                      <Badge className="h-5 rounded-md bg-cat-red-soft px-1.5 text-[10px] text-cat-red">
                        Action
                      </Badge>
                    )}
                    {c.isRead && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" /> Read
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    {c.description}
                  </p>
                </div>
                {c.actionRequired && !c.isRead && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => markCommRead(c.id)}
                  >
                    {c.actionCta}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
