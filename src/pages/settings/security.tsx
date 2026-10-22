import { useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import type { FieldDef } from "@/components/resource-form";
import { useRosList } from "@/hooks/use-ros";
import { useWan } from "@/lib/network";
import type { RosRecord } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";

const PROTOCOLS = ["tcp", "udp", "icmp", "gre", "ipsec-esp"];
const CONN_STATES = ["established,related", "established,related,untracked", "new", "invalid"];

function ActionBadge({ action }: { action?: string }) {
  const tone =
    action === "drop" || action === "reject" || action === "tarpit"
      ? "bg-destructive/15 text-destructive"
      : action === "accept" || action === "fasttrack-connection"
        ? "bg-success/15 text-success"
        : "bg-primary/15 text-primary";
  return <Badge className={cn("capitalize", tone)}>{action?.replace("-connection", "")}</Badge>;
}

function Match({ r }: { r: RosRecord }) {
  const parts = [
    r.protocol && r.protocol.toUpperCase(),
    r["src-address"] && `from ${r["src-address"]}`,
    r["src-address-list"] && `from list ${r["src-address-list"]}`,
    r["dst-address"] && `to ${r["dst-address"]}`,
    r["dst-port"] && `port ${r["dst-port"]}`,
    r["in-interface"] && `in ${r["in-interface"]}`,
    r["in-interface-list"] && `in ${r["in-interface-list"]}`,
    r["out-interface-list"] && `out ${r["out-interface-list"]}`,
    r["connection-state"] && r["connection-state"],
  ].filter(Boolean);
  return <span className="text-muted-foreground">{parts.join(" · ") || "Any"}</span>;
}

const counters = { key: "bytes", header: "Traffic", className: "text-right tabular-nums text-muted-foreground", render: (r: RosRecord) => formatBytes(Number(r.bytes ?? 0)) };

export function SecuritySettings() {
  const wan = useWan();
  const interfaces = useRosList("interface");
  const ifaceOptions = (interfaces.data ?? []).map((i) => i.name!);
  const [chain, setChain] = useState("all");

  const filterFields: FieldDef[] = [
    { name: "chain", label: "Chain", type: "select", options: ["input", "forward", "output"], required: true },
    { name: "action", label: "Action", type: "select", options: ["accept", "drop", "reject", "log", "passthrough"], required: true },
    { name: "protocol", label: "Protocol", type: "select", options: PROTOCOLS, placeholder: "Any" },
    { name: "src-address", label: "Source address", placeholder: "Any" },
    { name: "dst-address", label: "Destination address", placeholder: "Any" },
    { name: "dst-port", label: "Destination port", placeholder: "e.g. 80,443", when: (v) => v.protocol === "tcp" || v.protocol === "udp" },
    { name: "in-interface", label: "Incoming interface", type: "select", options: ifaceOptions, placeholder: "Any" },
    { name: "connection-state", label: "Connection state", type: "select", options: CONN_STATES, placeholder: "Any" },
    { name: "comment", label: "Description" },
  ];

  return (
    <>
      <PageHeader title="Security" description="Port forwarding and firewall policy." />
      <Tabs defaultValue="forwarding">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="forwarding">Port Forwarding</TabsTrigger>
          <TabsTrigger value="filter">Firewall Rules</TabsTrigger>
          <TabsTrigger value="nat">NAT</TabsTrigger>
          <TabsTrigger value="lists">Address Lists</TabsTrigger>
          <TabsTrigger value="mangle">Mangle</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
          <TabsTrigger value="l7">Layer 7</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="alg">Helpers (ALG)</TabsTrigger>
        </TabsList>

        <TabsContent value="forwarding">
          <CrudTable
            path="ip/firewall/nat"
            noun="Port Forward"
            filter={(r) => r.chain === "dstnat" && r.action === "dst-nat"}
            createExtra={{ chain: "dstnat", action: "dst-nat" }}
            defaults={{ protocol: "tcp", "in-interface": wan.interface }}
            columns={[
              { key: "comment", header: "Name", render: (r) => <span className="font-medium">{r.comment || "Untitled"}</span> },
              { key: "protocol", header: "Protocol", render: (r) => (r.protocol ?? "any").toUpperCase() },
              {
                key: "dst-port",
                header: "Forward",
                render: (r) => (
                  <span className="flex items-center gap-2 tabular-nums">
                    WAN:{r["dst-port"] ?? "*"}
                    <ArrowRightIcon className="size-3.5 text-muted-foreground" />
                    {r["to-addresses"]}:{r["to-ports"] ?? r["dst-port"]}
                  </span>
                ),
              },
              { key: "in-interface", header: "Interface", render: (r) => r["in-interface"] ?? r["in-interface-list"] ?? "Any" },
              counters,
            ]}
            fields={[
              { name: "comment", label: "Name", required: true },
              { name: "protocol", label: "Protocol", type: "select", options: ["tcp", "udp"], required: true },
              { name: "dst-port", label: "WAN port", placeholder: "8080", required: true },
              { name: "to-addresses", label: "Forward IP", placeholder: "192.168.88.10", required: true },
              { name: "to-ports", label: "Forward port", placeholder: "Same as WAN port" },
              { name: "in-interface", label: "WAN interface", type: "select", options: ifaceOptions, placeholder: "Any" },
              { name: "src-address", label: "Allowed source", placeholder: "Any" },
            ]}
          />
        </TabsContent>

        <TabsContent value="filter">
          <CrudTable
            path="ip/firewall/filter"
            noun="Firewall Rule"
            filter={chain === "all" ? undefined : (r) => r.chain === chain}
            toolbar={
              <Tabs value={chain} onValueChange={setChain}>
                <TabsList className="h-8">
                  {["all", "input", "forward", "output"].map((c) => (
                    <TabsTrigger key={c} value={c} className="capitalize">
                      {c}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            }
            defaults={{ chain: chain === "all" ? "forward" : chain, action: "drop" }}
            columns={[
              { key: "comment", header: "Description", render: (r) => <span className="font-medium">{r.comment || "—"}</span> },
              { key: "chain", header: "Chain", className: "capitalize" },
              { key: "action", header: "Action", render: (r) => <ActionBadge action={r.action} /> },
              { key: "match", header: "Match", render: (r) => <Match r={r} /> },
              counters,
            ]}
            fields={filterFields}
            searchKeys={["comment", "src-address", "dst-address", "dst-port", "chain", "action"]}
          />
        </TabsContent>

        <TabsContent value="nat">
          <CrudTable
            path="ip/firewall/nat"
            noun="NAT Rule"
            defaults={{ chain: "srcnat", action: "masquerade" }}
            columns={[
              { key: "comment", header: "Description", render: (r) => <span className="font-medium">{r.comment || "—"}</span> },
              { key: "chain", header: "Chain" },
              { key: "action", header: "Action", render: (r) => <ActionBadge action={r.action} /> },
              { key: "match", header: "Match", render: (r) => <Match r={r} /> },
              { key: "to-addresses", header: "Translate to", render: (r) => [r["to-addresses"], r["to-ports"]].filter(Boolean).join(":") || "—" },
              counters,
            ]}
            fields={[
              { name: "chain", label: "Chain", type: "select", options: ["srcnat", "dstnat"], required: true },
              { name: "action", label: "Action", type: "select", options: ["masquerade", "src-nat", "dst-nat", "redirect", "netmap", "accept"], required: true },
              { name: "protocol", label: "Protocol", type: "select", options: PROTOCOLS, placeholder: "Any" },
              { name: "src-address", label: "Source address", placeholder: "Any" },
              { name: "dst-address", label: "Destination address", placeholder: "Any" },
              { name: "dst-port", label: "Destination port", when: (v) => v.protocol === "tcp" || v.protocol === "udp" },
              { name: "out-interface", label: "Outgoing interface", type: "select", options: ifaceOptions, placeholder: "Any" },
              { name: "to-addresses", label: "To addresses", when: (v) => ["src-nat", "dst-nat", "netmap"].includes(v.action) },
              { name: "to-ports", label: "To ports", when: (v) => ["src-nat", "dst-nat", "redirect", "masquerade"].includes(v.action) },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>

        <TabsContent value="lists">
          <CrudTable
            path="ip/firewall/address-list"
            noun="Address"
            columns={[
              { key: "list", header: "List", render: (r) => <Badge variant="secondary">{r.list}</Badge> },
              { key: "address", header: "Address", className: "font-medium tabular-nums" },
              { key: "timeout", header: "Timeout" },
              { key: "comment", header: "Description", render: (r) => <span className="text-muted-foreground">{r.comment}</span> },
            ]}
            fields={[
              { name: "list", label: "List name", required: true },
              { name: "address", label: "Address or subnet", required: true },
              { name: "timeout", label: "Timeout", placeholder: "Permanent" },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>
        <TabsContent value="mangle">
          <CrudTable
            path="ip/firewall/mangle"
            noun="Mangle Rule"
            columns={[
              { key: "comment", header: "Description", render: (r) => <span className="font-medium">{r.comment || "—"}</span> },
              { key: "chain", header: "Chain" },
              { key: "action", header: "Action", render: (r) => <ActionBadge action={r.action} /> },
              { key: "match", header: "Match", render: (r) => <Match r={r} /> },
              {
                key: "mark",
                header: "Sets",
                render: (r) => (
                  <span className="text-muted-foreground">
                    {r["new-connection-mark"] ?? r["new-packet-mark"] ?? r["new-routing-mark"] ?? r["new-dscp"] ?? r["new-mss"] ?? "—"}
                  </span>
                ),
              },
              counters,
            ]}
            defaults={{ chain: "prerouting", action: "mark-connection", passthrough: "true" }}
            fields={[
              { name: "chain", label: "Chain", type: "select", options: ["prerouting", "input", "forward", "output", "postrouting"], required: true, section: "Match" },
              { name: "protocol", label: "Protocol", type: "select", options: PROTOCOLS, placeholder: "Any", section: "Match" },
              { name: "src-address", label: "Source address", placeholder: "Any", section: "Match" },
              { name: "dst-address", label: "Destination address", placeholder: "Any", section: "Match" },
              { name: "dst-port", label: "Destination port", section: "Match", when: (v) => v.protocol === "tcp" || v.protocol === "udp" },
              { name: "in-interface", label: "Incoming interface", type: "select", options: ifaceOptions, placeholder: "Any", section: "Match" },
              { name: "connection-mark", label: "Existing connection mark", section: "Match" },
              {
                name: "action",
                label: "Action",
                type: "select",
                required: true,
                section: "Action",
                options: ["mark-connection", "mark-packet", "mark-routing", "change-mss", "change-dscp", "change-ttl", "accept", "passthrough", "route", "jump"],
              },
              { name: "new-connection-mark", label: "New connection mark", section: "Action", when: (v) => v.action === "mark-connection" },
              { name: "new-packet-mark", label: "New packet mark", section: "Action", when: (v) => v.action === "mark-packet" },
              { name: "new-routing-mark", label: "Routing table", section: "Action", when: (v) => v.action === "mark-routing" },
              { name: "new-mss", label: "New MSS", placeholder: "clamp-to-pmtu", section: "Action", when: (v) => v.action === "change-mss" },
              { name: "new-dscp", label: "New DSCP", type: "number", section: "Action", when: (v) => v.action === "change-dscp" },
              { name: "passthrough", label: "Continue to next rule", type: "switch", section: "Action" },
              { name: "comment", label: "Description", section: "Action" },
            ]}
          />
        </TabsContent>

        <TabsContent value="raw">
          <CrudTable
            path="ip/firewall/raw"
            noun="Raw Rule"
            emptyText="Raw rules run before connection tracking. Use them to drop floods cheaply or skip tracking (notrack)."
            columns={[
              { key: "comment", header: "Description", render: (r) => <span className="font-medium">{r.comment || "—"}</span> },
              { key: "chain", header: "Chain" },
              { key: "action", header: "Action", render: (r) => <ActionBadge action={r.action} /> },
              { key: "match", header: "Match", render: (r) => <Match r={r} /> },
              counters,
            ]}
            defaults={{ chain: "prerouting", action: "drop" }}
            fields={[
              { name: "chain", label: "Chain", type: "select", options: ["prerouting", "output"], required: true },
              { name: "action", label: "Action", type: "select", options: ["accept", "drop", "notrack", "passthrough"], required: true },
              { name: "protocol", label: "Protocol", type: "select", options: PROTOCOLS, placeholder: "Any" },
              { name: "src-address", label: "Source address", placeholder: "Any" },
              { name: "src-address-list", label: "Source address list" },
              { name: "dst-address", label: "Destination address", placeholder: "Any" },
              { name: "dst-port", label: "Destination port", when: (v) => v.protocol === "tcp" || v.protocol === "udp" },
              { name: "in-interface", label: "Incoming interface", type: "select", options: ifaceOptions, placeholder: "Any" },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>

        <TabsContent value="l7">
          <CrudTable
            path="ip/firewall/layer7-protocol"
            noun="Layer 7 Pattern"
            showToggle={false}
            emptyText="Match application traffic by a regular expression on the first packets of a connection."
            columns={[
              { key: "name", header: "Name", className: "font-medium" },
              { key: "regexp", header: "Pattern", className: "font-mono text-xs" },
            ]}
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "regexp", label: "Regular expression", type: "textarea", required: true },
              { name: "comment", label: "Description" },
            ]}
          />
        </TabsContent>

        <TabsContent value="connections">
          <CrudTable
            path="ip/firewall/connection"
            noun="Connection"
            readOnly
            refetchInterval={5000}
            searchKeys={["src-address", "dst-address", "protocol", "tcp-state"]}
            columns={[
              { key: "protocol", header: "Protocol", render: (r) => (r.protocol ?? "").toUpperCase() },
              { key: "src-address", header: "Source", className: "tabular-nums" },
              { key: "dst-address", header: "Destination", className: "tabular-nums" },
              { key: "tcp-state", header: "State", render: (r) => <span className="text-muted-foreground">{r["tcp-state"] ?? (r.assured === "true" ? "assured" : "—")}</span> },
              { key: "timeout", header: "Timeout", className: "tabular-nums text-muted-foreground" },
              {
                key: "orig-bytes",
                header: "Traffic",
                className: "text-right tabular-nums text-muted-foreground",
                render: (r) => formatBytes(Number(r["orig-bytes"] ?? 0) + Number(r["repl-bytes"] ?? 0)),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="alg">
          <CrudTable
            path="ip/firewall/service-port"
            noun="Helper"
            allowCreate={false}
            allowDelete={false}
            emptyText="Protocol helpers let FTP, SIP and similar protocols work through NAT."
            columns={[
              { key: "name", header: "Protocol", className: "font-medium uppercase" },
              { key: "ports", header: "Ports", className: "tabular-nums" },
            ]}
            fields={[{ name: "ports", label: "Ports" }]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
