import { useState } from "react";
import {
  AtSignIcon, BadgeCheckIcon, BellIcon, BoxIcon, BoxesIcon, CableIcon, ConciergeBellIcon, GaugeIcon, GlobeIcon,
  ListTreeIcon, NetworkIcon, RouteIcon, ServerCogIcon, ShieldCheckIcon, ShieldIcon, TicketIcon, TimerIcon, UsersIcon,
  WifiIcon, WrenchIcon, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InternetSettings } from "./internet";
import { WifiSettings } from "./wifi";
import { NetworkSettings } from "./networks";
import { SecuritySettings } from "./security";
import { RoutingSettings } from "./routing";
import { SystemSettings } from "./system";
import { VpnSettings } from "./vpn";
import { TrafficSettings } from "./traffic";
import { DhcpSettings } from "./dhcp";
import { UsersSettings } from "./users";
import { MaintenanceSettings } from "./maintenance";
import { DnsSettings } from "./dns";
import { Ipv6Settings } from "./ipv6";
import { BridgingSettings } from "./bridging";
import { HotspotSettings } from "./hotspot";
import { AutomationSettings } from "./automation";
import { ServicesSettings } from "./services";
import { LoggingSettings } from "./logging";
import { CertificateSettings } from "./certificates";
import { ContainerSettings } from "./containers";

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  component: () => React.JSX.Element | null;
}

const GROUPS: { label: string; sections: Section[] }[] = [
  {
    label: "Network",
    sections: [
      { id: "wifi", label: "WiFi", icon: WifiIcon, component: WifiSettings },
      { id: "networks", label: "Networks", icon: NetworkIcon, component: NetworkSettings },
      { id: "internet", label: "Internet", icon: GlobeIcon, component: InternetSettings },
      { id: "dhcp", label: "DHCP", icon: ListTreeIcon, component: DhcpSettings },
      { id: "dns", label: "DNS", icon: AtSignIcon, component: DnsSettings },
      { id: "ipv6", label: "IPv6", icon: GlobeIcon, component: Ipv6Settings },
      { id: "bridging", label: "Bridge & VLANs", icon: CableIcon, component: BridgingSettings },
    ],
  },
  {
    label: "Security",
    sections: [
      { id: "security", label: "Firewall & Security", icon: ShieldIcon, component: SecuritySettings },
      { id: "vpn", label: "VPN", icon: ShieldCheckIcon, component: VpnSettings },
      { id: "hotspot", label: "Hotspot", icon: TicketIcon, component: HotspotSettings },
      { id: "certificates", label: "Certificates", icon: BadgeCheckIcon, component: CertificateSettings },
    ],
  },
  {
    label: "Traffic",
    sections: [
      { id: "traffic", label: "Traffic Management", icon: GaugeIcon, component: TrafficSettings },
      { id: "routing", label: "Routing", icon: RouteIcon, component: RoutingSettings },
    ],
  },
  {
    label: "Services",
    sections: [
      { id: "services", label: "Services", icon: ConciergeBellIcon, component: ServicesSettings },
      { id: "automation", label: "Automation", icon: TimerIcon, component: AutomationSettings },
      { id: "logging", label: "Logging & Alerts", icon: BellIcon, component: LoggingSettings },
      { id: "containers", label: "Containers", icon: BoxIcon, component: ContainerSettings },
    ],
  },
  {
    label: "Administration",
    sections: [
      { id: "users", label: "Users & Access", icon: UsersIcon, component: UsersSettings },
      { id: "system", label: "System", icon: ServerCogIcon, component: SystemSettings },
      { id: "maintenance", label: "Maintenance", icon: WrenchIcon, component: MaintenanceSettings },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.sections);

export function SettingsPage({ onOpenAdvanced }: { onOpenAdvanced: () => void }) {
  const [section, setSection] = useState("wifi");
  const Active = (ALL.find((s) => s.id === section) ?? ALL[0]).component;

  return (
    <div className="flex h-full">
      <nav className="w-56 shrink-0 overflow-y-auto border-r bg-card p-3 whitespace-nowrap">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase">{g.label}</div>
            <div className="space-y-0.5">
              {g.sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    section === s.id && "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <s.icon className="size-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="border-t pt-3">
          <button
            onClick={onOpenAdvanced}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <BoxesIcon className="size-4" />
            All RouterOS Menus
          </button>
        </div>
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="max-w-5xl p-6">
          <Active key={section} />
        </div>
      </div>
    </div>
  );
}
