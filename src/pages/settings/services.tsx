import { toast } from "sonner";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrudTable } from "@/components/crud-table";
import { SettingsPanel, SubHeading, TabbedPage, cell, useOptions } from "@/components/settings-kit";
import { useRosCommand } from "@/hooks/use-ros";

export function ServicesSettings() {
  const ifaces = useOptions("interface");
  const lists = useOptions("interface/list");
  const forceUpdate = useRosCommand("ip/cloud/force-update", ["ip/cloud"]);

  return (
    <TabbedPage
      title="Services"
      description="Optional services the router can provide."
      tabs={[
        {
          id: "internet",
          label: "DDNS & UPnP",
          content: (
            <>
              <SettingsPanel
                path="ip/cloud"
                title="Dynamic DNS (MikroTik Cloud)"
                description="A free hostname that always points at your public IP. Handy for VPN endpoints."
                status={[
                  ["dns-name", "Hostname"],
                  ["public-address", "Public IP"],
                  ["status", "Status"],
                ]}
                actions={
                  <Button variant="outline" size="sm" onClick={() => forceUpdate.mutate({}, { onSuccess: () => toast.success("DDNS update requested") })}>
                    <RefreshCwIcon /> Update now
                  </Button>
                }
                fields={[
                  { name: "ddns-enabled", label: "Enable DDNS", type: "switch" },
                  { name: "ddns-update-interval", label: "Update interval", placeholder: "none" },
                  { name: "update-time", label: "Set clock from cloud", type: "switch" },
                  { name: "back-to-home-vpn", label: "Back to Home VPN", type: "select", options: ["enabled", "disabled", "revoked-and-disabled"] },
                ]}
              />
              <SettingsPanel
                path="ip/upnp"
                title="UPnP"
                description="Lets games and apps open ports automatically. Convenient, but any LAN device can open ports."
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "allow-disable-external-interface", label: "Allow apps to disable WAN", type: "switch" },
                  { name: "show-dummy-rule", label: "Show dummy rule", type: "switch" },
                ]}
              />
              <CrudTable
                path="ip/upnp/interfaces"
                noun="UPnP Interface"
                emptyText="Mark one interface as external (WAN) and your LAN as internal."
                columns={[
                  { key: "interface", header: "Interface", className: "font-medium" },
                  { key: "type", header: "Type", className: "capitalize" },
                  { key: "forced-ip", header: "Forced IP", render: (r) => cell.muted(r["forced-ip"]) },
                ]}
                fields={[
                  { name: "interface", label: "Interface", type: "select", options: ifaces, required: true },
                  { name: "type", label: "Type", type: "select", options: ["external", "internal"], required: true },
                  { name: "forced-ip", label: "Forced IP" },
                ]}
              />
            </>
          ),
        },
        {
          id: "monitoring",
          label: "Monitoring",
          content: (
            <>
              <SettingsPanel
                path="snmp"
                title="SNMP"
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "contact", label: "Contact" },
                  { name: "location", label: "Location" },
                  { name: "trap-version", label: "Trap version", type: "select", options: ["1", "2", "3"] },
                  { name: "trap-target", label: "Trap targets" },
                ]}
              />
              <SubHeading title="SNMP communities" />
              <CrudTable
                path="snmp/community"
                noun="Community"
                columns={[
                  { key: "name", header: "Name", className: "font-medium" },
                  { key: "addresses", header: "Allowed from", render: (r) => cell.muted(r.addresses) },
                  { key: "security", header: "Security" },
                  { key: "read-access", header: "Read", render: (r) => (r["read-access"] === "true" ? "Yes" : "No") },
                  { key: "write-access", header: "Write", render: (r) => (r["write-access"] === "true" ? "Yes" : "No") },
                ]}
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "addresses", label: "Allowed from", placeholder: "192.168.88.0/24" },
                  { name: "security", label: "Security", type: "select", options: ["none", "authorized", "private"] },
                  { name: "read-access", label: "Read access", type: "switch" },
                  { name: "write-access", label: "Write access", type: "switch" },
                  { name: "authentication-password", label: "Auth password (v3)", type: "password" },
                  { name: "encryption-password", label: "Encryption password (v3)", type: "password" },
                ]}
              />
              <SettingsPanel
                path="ip/traffic-flow"
                title="Traffic Flow (NetFlow / IPFIX)"
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "interfaces", label: "Interfaces", placeholder: "all" },
                  { name: "active-flow-timeout", label: "Active flow timeout" },
                  { name: "inactive-flow-timeout", label: "Inactive flow timeout" },
                ]}
              />
              <CrudTable
                path="ip/traffic-flow/target"
                noun="Collector"
                columns={[
                  { key: "dst-address", header: "Collector", className: "font-medium tabular-nums" },
                  { key: "port", header: "Port" },
                  { key: "version", header: "Version" },
                ]}
                defaults={{ port: "2055", version: "9" }}
                fields={[
                  { name: "dst-address", label: "Collector address", required: true },
                  { name: "port", label: "Port", type: "number" },
                  { name: "version", label: "Version", type: "select", options: ["1", "5", "9", "IPFIX"] },
                ]}
              />
              <SettingsPanel
                path="ip/neighbor/discovery-settings"
                title="Neighbor Discovery"
                description="Lets WinBox and other devices find this router (CDP, LLDP, MNDP)."
                fields={[
                  { name: "discover-interface-list", label: "Interfaces", type: "select", options: ["all", "none", ...lists] },
                  { name: "protocol", label: "Protocols", placeholder: "cdp,lldp,mndp" },
                  { name: "mode", label: "Mode", type: "select", options: ["tx-and-rx", "rx-only", "tx-only"] },
                ]}
              />
            </>
          ),
        },
        {
          id: "servers",
          label: "Servers",
          content: (
            <>
              <SettingsPanel
                path="system/ntp/server"
                title="NTP Server"
                description="Serve time to devices on your network."
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "broadcast", label: "Broadcast", type: "switch" },
                  { name: "multicast", label: "Multicast", type: "switch" },
                  { name: "manycast", label: "Manycast", type: "switch" },
                ]}
              />
              <SettingsPanel
                path="ip/proxy"
                title="Web Proxy"
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "port", label: "Port", type: "number" },
                  { name: "cache-on-disk", label: "Cache on disk", type: "switch" },
                  { name: "max-cache-size", label: "Max cache size" },
                ]}
              />
              <SettingsPanel
                path="ip/socks"
                title="SOCKS Proxy"
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "port", label: "Port", type: "number" },
                  { name: "version", label: "Version", type: "select", options: ["4", "5"] },
                ]}
              />
              <SettingsPanel
                path="tool/bandwidth-server"
                title="Bandwidth Test Server"
                description="Lets other MikroTik devices run speed tests against this router."
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "authenticate", label: "Require login", type: "switch" },
                  { name: "max-sessions", label: "Max sessions", type: "number" },
                ]}
              />
            </>
          ),
        },
        {
          id: "management",
          label: "Device Access",
          content: (
            <>
              <SettingsPanel
                path="tool/mac-server/mac-winbox"
                title="WinBox over MAC"
                description="Reach the router with WinBox even without an IP address."
                fields={[{ name: "allowed-interface-list", label: "Allowed interfaces", type: "select", options: ["all", "none", ...lists] }]}
              />
              <SettingsPanel
                path="tool/mac-server"
                title="MAC Telnet"
                fields={[{ name: "allowed-interface-list", label: "Allowed interfaces", type: "select", options: ["all", "none", ...lists] }]}
              />
              <SettingsPanel
                path="ip/ssh"
                title="SSH"
                fields={[
                  { name: "strong-crypto", label: "Strong crypto only", type: "switch" },
                  { name: "always-allow-password-login", label: "Allow password login with keys set", type: "switch" },
                  { name: "forwarding-enabled", label: "Port forwarding", type: "select", options: ["no", "local", "remote", "both"] },
                ]}
              />
              <SettingsPanel
                path="tool/romon"
                title="RoMON"
                description="MikroTik's management overlay network for reaching routers behind other routers."
                fields={[
                  { name: "enabled", label: "Enabled", type: "switch" },
                  { name: "secrets", label: "Secrets", type: "password" },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
