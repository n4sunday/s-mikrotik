import { useMemo } from "react";
import { ArrowDownIcon, ArrowUpIcon, CpuIcon, GlobeIcon, LaptopIcon, RouterIcon, WifiIcon } from "lucide-react";
import { Meter, PageHeader, Panel, Stat, StatusDot } from "@/components/common";
import { PortPanel } from "@/components/port-panel";
import { TrafficChart } from "@/components/traffic-chart";
import { useRosItem } from "@/hooks/use-ros";
import { useTraffic } from "@/hooks/use-traffic";
import { useClients, useWan } from "@/lib/network";
import { formatBps, formatBytes, formatUptime, isTrue } from "@/lib/utils";
import type { PageId } from "@/components/app-shell";

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const resource = useRosItem("system/resource", { refetchInterval: 5000 });
  const identity = useRosItem("system/identity");
  const wan = useWan();
  const { clients } = useClients();
  const { interfaces, history, latest } = useTraffic();

  const r = resource.data;
  const memUsed = r ? 1 - Number(r["free-memory"]) / Number(r["total-memory"]) : 0;
  const hddUsed = r ? 1 - Number(r["free-hdd-space"]) / Number(r["total-hdd-space"]) : 0;
  const online = clients.filter((c) => c.online);
  const wireless = online.filter((c) => c.wireless).length;
  const wanRate = latest[wan.interface];

  const busiest = useMemo(
    () =>
      Object.entries(latest)
        .filter(([name]) => name !== wan.interface && !name.startsWith("bridge"))
        .map(([name, rate]) => ({ name, ...rate, total: rate.rx + rate.tx }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    [latest, wan.interface],
  );
  const busiestMax = busiest[0]?.total || 1;

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <PageHeader title="Dashboard" description={`Overview of ${identity.data?.name ?? "your router"}`} />

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Panel>
          <Stat
            icon={<GlobeIcon className="size-3.5" />}
            label="Internet"
            value={
              <span className="flex items-center gap-2">
                <StatusDot status={wan.up ? "online" : "offline"} />
                {wan.up ? "Connected" : "Offline"}
              </span>
            }
            hint={`${wan.address ?? "No address"} · ${wan.kind} on ${wan.interface}`}
          />
        </Panel>
        <Panel>
          <Stat
            icon={<RouterIcon className="size-3.5" />}
            label="Gateway"
            value={r?.["board-name"] ?? "—"}
            hint={`RouterOS ${r?.version ?? ""} · up ${formatUptime(r?.uptime)}`}
          />
        </Panel>
        <Panel className="cursor-pointer transition-colors hover:border-primary/40" bodyClassName="p-4">
          <button className="w-full text-left" onClick={() => onNavigate("clients")}>
            <Stat
              icon={<LaptopIcon className="size-3.5" />}
              label="Clients"
              value={online.length}
              hint={`${online.length - wireless} wired · ${wireless} wireless`}
            />
          </button>
        </Panel>
        <Panel>
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground">WAN Throughput</div>
            <div className="flex items-center gap-4 text-xl font-semibold tabular-nums tracking-tight">
              <span className="flex items-center gap-1">
                <ArrowDownIcon className="size-4 text-chart-1" />
                {formatBps(wanRate?.rx ?? 0)}
              </span>
              <span className="flex items-center gap-1">
                <ArrowUpIcon className="size-4 text-chart-2" />
                {formatBps(wanRate?.tx ?? 0)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Live, sampled every 2s</div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title={`Internet Traffic · ${wan.interface}`} className="xl:col-span-2">
          <TrafficChart history={history} iface={wan.interface} height={240} />
        </Panel>

        <Panel title="Gateway Health">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CpuIcon className="size-3.5" /> CPU · {r?.["cpu-count"]} cores @ {r?.["cpu-frequency"]} MHz
                </span>
                <span className="font-medium tabular-nums">{r?.["cpu-load"] ?? 0}%</span>
              </div>
              <Meter value={Number(r?.["cpu-load"] ?? 0)} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-medium tabular-nums">
                  {formatBytes(Number(r?.["total-memory"] ?? 0) - Number(r?.["free-memory"] ?? 0))} / {formatBytes(Number(r?.["total-memory"] ?? 0))}
                </span>
              </div>
              <Meter value={memUsed * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium tabular-nums">
                  {formatBytes(Number(r?.["total-hdd-space"] ?? 0) - Number(r?.["free-hdd-space"] ?? 0))} / {formatBytes(Number(r?.["total-hdd-space"] ?? 0))}
                </span>
              </div>
              <Meter value={hddUsed * 100} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4">
              <dt className="text-muted-foreground">Architecture</dt>
              <dd className="text-right">{r?.["architecture-name"]}</dd>
              <dt className="text-muted-foreground">Uptime</dt>
              <dd className="text-right tabular-nums">{r?.uptime}</dd>
              <dt className="text-muted-foreground">WAN gateway</dt>
              <dd className="text-right tabular-nums">{wan.gateway ?? "—"}</dd>
            </dl>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Ports" className="xl:col-span-2" actions={<button className="text-primary hover:underline" onClick={() => onNavigate("ports")}>View all</button>}>
          {interfaces && <PortPanel interfaces={interfaces} rates={latest} wan={wan.interface} onSelect={() => onNavigate("ports")} />}
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border-2 border-primary" /> WAN</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border-2 border-success" /> Connected</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border-2 border-border" /> No link</span>
            <span className="ml-auto">
              {interfaces?.filter((i) => isTrue(i.running)).length ?? 0} of {interfaces?.length ?? 0} interfaces up
            </span>
          </div>
        </Panel>

        <Panel title="Most Active Interfaces">
          {busiest.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">Collecting samples…</div>
          ) : (
            <ul className="space-y-3">
              {busiest.map((b) => {
                const iface = interfaces?.find((i) => i.name === b.name);
                return (
                  <li key={b.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {iface?.type === "wifi" ? <WifiIcon className="size-3.5 text-muted-foreground" /> : null}
                        <span className="font-medium">{b.name}</span>
                        <span className="truncate text-muted-foreground">{iface?.comment}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{formatBps(b.total)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(b.total / busiestMax) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
