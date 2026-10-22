import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatusDot } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import { useRosList } from "@/hooks/use-ros";
import { isTrue } from "@/lib/utils";

export function DhcpSettings() {
  const interfaces = useRosList("interface");
  const pools = useRosList("ip/pool");
  const servers = useRosList("ip/dhcp-server");
  const ifaces = (interfaces.data ?? []).map((i) => i.name!);

  return (
    <>
      <PageHeader title="DHCP" description="DHCP servers, leases, networks and address pools." />
      <Tabs defaultValue="leases">
        <TabsList className="mb-4">
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="pools">Pools</TabsTrigger>
        </TabsList>

        <TabsContent value="leases">
          <CrudTable
            path="ip/dhcp-server/lease"
            noun="Static Lease"
            refetchInterval={10_000}
            searchKeys={["address", "mac-address", "host-name", "comment"]}
            columns={[
              {
                key: "address",
                header: "IP Address",
                render: (r) => (
                  <span className="flex items-center gap-2 font-medium tabular-nums">
                    {r.address}
                    {!isTrue(r.dynamic) && <Badge variant="secondary" className="h-4 text-[10px]">Static</Badge>}
                  </span>
                ),
              },
              { key: "mac-address", header: "MAC Address", className: "font-mono text-xs" },
              { key: "host-name", header: "Hostname", render: (r) => r.comment || r["host-name"] || "—" },
              { key: "server", header: "Server" },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <span className="flex items-center gap-2">
                    <StatusDot status={r.status === "bound" ? "online" : "disabled"} />
                    {r.status ?? "—"}
                  </span>
                ),
              },
              { key: "expires-after", header: "Expires", className: "text-muted-foreground" },
            ]}
            fields={[
              { name: "address", label: "IP address", required: true },
              { name: "mac-address", label: "MAC address", required: true },
              { name: "server", label: "Server", type: "select", options: (servers.data ?? []).map((s) => s.name!), placeholder: "All" },
              { name: "comment", label: "Name / description" },
            ]}
          />
        </TabsContent>

        <TabsContent value="servers">
          <CrudTable
            path="ip/dhcp-server"
            noun="DHCP Server"
            columns={[
              { key: "name", header: "Name", className: "font-medium" },
              { key: "interface", header: "Interface" },
              { key: "address-pool", header: "Pool" },
              { key: "lease-time", header: "Lease Time" },
            ]}
            defaults={{ "lease-time": "30m" }}
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "interface", label: "Interface", type: "select", options: ifaces, required: true },
              { name: "address-pool", label: "Address pool", type: "select", options: (pools.data ?? []).map((p) => p.name!), placeholder: "static-only" },
              { name: "lease-time", label: "Lease time" },
              { name: "authoritative", label: "Authoritative", type: "select", options: ["yes", "no", "after-2sec-delay", "after-10sec-delay"] },
              { name: "add-arp", label: "Add ARP for leases", type: "select", options: ["yes", "no"] },
            ]}
          />
        </TabsContent>

        <TabsContent value="networks">
          <CrudTable
            path="ip/dhcp-server/network"
            noun="DHCP Network"
            columns={[
              { key: "address", header: "Network", className: "font-medium tabular-nums" },
              { key: "gateway", header: "Gateway", className: "tabular-nums" },
              { key: "dns-server", header: "DNS", className: "tabular-nums" },
              { key: "domain", header: "Domain" },
              { key: "comment", header: "Description", render: (r) => <span className="text-muted-foreground">{r.comment}</span> },
            ]}
            fields={[
              { name: "address", label: "Network", placeholder: "192.168.88.0/24", required: true },
              { name: "gateway", label: "Gateway" },
              { name: "dns-server", label: "DNS servers", placeholder: "Comma separated" },
              { name: "ntp-server", label: "NTP servers" },
              { name: "domain", label: "Domain" },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>

        <TabsContent value="pools">
          <CrudTable
            path="ip/pool"
            noun="Pool"
            columns={[
              { key: "name", header: "Name", className: "font-medium" },
              { key: "ranges", header: "Ranges", className: "tabular-nums" },
              { key: "next-pool", header: "Next Pool" },
            ]}
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "ranges", label: "Ranges", placeholder: "192.168.88.10-192.168.88.254", required: true },
              { name: "next-pool", label: "Next pool", type: "select", options: (pools.data ?? []).map((p) => p.name!) },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
