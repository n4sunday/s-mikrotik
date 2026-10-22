import type { ReactNode } from "react";
import {
  ActivityIcon,
  BoxesIcon,
  StethoscopeIcon,
  TerminalSquareIcon,
  ChevronDownIcon,
  EthernetPortIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MoonIcon,
  NetworkIcon,
  ScrollTextIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/common";
import { useRosItem } from "@/hooks/use-ros";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export type PageId = "dashboard" | "topology" | "ports" | "clients" | "logs" | "tools" | "terminal" | "advanced" | "settings";

const NAV: { id: PageId; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { id: "topology", label: "Topology", icon: NetworkIcon },
  { id: "ports", label: "Ports & Interfaces", icon: EthernetPortIcon },
  { id: "clients", label: "Client Devices", icon: LaptopIcon },
  { id: "logs", label: "System Log", icon: ScrollTextIcon },
  { id: "tools", label: "Tools", icon: StethoscopeIcon },
  { id: "terminal", label: "Terminal", icon: TerminalSquareIcon },
  { id: "advanced", label: "All RouterOS Menus", icon: BoxesIcon },
];

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [&_svg]:size-5",
            active && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          {active && <span className="absolute top-2 bottom-2 -left-2 w-0.5 rounded-full bg-primary" />}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({
  page,
  onNavigate,
  children,
}: {
  page: PageId;
  onNavigate: (p: PageId) => void;
  children: ReactNode;
}) {
  const { connection, disconnect } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const identity = useRosItem("system/identity");
  const resource = useRosItem("system/resource", { refetchInterval: 10_000 });

  return (
    <div className="flex h-full">
      {/* Icon rail */}
      <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3">
        <div className="mb-3 flex size-9 items-center justify-center">
          <Logo className="size-7" />
        </div>
        {NAV.map((n) => (
          <RailButton key={n.id} label={n.label} active={page === n.id} onClick={() => onNavigate(n.id)}>
            <n.icon />
          </RailButton>
        ))}
        <div className="flex-1" />
        <RailButton label="Settings" active={page === "settings"} onClick={() => onNavigate("settings")}>
          <SettingsIcon />
        </RailButton>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-4">
          <span className="font-semibold">Network</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-medium">{identity.data?.name ?? "…"}</span>
          {connection?.demo && (
            <Badge variant="outline" className="border-warning/40 text-warning">
              Demo
            </Badge>
          )}
          <div className="flex-1" />
          <div className="hidden items-center gap-2 text-muted-foreground md:flex">
            <ActivityIcon className="size-3.5" />
            <span>{resource.data?.["board-name"]}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>RouterOS {resource.data?.version?.split(" ")[0]}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted">
              <StatusDot status={resource.isError ? "offline" : "online"} />
              <span className="font-medium">{connection?.username}</span>
              <ChevronDownIcon className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="font-medium">{connection?.username}</div>
                <div className="text-xs text-muted-foreground">{connection?.demo ? "Simulated router" : connection?.host}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate("settings")}>
                <SettingsIcon /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => disconnect()}>
                <LogOutIcon /> Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
