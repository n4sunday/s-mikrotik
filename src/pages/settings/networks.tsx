import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NetworkIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton, EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { ResourceSheet, type FieldDef } from "@/components/resource-form";
import { CrudTable } from "@/components/crud-table";
import { useRosList } from "@/hooks/use-ros";
import { ros, type RosRecord } from "@/lib/api";
import { useWan } from "@/lib/network";
import { errorMessage, isTrue, parseCidr, slugify } from "@/lib/utils";

interface Network {
  name: string;
  address: RosRecord;
  interface: string;
  vlan?: RosRecord;
  server?: RosRecord;
  pool?: RosRecord;
  dhcpNetwork?: RosRecord;
  clients: number;
}

const MENUS = ["ip/address", "interface/vlan", "ip/dhcp-server", "ip/pool", "ip/dhcp-server/network", "ip/dhcp-server/lease", "interface"];

export function NetworkSettings() {
  const qc = useQueryClient();
  const wan = useWan();
  const addresses = useRosList("ip/address");
  const vlans = useRosList("interface/vlan");
  const servers = useRosList("ip/dhcp-server");
  const pools = useRosList("ip/pool");
  const dhcpNetworks = useRosList("ip/dhcp-server/network");
  const leases = useRosList("ip/dhcp-server/lease");
  const interfaces = useRosList("interface");
  const [editing, setEditing] = useState<Network | null>(null);
  const [creating, setCreating] = useState(false);

  const networks = useMemo<Network[]>(() => {
    return (addresses.data ?? [])
      .filter((a) => !isTrue(a.dynamic) && a.interface !== wan.interface)
      .map((a) => {
        const server = servers.data?.find((s) => s.interface === a.interface);
        const cidr = parseCidr(a.address ?? "");
        return {
          name: a.comment || a.interface!,
          address: a,
          interface: a.interface!,
          vlan: vlans.data?.find((v) => v.name === a.interface),
          server,
          pool: pools.data?.find((p) => p.name === server?.["address-pool"]),
          dhcpNetwork: dhcpNetworks.data?.find((n) => n.address === cidr?.network),
          clients: leases.data?.filter((l) => l.server === server?.name && l.status === "bound").length ?? 0,
        };
      });
  }, [addresses.data, vlans.data, servers.data, pools.data, dhcpNetworks.data, leases.data, wan.interface]);

  const refresh = () => MENUS.forEach((p) => qc.invalidateQueries({ queryKey: ["ros", p] }));

  const ifaceOptions = (interfaces.data ?? []).filter((i) => i.name !== wan.interface).map((i) => i.name!);
  const bridgeOptions = (interfaces.data ?? []).filter((i) => i.type === "bridge" || i.type === "ether").map((i) => i.name!);

  const editFields: FieldDef[] = [
    { name: "name", label: "Name", required: true },
    { name: "address", label: "Gateway IP / Subnet", placeholder: "192.168.10.1/24", required: true },
    { name: "dhcp", label: "DHCP Server", type: "switch", description: "Automatically assign IPs to clients." },
    { name: "ranges", label: "DHCP range", placeholder: "192.168.10.100-192.168.10.254", when: (v) => v.dhcp === "true" },
    { name: "lease-time", label: "Lease time", placeholder: "30m", when: (v) => v.dhcp === "true" },
    { name: "dns-server", label: "DNS server", placeholder: "Gateway IP", when: (v) => v.dhcp === "true" },
  ];

  const createFields: FieldDef[] = [
    { name: "name", label: "Name", placeholder: "Guest", required: true },
    { name: "vlan-id", label: "VLAN ID", type: "number", placeholder: "Leave empty for untagged", description: "Creates a tagged VLAN interface." },
    { name: "parent", label: "VLAN parent interface", type: "select", options: bridgeOptions, required: true, when: (v) => !!v["vlan-id"] },
    { name: "interface", label: "Interface", type: "select", options: ifaceOptions, required: true, when: (v) => !v["vlan-id"] },
    { name: "address", label: "Gateway IP / Subnet", placeholder: "192.168.30.1/24", required: true },
    { name: "dhcp", label: "DHCP Server", type: "switch" },
    { name: "ranges", label: "DHCP range", placeholder: "Auto", when: (v) => v.dhcp === "true" },
    { name: "lease-time", label: "Lease time", when: (v) => v.dhcp === "true" },
  ];

  async function saveEdit(body: Record<string, string>, v: Record<string, string>) {
    const n = editing!;
    try {
      if ("name" in body || "address" in body) {
        await ros.update("ip/address", n.address[".id"], { comment: v.name, address: v.address });
      }
      const cidr = parseCidr(v.address);
      if (n.server && "dhcp" in body) {
        await ros.update("ip/dhcp-server", n.server[".id"], { disabled: String(v.dhcp !== "true") });
      } else if (!n.server && v.dhcp === "true" && cidr) {
        await createDhcp(n.interface, v.name, cidr, v.ranges, v["lease-time"], v["dns-server"]);
      }
      if (n.pool && "ranges" in body) await ros.update("ip/pool", n.pool[".id"], { ranges: v.ranges });
      if (n.server && "lease-time" in body) await ros.update("ip/dhcp-server", n.server[".id"], { "lease-time": v["lease-time"] });
      if (n.dhcpNetwork && ("dns-server" in body || "address" in body) && cidr) {
        await ros.update("ip/dhcp-server/network", n.dhcpNetwork[".id"], {
          address: cidr.network,
          gateway: cidr.host,
          "dns-server": v["dns-server"] || cidr.host,
        });
      }
      toast.success("Network updated");
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    } finally {
      refresh();
    }
  }

  async function createDhcp(
    iface: string,
    name: string,
    cidr: NonNullable<ReturnType<typeof parseCidr>>,
    ranges?: string,
    leaseTime?: string,
    dns?: string,
  ) {
    const slug = slugify(name);
    await ros.create("ip/pool", { name: `pool-${slug}`, ranges: ranges || cidr.range });
    await ros.create("ip/dhcp-server", {
      name: `dhcp-${slug}`,
      interface: iface,
      "address-pool": `pool-${slug}`,
      "lease-time": leaseTime || "30m",
    });
    await ros.create("ip/dhcp-server/network", {
      address: cidr.network,
      gateway: cidr.host,
      "dns-server": dns || cidr.host,
      comment: name,
    });
  }

  async function create(_body: Record<string, string>, v: Record<string, string>) {
    const cidr = parseCidr(v.address);
    if (!cidr) {
      toast.error("Gateway IP / Subnet must look like 192.168.30.1/24");
      throw new Error("invalid");
    }
    try {
      let iface = v.interface;
      if (v["vlan-id"]) {
        iface = `vlan${v["vlan-id"]}-${slugify(v.name)}`;
        await ros.create("interface/vlan", { name: iface, "vlan-id": v["vlan-id"], interface: v.parent, comment: v.name });
      }
      await ros.create("ip/address", { address: v.address, interface: iface, comment: v.name });
      if (v.dhcp === "true") await createDhcp(iface, v.name, cidr, v.ranges, v["lease-time"]);
      toast.success(`Network ${v.name} created`);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    } finally {
      refresh();
    }
  }

  async function remove(n: Network) {
    try {
      if (n.dhcpNetwork) await ros.remove("ip/dhcp-server/network", n.dhcpNetwork[".id"]);
      if (n.server) await ros.remove("ip/dhcp-server", n.server[".id"]);
      if (n.pool) await ros.remove("ip/pool", n.pool[".id"]);
      await ros.remove("ip/address", n.address[".id"]);
      if (n.vlan) await ros.remove("interface/vlan", n.vlan[".id"]);
      toast.success(`Network ${n.name} removed`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      refresh();
    }
  }

  if (addresses.isLoading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        title="Networks"
        description="Local subnets with their gateway, VLAN and DHCP configuration."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon /> Create New Network
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        {networks.length === 0 ? (
          <EmptyState icon={<NetworkIcon />} title="No local networks" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>VLAN ID</TableHead>
                <TableHead>Gateway / Subnet</TableHead>
                <TableHead>DHCP</TableHead>
                <TableHead>DHCP Range</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {networks.map((n) => (
                <TableRow key={n.address[".id"]} className="group h-12 cursor-pointer" onClick={() => setEditing(n)}>
                  <TableCell className="pl-4">
                    <div className="font-medium">{n.name}</div>
                    <div className="text-xs text-muted-foreground">{n.interface}</div>
                  </TableCell>
                  <TableCell>{n.vlan?.["vlan-id"] ?? <span className="text-muted-foreground">Untagged</span>}</TableCell>
                  <TableCell className="tabular-nums">{n.address.address}</TableCell>
                  <TableCell>
                    {n.server ? (
                      isTrue(n.server.disabled) ? (
                        <Badge variant="secondary">Off</Badge>
                      ) : (
                        <Badge className="bg-success/15 text-success">Server</Badge>
                      )
                    ) : (
                      <Badge variant="secondary">None</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{n.pool?.ranges ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{n.clients}</TableCell>
                  <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <ConfirmButton
                        title={`Delete ${n.name}?`}
                        description="Removes the gateway address, DHCP server, pool and VLAN interface for this network."
                        onConfirm={() => remove(n)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <h2 className="mt-8 mb-2 font-medium">All IP Addresses</h2>
      <CrudTable
        path="ip/address"
        noun="IP Address"
        invalidate={["ip/route"]}
        columns={[
          { key: "address", header: "Address", className: "font-medium tabular-nums" },
          { key: "network", header: "Network", className: "tabular-nums" },
          { key: "interface", header: "Interface" },
          { key: "comment", header: "Description", render: (r) => <span className="text-muted-foreground">{r.comment}</span> },
        ]}
        fields={[
          { name: "address", label: "Address", placeholder: "192.168.50.1/24", required: true },
          { name: "interface", label: "Interface", type: "select", options: (interfaces.data ?? []).map((i) => i.name!), required: true },
          { name: "comment", label: "Description" },
        ]}
      />

      <ResourceSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Edit ${editing?.name ?? "network"}`}
        description={editing ? `${editing.interface}${editing.vlan ? ` · VLAN ${editing.vlan["vlan-id"]}` : ""}` : undefined}
        fields={editFields}
        record={
          editing
            ? {
                name: editing.name,
                address: editing.address.address,
                dhcp: String(!!editing.server && !isTrue(editing.server.disabled)),
                ranges: editing.pool?.ranges,
                "lease-time": editing.server?.["lease-time"],
                "dns-server": editing.dhcpNetwork?.["dns-server"],
              }
            : undefined
        }
        onSubmit={saveEdit}
      />
      <ResourceSheet
        open={creating}
        onOpenChange={setCreating}
        title="Create New Network"
        description="Creates the interface address, and optionally a VLAN and DHCP server."
        fields={createFields}
        defaults={{ dhcp: "true", "lease-time": "30m", interface: "bridge" }}
        onSubmit={create}
      />
    </>
  );
}
