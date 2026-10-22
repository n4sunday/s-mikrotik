import { useEffect, useState } from "react";
import { GlobeIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, SettingRow, Spinner, StatusDot } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import { useRosCommand, useRosItem, useRosList } from "@/hooks/use-ros";
import { useWan } from "@/lib/network";
import { isTrue } from "@/lib/utils";

const YES_NO = ["yes", "no"];

export function InternetSettings() {
  const wan = useWan();
  const interfaces = useRosList("interface");
  const ifaceOptions = (interfaces.data ?? []).map((i) => i.name!).filter(Boolean);

  return (
    <>
      <PageHeader title="Internet" description="WAN connection and DNS resolver." />

      <Panel className="mb-6">
        <div className="flex items-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GlobeIcon className="size-5" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium">
              <StatusDot status={wan.up ? "online" : "offline"} />
              Primary WAN · {wan.interface}
            </div>
            <div className="text-muted-foreground">
              {wan.kind} · {wan.address ?? "No address"}
              {wan.gateway && ` · Gateway ${wan.gateway}`}
              {wan.expires && ` · Lease renews in ${wan.expires}`}
            </div>
          </div>
        </div>
      </Panel>

      <h2 className="mb-2 font-medium">DHCP Client</h2>
      <CrudTable
        path="ip/dhcp-client"
        noun="DHCP Client"
        invalidate={["ip/address", "ip/route"]}
        refetchInterval={15_000}
        columns={[
          { key: "interface", header: "Interface", render: (r) => <span className="font-medium">{r.interface}</span> },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <span className="flex items-center gap-2">
                <StatusDot status={r.status === "bound" ? "online" : isTrue(r.disabled) ? "disabled" : "warning"} />
                {r.status ?? "—"}
              </span>
            ),
          },
          { key: "address", header: "Address", className: "tabular-nums" },
          { key: "gateway", header: "Gateway", className: "tabular-nums" },
          { key: "primary-dns", header: "DNS", className: "tabular-nums" },
        ]}
        defaults={{ "add-default-route": "yes", "use-peer-dns": "yes" }}
        fields={[
          { name: "interface", label: "Interface", type: "select", options: ifaceOptions, required: true },
          { name: "add-default-route", label: "Add default route", type: "select", options: YES_NO, required: true },
          { name: "use-peer-dns", label: "Use ISP DNS servers", type: "select", options: YES_NO, required: true },
          { name: "comment", label: "Description" },
        ]}
      />

      <h2 className="mt-8 mb-2 font-medium">PPPoE</h2>
      <CrudTable
        path="interface/pppoe-client"
        noun="PPPoE Connection"
        invalidate={["interface"]}
        refetchInterval={15_000}
        columns={[
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "interface", header: "Interface" },
          { key: "user", header: "Username" },
          {
            key: "running",
            header: "Status",
            render: (r) => (
              <span className="flex items-center gap-2">
                <StatusDot status={isTrue(r.running) ? "online" : isTrue(r.disabled) ? "disabled" : "offline"} />
                {isTrue(r.running) ? "Connected" : "Disconnected"}
              </span>
            ),
          },
        ]}
        defaults={{ name: "pppoe-out1", "add-default-route": "yes", "use-peer-dns": "yes" }}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "interface", label: "Interface", type: "select", options: ifaceOptions, required: true },
          { name: "user", label: "Username", required: true },
          { name: "password", label: "Password", type: "password" },
          { name: "add-default-route", label: "Add default route", type: "select", options: YES_NO, required: true },
          { name: "use-peer-dns", label: "Use ISP DNS servers", type: "select", options: YES_NO, required: true },
          { name: "comment", label: "Description" },
        ]}
      />

      <DnsPanel />
    </>
  );
}

function DnsPanel() {
  const dns = useRosItem("ip/dns");
  const set = useRosCommand("ip/dns/set", ["ip/dns"]);
  const [servers, setServers] = useState("");
  const [remote, setRemote] = useState(false);

  useEffect(() => {
    if (!dns.data) return;
    setServers(dns.data.servers ?? "");
    setRemote(isTrue(dns.data["allow-remote-requests"]));
  }, [dns.data]);

  const dirty = dns.data && (servers !== (dns.data.servers ?? "") || remote !== isTrue(dns.data["allow-remote-requests"]));

  return (
    <Panel
      title="DNS"
      className="mt-8"
      actions={
        <Button
          size="sm"
          disabled={!dirty || set.isPending}
          onClick={() =>
            set.mutate(
              { servers, "allow-remote-requests": remote ? "yes" : "no" },
              { onSuccess: () => toast.success("DNS settings applied") },
            )
          }
        >
          {set.isPending && <Spinner className="text-primary-foreground" />} Apply Changes
        </Button>
      }
      bodyClassName="py-1 divide-y"
    >
      <SettingRow label="DNS servers" description="Comma separated. Leave empty to only use ISP-provided servers.">
        <Input className="w-72 tabular-nums" value={servers} onChange={(e) => setServers(e.target.value)} placeholder="1.1.1.1,8.8.8.8" />
      </SettingRow>
      <SettingRow label="ISP-provided servers">
        <span className="text-muted-foreground tabular-nums">{dns.data?.["dynamic-servers"] || "—"}</span>
      </SettingRow>
      <SettingRow label="Act as DNS server for LAN" description="Allow clients to use the router as their resolver.">
        <Switch checked={remote} onCheckedChange={setRemote} />
      </SettingRow>
      <SettingRow label="Cache">
        <span className="text-muted-foreground tabular-nums">
          {dns.data?.["cache-used"] ?? "—"} of {dns.data?.["cache-size"] ?? "—"}
        </span>
      </SettingRow>
    </Panel>
  );
}
