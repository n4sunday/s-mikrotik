import {
  CableIcon, CctvIcon, CpuIcon, Gamepad2Icon, HardDriveIcon, LaptopIcon, LightbulbIcon, MonitorIcon, PlugIcon,
  PrinterIcon, RouterIcon, ServerIcon, SmartphoneIcon, SpeakerIcon, TabletIcon, TvIcon, WatchIcon, WifiIcon,
  type LucideIcon,
} from "lucide-react";
import type { DeviceIdentity, DeviceKind } from "@/lib/device-id";
import { KIND_LABEL } from "@/lib/device-id";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<DeviceKind, LucideIcon | null> = {
  phone: SmartphoneIcon, tablet: TabletIcon, laptop: LaptopIcon, desktop: MonitorIcon, watch: WatchIcon, tv: TvIcon,
  speaker: SpeakerIcon, console: Gamepad2Icon, nas: HardDriveIcon, printer: PrinterIcon, camera: CctvIcon,
  light: LightbulbIcon, plug: PlugIcon, iot: CpuIcon, network: RouterIcon, server: ServerIcon, unknown: null,
};

export function KindIcon({ kind, wireless, className }: { kind: DeviceKind; wireless?: boolean; className?: string }) {
  const Icon = KIND_ICON[kind] ?? (wireless ? WifiIcon : CableIcon);
  return <Icon className={className} />;
}

/** Brand name squeezed to fit a square tile (for brands without a usable mark). */
function NameMark({ name }: { name: string }) {
  const short = name.length <= 4;
  return (
    <svg viewBox="0 0 32 32" className="size-full" aria-label={name} role="img">
      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontWeight={650}
        fontSize={short ? 10 : 8}
        {...(short ? {} : { textLength: 26, lengthAdjust: "spacingAndGlyphs" })}
      >
        {name}
      </text>
    </svg>
  );
}

/** Brand logo (or name tile), with the device kind as a corner badge. */
export function DeviceIcon({
  identity,
  wireless,
  size = "md",
  className,
}: {
  identity: DeviceIdentity;
  wireless?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { brand, kind } = identity;
  const box = { sm: "size-7 rounded-md", md: "size-9 rounded-lg", lg: "size-12 rounded-xl" }[size];
  const logo = { sm: "size-3.5", md: "size-4.5", lg: "size-6" }[size];
  const title = [brand?.name, KIND_LABEL[kind]].filter(Boolean).join(" · ");

  return (
    <span className={cn("relative flex shrink-0 items-center justify-center bg-muted text-foreground/80", box, className)} title={title}>
      {brand?.icon && !brand.wordmark ? (
        <svg viewBox="0 0 24 24" className={logo} fill="currentColor" aria-label={brand.name} role="img">
          <path d={brand.icon.path} />
        </svg>
      ) : brand ? (
        <NameMark name={brand.name} />
      ) : (
        <KindIcon kind={kind} wireless={wireless} className={cn(logo, "text-muted-foreground")} />
      )}
      {brand && kind !== "unknown" && size !== "sm" && (
        <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground">
          <KindIcon kind={kind} className="size-2.5" />
        </span>
      )}
    </span>
  );
}
