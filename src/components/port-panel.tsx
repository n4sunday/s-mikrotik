import { WifiIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RosRecord } from "@/lib/api";
import type { Rate } from "@/hooks/use-traffic";
import { cn, formatBps, isTrue } from "@/lib/utils";

const PHYSICAL = /^(ether|sfp|combo|qsfp)/;

/** Front-panel style view of the router's physical ports and radios. */
export function PortPanel({
  interfaces,
  rates,
  wan,
  onSelect,
  selected,
}: {
  interfaces: RosRecord[];
  rates: Record<string, Rate>;
  wan?: string;
  onSelect?: (iface: RosRecord) => void;
  selected?: string;
}) {
  const ports = interfaces.filter((i) => i.type === "ether" && PHYSICAL.test(i["default-name"] ?? i.name ?? ""));
  const radios = interfaces.filter((i) => i.type === "wifi" || i.type === "wlan");

  return (
    <div className="flex flex-wrap items-end gap-6">
      <div className="flex gap-1.5 rounded-xl border bg-muted/40 p-2">
        {ports.map((p, idx) => {
          const up = isTrue(p.running) && !isTrue(p.disabled);
          const r = rates[p.name!];
          const isWan = p.name === wan;
          return (
            <Tooltip key={p[".id"]}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect?.(p)}
                  className={cn(
                    "group flex w-12 flex-col items-center gap-1 rounded-md p-1 transition-colors hover:bg-foreground/5",
                    selected === p.name && "bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-9 w-10 items-end justify-center rounded-[5px] border-2 pb-1",
                      up ? (isWan ? "border-primary bg-primary/10" : "border-success bg-success/10") : "border-border bg-background",
                      isTrue(p.disabled) && "border-dashed",
                    )}
                  >
                    {/* RJ45 notch */}
                    <span className={cn("h-2 w-4 rounded-t-[2px]", up ? (isWan ? "bg-primary/40" : "bg-success/40") : "bg-muted")} />
                    {up && r && r.rx + r.tx > 1_000_000 && (
                      <span className="absolute top-0.5 right-0.5 size-1.5 animate-pulse rounded-full bg-warning" />
                    )}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                    {isWan ? "WAN" : idx + 1}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="font-medium">
                  {p.name}
                  {p.comment ? ` · ${p.comment}` : ""}
                </div>
                <div className="opacity-80">
                  {isTrue(p.disabled) ? "Disabled" : up ? `${p["link-speed"] ?? "Up"} · ↓ ${formatBps(r?.rx ?? 0)} ↑ ${formatBps(r?.tx ?? 0)}` : "No link"}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {radios.length > 0 && (
        <div className="flex gap-1.5 rounded-xl border bg-muted/40 p-2">
          {radios.map((w) => {
            const up = isTrue(w.running) && !isTrue(w.disabled);
            return (
              <button
                key={w[".id"]}
                onClick={() => onSelect?.(w)}
                className={cn(
                  "flex w-16 flex-col items-center gap-1 rounded-md p-1 transition-colors hover:bg-foreground/5",
                  selected === w.name && "bg-accent",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-10 items-center justify-center rounded-full border-2",
                    up ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground",
                  )}
                >
                  <WifiIcon className="size-4" />
                </span>
                <span className="truncate text-[11px] font-medium text-muted-foreground">{w.comment || w.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
