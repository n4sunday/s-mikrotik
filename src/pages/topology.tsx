import { useMemo, useState, type ReactNode } from "react";
import { CableIcon, GlobeIcon, RouterIcon, WifiIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LoadingBlock, Meter, PageHeader, StatusDot } from "@/components/common";
import { DeviceIcon } from "@/components/device-icon";
import { TrafficChart } from "@/components/traffic-chart";
import { useRosItem } from "@/hooks/use-ros";
import { useTraffic } from "@/hooks/use-traffic";
import { useClients, useWan, type Client } from "@/lib/network";
import type { RosRecord } from "@/lib/api";
import { ClientSheet, SignalBars } from "./clients";
import { cn, formatBps, formatBytes, formatUptime, isTrue } from "@/lib/utils";

type Selection = { type: "internet" } | { type: "gateway" } | { type: "port"; name: string } | { type: "client"; mac: string };

function Node({
  icon,
  title,
  subtitle,
  status = "online",
  selected,
  onClick,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: "online" | "offline" | "disabled";
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-56 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left shadow-sm transition-all outline-none",
        "hover:-translate-y-px hover:border-primary/50 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-primary ring-3 ring-primary/20",
        className,
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-medium">
          <StatusDot status={status} />
          <span className="truncate">{title}</span>
        </div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </button>
  );
}

function NodeIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4.5">
      {children}
    </span>
  );
}

function Wire({ className }: { className?: string }) {
  return <div className={cn("mx-auto h-8 w-px bg-border", className)} />;
}

export function TopologyPage() {
  const resource = useRosItem("system/resource");
  const identity = useRosItem("system/identity");
  const wan = useWan();
  const { clients, isLoading } = useClients();
  const { interfaces, latest } = useTraffic();
  const [selected, setSelected] = useState<Selection | null>(null);

  // Group online clients under the port / radio they hang off.
  const branches = useMemo(() => {
    const byPort = new Map<string, Client[]>();
    for (const c of clients.filter((c) => c.online)) {
      const port = c.port ?? "unknown";
      byPort.set(port, [...(byPort.get(port) ?? []), c]);
    }
    return [...byPort.entries()]
      .map(([port, list]) => ({ port, iface: interfaces?.find((i) => i.name === port), clients: list }))
      .sort((a, b) => a.port.localeCompare(b.port, undefined, { numeric: true }));
  }, [clients, interfaces]);

  if (isLoading) return <LoadingBlock />;

  const wanRate = latest[wan.interface];
  const is = (s: Selection) => JSON.stringify(s) === JSON.stringify(selected);
  const selectedClient = selected?.type === "client" ? clients.find((c) => c.mac === selected.mac) ?? null : null;

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <PageHeader title="Topology" description="How devices connect through your gateway. Click anything for details." />

      <div className="overflow-x-auto rounded-xl border bg-card/50 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px] p-8">
        <div className="flex min-w-fit flex-col items-center">
          <Node
            icon={<NodeIcon><GlobeIcon /></NodeIcon>}
            title="Internet"
            subtitle={wan.address ?? "—"}
            status={wan.up ? "online" : "offline"}
            selected={is({ type: "internet" })}
            onClick={() => setSelected({ type: "internet" })}
          />
          <div className="relative">
            <Wire className={wan.up ? "bg-primary" : undefined} />
            <span className="absolute top-1/2 left-3 -translate-y-1/2 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
              {wan.interface} · ↓ {formatBps(wanRate?.rx ?? 0)} ↑ {formatBps(wanRate?.tx ?? 0)}
            </span>
          </div>
          <Node
            icon={<NodeIcon><RouterIcon /></NodeIcon>}
            title={identity.data?.name ?? "Gateway"}
            subtitle={`${resource.data?.["board-name"] ?? ""} · ${resource.data?.version?.split(" ")[0] ?? ""}`}
            className="border-primary/40 ring-4 ring-primary/10"
            selected={is({ type: "gateway" })}
            onClick={() => setSelected({ type: "gateway" })}
          />
          <Wire />

          <div className="flex items-start">
            {branches.map((b, idx) => {
              const wireless = b.iface?.type === "wifi" || b.iface?.type === "wlan" || b.clients[0]?.wireless;
              return (
                <div key={b.port} className="relative flex flex-col items-center px-3">
                  <div
                    className={cn(
                      "absolute top-0 h-px bg-border",
                      idx === 0 ? "left-1/2 right-0" : idx === branches.length - 1 ? "right-1/2 left-0" : "inset-x-0",
                      branches.length === 1 && "hidden",
                    )}
                  />
                  <Wire className="h-6" />
                  <button
                    onClick={() => setSelected({ type: "port", name: b.port })}
                    className={cn(
                      "mb-3 flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/50",
                      is({ type: "port", name: b.port }) && "border-primary ring-3 ring-primary/20",
                    )}
                  >
                    {wireless ? <WifiIcon className="size-3.5 text-muted-foreground" /> : <CableIcon className="size-3.5 text-muted-foreground" />}
                    {b.port}
                    {b.iface?.comment && <span className="text-muted-foreground">· {b.iface.comment}</span>}
                    <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{b.clients.length}</span>
                  </button>
                  <div className="flex flex-col gap-2 border-l border-dashed pl-3">
                    {b.clients.map((c) => (
                      <Node
                        key={c.mac}
                        icon={<DeviceIcon identity={c.identity} wireless={c.wireless} />}
                        title={c.name}
                        status={c.blocked ? "offline" : "online"}
                        selected={is({ type: "client", mac: c.mac })}
                        onClick={() => setSelected({ type: "client", mac: c.mac })}
                        subtitle={
                          <span className="flex items-center gap-2">
                            {c.ip}
                            {c.wireless && <SignalBars dbm={c.signal} />}
                          </span>
                        }
                        className="w-52"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DetailSheet
        selection={selected?.type === "client" ? null : selected}
        onClose={() => setSelected(null)}
        onSelectClient={(mac) => setSelected({ type: "client", mac })}
        branches={branches}
      />
      <ClientSheet client={selectedClient} onClose={() => setSelected(null)} />
    </div>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[130px_1fr] gap-y-2">
      {rows
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate text-right tabular-nums">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function DetailSheet({
  selection,
  onClose,
  onSelectClient,
  branches,
}: {
  selection: Selection | null;
  onClose: () => void;
  onSelectClient: (mac: string) => void;
  branches: { port: string; iface?: RosRecord; clients: Client[] }[];
}) {
  const wan = useWan();
  const identity = useRosItem("system/identity");
  const resource = useRosItem("system/resource", { refetchInterval: 5000 });
  const board = useRosItem("system/routerboard");
  const { history, latest, interfaces } = useTraffic();

  let icon: ReactNode = null;
  let title = "";
  let subtitle: ReactNode = "";
  let body: ReactNode = null;

  if (selection?.type === "internet") {
    const r = latest[wan.interface];
    icon = <GlobeIcon />;
    title = "Internet";
    subtitle = (
      <span className="flex items-center gap-1.5">
        <StatusDot status={wan.up ? "online" : "offline"} /> {wan.up ? "Connected" : "Offline"} · {wan.kind}
      </span>
    );
    body = (
      <>
        <Section title="Throughput">
          <TrafficChart history={history} iface={wan.interface} height={140} />
        </Section>
        <Section title="Connection">
          <Rows
            rows={[
              ["WAN interface", wan.interface],
              ["Type", wan.kind],
              ["Public IP", wan.address],
              ["ISP gateway", wan.gateway],
              ["ISP DNS", wan.dns.join(", ")],
              ["Lease renews", wan.expires],
              ["Download", formatBps(r?.rx ?? 0)],
              ["Upload", formatBps(r?.tx ?? 0)],
            ]}
          />
        </Section>
      </>
    );
  } else if (selection?.type === "gateway") {
    const res = resource.data;
    const mem = res ? (1 - Number(res["free-memory"]) / Number(res["total-memory"])) * 100 : 0;
    const total = branches.reduce((n, b) => n + b.clients.length, 0);
    icon = <RouterIcon />;
    title = identity.data?.name ?? "Gateway";
    subtitle = `${res?.["board-name"] ?? ""} · RouterOS ${res?.version ?? ""}`;
    body = (
      <>
        <Section title="Health">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">CPU</span><span className="tabular-nums">{res?.["cpu-load"]}%</span></div>
              <Meter value={Number(res?.["cpu-load"] ?? 0)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Memory</span><span className="tabular-nums">{mem.toFixed(0)}%</span></div>
              <Meter value={mem} />
            </div>
          </div>
        </Section>
        <Section title="Device">
          <Rows
            rows={[
              ["Model", board.data?.model ?? res?.["board-name"]],
              ["Serial", board.data?.["serial-number"]],
              ["Firmware", board.data?.["current-firmware"]],
              ["Architecture", res?.["architecture-name"]],
              ["Uptime", formatUptime(res?.uptime)],
              ["Clients online", total],
              ["Ports up", `${interfaces?.filter((i) => isTrue(i.running)).length ?? 0} / ${interfaces?.length ?? 0}`],
            ]}
          />
        </Section>
      </>
    );
  } else if (selection?.type === "port") {
    const branch = branches.find((b) => b.port === selection.name);
    const iface = interfaces?.find((i) => i.name === selection.name) ?? branch?.iface;
    const r = latest[selection.name];
    const wireless = iface?.type === "wifi" || iface?.type === "wlan";
    icon = wireless ? <WifiIcon /> : <CableIcon />;
    title = selection.name;
    subtitle = (
      <span className="flex items-center gap-1.5">
        <StatusDot status={isTrue(iface?.disabled) ? "disabled" : isTrue(iface?.running) ? "online" : "offline"} />
        {iface?.comment || (wireless ? "Wireless radio" : "Ethernet port")}
      </span>
    );
    body = (
      <>
        <Section title="Throughput">
          <TrafficChart history={history} iface={selection.name} height={140} />
        </Section>
        <Section title={`Connected devices · ${branch?.clients.length ?? 0}`}>
          <div className="space-y-1">
            {branch?.clients.map((c) => (
              <button
                key={c.mac}
                onClick={() => onSelectClient(c.mac)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
              >
                <DeviceIcon identity={c.identity} wireless={c.wireless} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.ip}</div>
                </div>
                {c.wireless && <SignalBars dbm={c.signal} />}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Interface">
          <Rows
            rows={[
              ["Type", iface?.type],
              ["Link", iface?.["link-speed"]],
              ["MAC", <span className="font-mono text-xs">{iface?.["mac-address"]}</span>],
              ["MTU", iface?.mtu],
              ["Download now", formatBps(r?.rx ?? 0)],
              ["Upload now", formatBps(r?.tx ?? 0)],
              ["Total RX / TX", `${formatBytes(Number(iface?.["rx-byte"] ?? 0))} / ${formatBytes(Number(iface?.["tx-byte"] ?? 0))}`],
            ]}
          />
        </Section>
      </>
    );
  }

  return (
    <Sheet open={!!selection} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-6">{icon}</span>
            <div className="min-w-0">
              <SheetTitle className="truncate">{title}</SheetTitle>
              <SheetDescription asChild>
                <div>{subtitle}</div>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-4">{body}</div>
      </SheetContent>
    </Sheet>
  );
}
