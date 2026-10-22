import { CrudTable } from "@/components/crud-table";
import { SettingsPanel, SubHeading, TabbedPage, YES_NO, cell, useOptions } from "@/components/settings-kit";
import { StatusDot } from "@/components/common";
import { isTrue } from "@/lib/utils";

export function Ipv6Settings() {
  const ifaces = useOptions("interface");
  const pools = useOptions("ipv6/pool");

  return (
    <TabbedPage
      title="IPv6"
      description="Prefix delegation from your ISP, LAN addressing and router advertisements."
      tabs={[
        {
          id: "internet",
          label: "Internet (DHCPv6)",
          content: (
            <>
              <CrudTable
                path="ipv6/dhcp-client"
                noun="DHCPv6 Client"
                columns={[
                  { key: "interface", header: "Interface", className: "font-medium" },
                  { key: "request", header: "Requests" },
                  { key: "pool-name", header: "Prefix pool" },
                  { key: "prefix", header: "Delegated prefix", className: "tabular-nums" },
                  {
                    key: "status",
                    header: "Status",
                    render: (r) => (
                      <span className="flex items-center gap-2">
                        <StatusDot status={r.status === "bound" ? "online" : "warning"} />
                        {r.status ?? "—"}
                      </span>
                    ),
                  },
                ]}
                defaults={{ request: "prefix", "pool-name": "isp-pd", "add-default-route": "yes", "use-peer-dns": "yes" }}
                fields={[
                  { name: "interface", label: "WAN interface", type: "select", options: ifaces, required: true },
                  { name: "request", label: "Request", type: "select", options: ["prefix", "address", "address,prefix"], required: true },
                  { name: "pool-name", label: "Prefix pool name", description: "LAN addresses are carved out of this pool." },
                  { name: "pool-prefix-length", label: "Pool prefix length", type: "number", placeholder: "64" },
                  { name: "add-default-route", label: "Add default route", type: "select", options: YES_NO },
                  { name: "use-peer-dns", label: "Use ISP DNS", type: "select", options: YES_NO },
                  { name: "comment", label: "Description" },
                ]}
              />
              <SettingsPanel
                path="ipv6/settings"
                title="IPv6 Settings"
                fields={[
                  { name: "disable-ipv6", label: "Enable IPv6", type: "switch", invert: true },
                  { name: "forward", label: "Forward IPv6 traffic", type: "switch" },
                  { name: "accept-router-advertisements", label: "Accept router advertisements", type: "select", options: ["yes", "no", "yes-if-forwarding-disabled"] },
                ]}
              />
            </>
          ),
        },
        {
          id: "addresses",
          label: "Addresses",
          content: (
            <CrudTable
              path="ipv6/address"
              noun="IPv6 Address"
              columns={[
                { key: "address", header: "Address", className: "font-medium tabular-nums" },
                { key: "interface", header: "Interface" },
                { key: "from-pool", header: "From pool", render: (r) => cell.muted(r["from-pool"]) },
                { key: "advertise", header: "Advertise", render: (r) => (isTrue(r.advertise) ? "Yes" : "No") },
              ]}
              defaults={{ address: "::1/64", advertise: "true" }}
              fields={[
                { name: "address", label: "Address", placeholder: "::1/64 when using a pool", required: true },
                { name: "from-pool", label: "Take prefix from pool", type: "select", options: pools },
                { name: "interface", label: "Interface", type: "select", options: ifaces, required: true },
                { name: "advertise", label: "Advertise to clients (SLAAC)", type: "switch" },
                { name: "eui-64", label: "Use EUI-64", type: "switch" },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
        {
          id: "nd",
          label: "Router Advertisements",
          content: (
            <CrudTable
              path="ipv6/nd"
              noun="ND Interface"
              columns={[
                { key: "interface", header: "Interface", className: "font-medium" },
                { key: "ra-interval", header: "RA interval" },
                { key: "managed-address-configuration", header: "DHCPv6 managed", render: (r) => (isTrue(r["managed-address-configuration"]) ? "Yes" : "No") },
                { key: "advertise-dns", header: "Advertise DNS", render: (r) => r["advertise-dns"] ?? "—" },
              ]}
              fields={[
                { name: "interface", label: "Interface", type: "select", options: ["all", ...ifaces], required: true },
                { name: "ra-interval", label: "RA interval", placeholder: "3m20s-10m" },
                { name: "advertise-dns", label: "Advertise DNS", type: "select", options: YES_NO },
                { name: "dns", label: "DNS servers", placeholder: "Router address by default" },
                { name: "managed-address-configuration", label: "Managed (DHCPv6) addresses", type: "switch" },
                { name: "other-configuration", label: "Other config via DHCPv6", type: "switch" },
              ]}
            />
          ),
        },
        {
          id: "firewall",
          label: "Firewall",
          content: (
            <>
              <CrudTable
                path="ipv6/firewall/filter"
                noun="IPv6 Rule"
                columns={[
                  { key: "comment", header: "Description", render: (r) => cell.strong(r.comment) },
                  { key: "chain", header: "Chain" },
                  { key: "action", header: "Action" },
                  { key: "protocol", header: "Protocol", render: (r) => cell.muted(r.protocol) },
                  { key: "src-address", header: "Source", render: (r) => cell.muted(r["src-address"] ?? r["src-address-list"]) },
                  { key: "dst-port", header: "Port", render: (r) => cell.muted(r["dst-port"]) },
                ]}
                defaults={{ chain: "forward", action: "drop" }}
                fields={[
                  { name: "chain", label: "Chain", type: "select", options: ["input", "forward", "output"], required: true },
                  { name: "action", label: "Action", type: "select", options: ["accept", "drop", "reject"], required: true },
                  { name: "protocol", label: "Protocol", type: "select", options: ["tcp", "udp", "icmpv6"] },
                  { name: "src-address", label: "Source" },
                  { name: "dst-address", label: "Destination" },
                  { name: "dst-port", label: "Destination port" },
                  { name: "in-interface-list", label: "Incoming interface list", type: "select", options: ["WAN", "LAN", "!LAN"] },
                  { name: "connection-state", label: "Connection state" },
                  { name: "comment", label: "Description" },
                ]}
              />
              <SubHeading title="Routes" />
              <CrudTable
                path="ipv6/route"
                noun="IPv6 Route"
                columns={[
                  { key: "dst-address", header: "Destination", className: "font-medium tabular-nums" },
                  { key: "gateway", header: "Gateway", className: "tabular-nums" },
                  { key: "distance", header: "Distance" },
                ]}
                fields={[
                  { name: "dst-address", label: "Destination", placeholder: "::/0", required: true },
                  { name: "gateway", label: "Gateway", required: true },
                  { name: "distance", label: "Distance", type: "number" },
                  { name: "comment", label: "Description" },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
