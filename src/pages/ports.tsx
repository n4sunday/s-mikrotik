import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingBlock, PageHeader, Panel, StatusDot } from "@/components/common";
import { PortPanel } from "@/components/port-panel";
import { ResourceSheet, type FieldDef } from "@/components/resource-form";
import { TrafficChart } from "@/components/traffic-chart";
import { useRosMutations } from "@/hooks/use-ros";
import { useTraffic } from "@/hooks/use-traffic";
import { useWan } from "@/lib/network";
import type { RosRecord } from "@/lib/api";
import { cn, formatBps, formatBytes, isTrue } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  ether: "Ethernet",
  wifi: "WiFi",
  wlan: "WiFi",
  bridge: "Bridge",
  vlan: "VLAN",
  wg: "WireGuard",
  "pppoe-out": "PPPoE",
  loopback: "Loopback",
};

const FIELDS: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "comment", label: "Description", placeholder: "e.g. Office switch" },
  { name: "mtu", label: "MTU", type: "number" },
  { name: "disabled", label: "Enabled", type: "switch", invert: true },
];

export function PortsPage() {
  const { interfaces, history, latest, isLoading } = useTraffic();
  const wan = useWan();
  const { update } = useRosMutations("interface");
  const [selected, setSelected] = useState<string>(wan.interface);
  const [editing, setEditing] = useState<RosRecord | null>(null);
  const current = interfaces?.find((i) => i.name === selected);

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <PageHeader title="Ports & Interfaces" description="Physical ports, radios and virtual interfaces with live throughput." />

      <div className="grid gap-4 xl:grid-cols-[auto_1fr]">
        <Panel title="Front Panel">
          {interfaces && <PortPanel interfaces={interfaces} rates={latest} wan={wan.interface} selected={selected} onSelect={(i) => setSelected(i.name!)} />}
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              {selected}
              {current?.comment && <span className="font-normal text-muted-foreground">· {current.comment}</span>}
            </span>
          }
        >
          <TrafficChart history={history} iface={selected} height={120} />
        </Panel>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 pl-4">Enabled</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead className="text-right">Download</TableHead>
                <TableHead className="text-right">Upload</TableHead>
                <TableHead className="pr-4 text-right">Total RX / TX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interfaces?.map((i) => {
                const disabled = isTrue(i.disabled);
                const up = isTrue(i.running) && !disabled;
                const r = latest[i.name!];
                return (
                  <TableRow
                    key={i[".id"]}
                    className={cn("h-11 cursor-pointer", selected === i.name && "bg-accent/60 hover:bg-accent/60", disabled && "text-muted-foreground")}
                    onClick={() => setSelected(i.name!)}
                    onDoubleClick={() => setEditing(i)}
                  >
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        size="sm"
                        checked={!disabled}
                        onCheckedChange={(c) => update.mutate({ id: i[".id"], body: { disabled: String(!c) } })}
                      />
                    </TableCell>
                    <TableCell>
                      <button className="text-left" onClick={(e) => { e.stopPropagation(); setEditing(i); }}>
                        <div className="font-medium hover:text-primary">{i.name}</div>
                        {i.comment && <div className="text-xs text-muted-foreground">{i.comment}</div>}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {TYPE_LABEL[i.type ?? ""] ?? i.type}
                        {i.name === wan.interface && <Badge className="h-4 text-[10px]">WAN</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <StatusDot status={disabled ? "disabled" : up ? "online" : "offline"} />
                        {disabled ? "Disabled" : up ? (i["link-speed"] ?? "Up") : "Down"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i["mac-address"] ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{up ? formatBps(r?.rx ?? 0) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{up ? formatBps(r?.tx ?? 0) : "—"}</TableCell>
                    <TableCell className="pr-4 text-right text-muted-foreground tabular-nums">
                      {formatBytes(Number(i["rx-byte"] ?? 0))} / {formatBytes(Number(i["tx-byte"] ?? 0))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ResourceSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Edit ${editing?.name ?? "interface"}`}
        description={TYPE_LABEL[editing?.type ?? ""]}
        fields={FIELDS}
        record={editing ?? undefined}
        onSubmit={(body) => (Object.keys(body).length ? update.mutateAsync({ id: editing![".id"], body }) : Promise.resolve())}
      />
    </div>
  );
}
