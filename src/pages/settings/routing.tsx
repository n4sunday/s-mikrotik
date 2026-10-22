import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/common";
import { SubHeading, TabbedPage, cell, useOptions } from "@/components/settings-kit";
import { CrudTable } from "@/components/crud-table";
import { isTrue } from "@/lib/utils";

export function RoutingSettings() {
  return (
    <TabbedPage
      title="Routing"
      description="Static and policy routing, plus dynamic routing protocols."
      tabs={[
        { id: "static", label: "Routes", content: <StaticRoutes /> },
        { id: "policy", label: "Policy Routing", content: <PolicyRouting /> },
        { id: "ospf", label: "OSPF", content: <Ospf /> },
        { id: "bgp", label: "BGP", content: <Bgp /> },
        { id: "filters", label: "Route Filters", content: <RouteFilters /> },
      ]}
    />
  );
}

function StaticRoutes() {
  const tables = useOptions("routing/table");
  return (
    <>
      <CrudTable
        path="ip/route"
        noun="Route"
        searchKeys={["dst-address", "gateway", "comment"]}
        columns={[
          {
            key: "dst-address",
            header: "Destination",
            render: (r) => (
              <span className="flex items-center gap-2 font-medium tabular-nums">
                {r["dst-address"]}
                {r["dst-address"] === "0.0.0.0/0" && <Badge variant="secondary" className="h-4 text-[10px]">Default</Badge>}
              </span>
            ),
          },
          { key: "gateway", header: "Next Hop", className: "tabular-nums" },
          { key: "distance", header: "Distance" },
          { key: "routing-table", header: "Table" },
          {
            key: "active",
            header: "State",
            render: (r) => (
              <span className={isTrue(r.active) ? "text-success" : "text-muted-foreground"}>
                {isTrue(r.active) ? "Active" : "Inactive"}
              </span>
            ),
          },
          { key: "comment", header: "Description", render: (r) => <span className="text-muted-foreground">{r.comment}</span> },
        ]}
        defaults={{ distance: "1" }}
        fields={[
          { name: "dst-address", label: "Destination network", placeholder: "10.0.0.0/24", required: true },
          { name: "gateway", label: "Next hop", placeholder: "192.168.88.254 or interface", required: true },
          { name: "distance", label: "Distance", type: "number" },
          { name: "routing-table", label: "Routing table", type: "select", options: ["main", ...tables] },
          { name: "comment", label: "Description" },
        ]}
      />
    </>
  );
}

function PolicyRouting() {
  const tables = useOptions("routing/table");
  const ifaces = useOptions("interface");
  return (
    <>
      <CrudTable
        path="routing/table"
        noun="Routing Table"
        emptyText="Extra tables let some traffic use a different gateway (e.g. send one device through a VPN)."
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "fib", header: "FIB", render: (r) => (isTrue(r.fib) ? "Yes" : "No") },
          { key: "comment", header: "Description", render: (r) => cell.muted(r.comment) },
        ]}
        createExtra={{ fib: "" }}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "comment", label: "Description" },
        ]}
      />
      <SubHeading title="Rules" description="Choose a table by source, destination, interface or mark." />
      <CrudTable
        path="routing/rule"
        noun="Routing Rule"
        columns={[
          { key: "src-address", header: "Source", render: (r) => cell.muted(r["src-address"]) },
          { key: "dst-address", header: "Destination", render: (r) => cell.muted(r["dst-address"]) },
          { key: "routing-mark", header: "Mark", render: (r) => cell.muted(r["routing-mark"]) },
          { key: "action", header: "Action" },
          { key: "table", header: "Table", className: "font-medium" },
        ]}
        defaults={{ action: "lookup" }}
        fields={[
          { name: "src-address", label: "Source address" },
          { name: "dst-address", label: "Destination address" },
          { name: "interface", label: "Incoming interface", type: "select", options: ifaces },
          { name: "routing-mark", label: "Routing mark" },
          { name: "action", label: "Action", type: "select", options: ["lookup", "lookup-only-in-table", "drop", "unreachable"] },
          { name: "table", label: "Table", type: "select", options: ["main", ...tables] },
          { name: "comment", label: "Description" },
        ]}
      />
    </>
  );
}

function Ospf() {
  const instances = useOptions("routing/ospf/instance");
  const areas = useOptions("routing/ospf/area");
  return (
    <>
      <CrudTable
        path="routing/ospf/instance"
        noun="OSPF Instance"
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "version", header: "Version" },
          { key: "router-id", header: "Router ID", className: "tabular-nums" },
          { key: "redistribute", header: "Redistribute", render: (r) => cell.muted(r.redistribute) },
        ]}
        defaults={{ version: "2" }}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "version", label: "Version", type: "select", options: ["2", "3"] },
          { name: "router-id", label: "Router ID", placeholder: "main" },
          { name: "redistribute", label: "Redistribute", placeholder: "connected,static" },
          { name: "originate-default", label: "Originate default", type: "select", options: ["never", "always", "if-installed"] },
        ]}
      />
      <SubHeading title="Areas" />
      <CrudTable
        path="routing/ospf/area"
        noun="Area"
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "area-id", header: "Area ID", className: "tabular-nums" },
          { key: "instance", header: "Instance" },
          { key: "type", header: "Type" },
        ]}
        defaults={{ "area-id": "0.0.0.0", type: "default" }}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "area-id", label: "Area ID", required: true },
          { name: "instance", label: "Instance", type: "select", options: instances, required: true },
          { name: "type", label: "Type", type: "select", options: ["default", "stub", "nssa"] },
        ]}
      />
      <SubHeading title="Interfaces" />
      <CrudTable
        path="routing/ospf/interface-template"
        noun="Interface Template"
        columns={[
          { key: "interfaces", header: "Interfaces", render: (r) => cell.strong(r.interfaces ?? r.networks) },
          { key: "area", header: "Area" },
          { key: "cost", header: "Cost" },
          { key: "type", header: "Type", render: (r) => cell.muted(r.type) },
        ]}
        fields={[
          { name: "area", label: "Area", type: "select", options: areas, required: true },
          { name: "interfaces", label: "Interfaces", placeholder: "bridge,ether2" },
          { name: "networks", label: "…or networks", placeholder: "10.0.0.0/24" },
          { name: "cost", label: "Cost", type: "number" },
          { name: "type", label: "Network type", type: "select", options: ["broadcast", "ptp", "nbma", "ptmp"] },
          { name: "passive", label: "Passive", type: "switch" },
        ]}
      />
      <SubHeading title="Neighbors" />
      <CrudTable
        path="routing/ospf/neighbor"
        noun="Neighbor"
        readOnly
        refetchInterval={10_000}
        columns={[
          { key: "router-id", header: "Router ID", className: "font-medium tabular-nums" },
          { key: "address", header: "Address", className: "tabular-nums" },
          { key: "state", header: "State", render: (r) => <span className="flex items-center gap-2"><StatusDot status={r.state === "Full" ? "online" : "warning"} />{r.state}</span> },
          { key: "interface", header: "Interface" },
        ]}
      />
    </>
  );
}

function Bgp() {
  const templates = useOptions("routing/bgp/template");
  return (
    <>
      <CrudTable
        path="routing/bgp/connection"
        noun="BGP Peer"
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "remote.address", header: "Remote", render: (r) => <span className="tabular-nums">{r["remote.address"] ?? "—"}</span> },
          { key: "remote.as", header: "Remote AS", render: (r) => r["remote.as"] ?? "—" },
          { key: "as", header: "Local AS", render: (r) => r.as ?? r["local.as"] ?? "—" },
          { key: "templates", header: "Template", render: (r) => cell.muted(r.templates) },
        ]}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "as", label: "Local AS", type: "number", required: true },
          { name: "remote.address", label: "Remote address", required: true },
          { name: "remote.as", label: "Remote AS", type: "number" },
          { name: "local.role", label: "Role", type: "select", options: ["ebgp", "ibgp", "ebgp-customer", "ebgp-provider", "ebgp-peer"] },
          { name: "templates", label: "Template", type: "select", options: templates },
          { name: "output.network", label: "Advertise address list" },
          { name: "comment", label: "Description" },
        ]}
      />
      <SubHeading title="Sessions" />
      <CrudTable
        path="routing/bgp/session"
        noun="Session"
        readOnly
        refetchInterval={10_000}
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "remote.address", header: "Remote", render: (r) => r["remote.address"] ?? "—" },
          { key: "established", header: "State", render: (r) => <span className="flex items-center gap-2"><StatusDot status={isTrue(r.established) ? "online" : "offline"} />{isTrue(r.established) ? "Established" : "Down"}</span> },
          { key: "uptime", header: "Uptime", render: (r) => cell.muted(r.uptime) },
          { key: "prefix-count", header: "Prefixes", render: (r) => r["prefix-count"] ?? "—" },
        ]}
      />
    </>
  );
}

function RouteFilters() {
  return (
    <CrudTable
      path="routing/filter/rule"
      noun="Filter Rule"
      emptyText="Filter or modify routes exchanged with OSPF and BGP peers."
      columns={[
        { key: "chain", header: "Chain", className: "font-medium" },
        { key: "rule", header: "Rule", className: "font-mono text-xs" },
        { key: "comment", header: "Description", render: (r) => cell.muted(r.comment) },
      ]}
      fields={[
        { name: "chain", label: "Chain", required: true },
        { name: "rule", label: "Rule", type: "textarea", placeholder: "if (dst in 10.0.0.0/8) { reject }", required: true },
        { name: "comment", label: "Description" },
      ]}
    />
  );
}
