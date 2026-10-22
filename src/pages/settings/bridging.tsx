import { Badge } from "@/components/ui/badge";
import { CrudTable } from "@/components/crud-table";
import { SettingsPanel, TabbedPage, cell, useOptions } from "@/components/settings-kit";
import { isTrue } from "@/lib/utils";

const FRAME_TYPES = ["admit-all", "admit-only-vlan-tagged", "admit-only-untagged-and-priority-tagged"];

export function BridgingSettings() {
  const ifaces = useOptions("interface");
  const bridges = useOptions("interface/bridge");
  const lists = useOptions("interface/list");

  return (
    <TabbedPage
      title="Bridge & VLANs"
      description="Switching, VLAN tagging, interface groups and link aggregation."
      tabs={[
        {
          id: "bridges",
          label: "Bridges",
          content: (
            <>
              <CrudTable
                path="interface/bridge"
                noun="Bridge"
                invalidate={["interface"]}
                columns={[
                  { key: "name", header: "Name", className: "font-medium" },
                  { key: "protocol-mode", header: "STP" },
                  { key: "vlan-filtering", header: "VLAN filtering", render: (r) => (isTrue(r["vlan-filtering"]) ? <Badge className="bg-success/15 text-success">On</Badge> : <Badge variant="secondary">Off</Badge>) },
                  { key: "pvid", header: "PVID", render: (r) => cell.muted(r.pvid) },
                  { key: "comment", header: "Description", render: (r) => cell.muted(r.comment) },
                ]}
                defaults={{ "protocol-mode": "rstp" }}
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "protocol-mode", label: "Spanning tree", type: "select", options: ["none", "stp", "rstp", "mstp"] },
                  { name: "vlan-filtering", label: "VLAN filtering", type: "switch", description: "Turn on only after the VLAN table is ready, or you may lock yourself out." },
                  { name: "pvid", label: "Bridge PVID", type: "number" },
                  { name: "frame-types", label: "Frame types", type: "select", options: FRAME_TYPES },
                  { name: "igmp-snooping", label: "IGMP snooping", type: "switch" },
                  { name: "comment", label: "Description" },
                ]}
              />
              <SettingsPanel
                path="interface/bridge/settings"
                title="Bridge Settings"
                fields={[
                  { name: "use-ip-firewall", label: "Pass bridged traffic through IP firewall", type: "switch" },
                  { name: "use-ip-firewall-for-vlan", label: "…including VLAN-tagged traffic", type: "switch" },
                  { name: "allow-fast-path", label: "Fast path", type: "switch" },
                ]}
              />
            </>
          ),
        },
        {
          id: "ports",
          label: "Ports",
          content: (
            <CrudTable
              path="interface/bridge/port"
              noun="Bridge Port"
              columns={[
                { key: "interface", header: "Interface", className: "font-medium" },
                { key: "bridge", header: "Bridge" },
                { key: "pvid", header: "Native VLAN (PVID)" },
                { key: "frame-types", header: "Frame types", render: (r) => cell.muted(r["frame-types"]) },
                { key: "hw", header: "HW offload", render: (r) => (isTrue(r.hw) || isTrue(r["hw-offload"]) ? "Yes" : "No") },
              ]}
              defaults={{ pvid: "1" }}
              fields={[
                { name: "interface", label: "Interface", type: "select", options: ifaces, required: true },
                { name: "bridge", label: "Bridge", type: "select", options: bridges, required: true },
                { name: "pvid", label: "Native VLAN (PVID)", type: "number" },
                { name: "frame-types", label: "Allowed frames", type: "select", options: FRAME_TYPES },
                { name: "horizon", label: "Horizon", placeholder: "none", description: "Ports with the same horizon can't talk to each other (client isolation)." },
                { name: "edge", label: "STP edge", type: "select", options: ["auto", "yes", "no"] },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
        {
          id: "vlans",
          label: "VLAN Table",
          content: (
            <CrudTable
              path="interface/bridge/vlan"
              noun="VLAN"
              columns={[
                { key: "vlan-ids", header: "VLAN IDs", className: "font-medium tabular-nums" },
                { key: "bridge", header: "Bridge" },
                { key: "tagged", header: "Tagged ports", render: (r) => cell.muted(r.tagged) },
                { key: "untagged", header: "Untagged ports", render: (r) => cell.muted(r.untagged) },
              ]}
              fields={[
                { name: "bridge", label: "Bridge", type: "select", options: bridges, required: true },
                { name: "vlan-ids", label: "VLAN IDs", placeholder: "10,20 or 100-110", required: true },
                { name: "tagged", label: "Tagged (trunk) ports", placeholder: "bridge,ether1", description: "Comma separated. Include the bridge itself for VLANs the router routes." },
                { name: "untagged", label: "Untagged (access) ports", placeholder: "ether3,ether4" },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
        {
          id: "vlan-if",
          label: "VLAN Interfaces",
          content: (
            <CrudTable
              path="interface/vlan"
              noun="VLAN Interface"
              invalidate={["interface"]}
              columns={[
                { key: "name", header: "Name", className: "font-medium" },
                { key: "vlan-id", header: "VLAN ID", className: "tabular-nums" },
                { key: "interface", header: "Parent" },
                { key: "mtu", header: "MTU", render: (r) => cell.muted(r.mtu) },
              ]}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "vlan-id", label: "VLAN ID", type: "number", required: true },
                { name: "interface", label: "Parent interface", type: "select", options: ifaces, required: true },
                { name: "mtu", label: "MTU", type: "number" },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
        {
          id: "lists",
          label: "Interface Lists",
          content: (
            <>
              <CrudTable
                path="interface/list"
                noun="Interface List"
                showToggle={false}
                columns={[
                  { key: "name", header: "Name", className: "font-medium" },
                  { key: "include", header: "Includes lists", render: (r) => cell.muted(r.include) },
                  { key: "comment", header: "Description", render: (r) => cell.muted(r.comment) },
                ]}
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "include", label: "Include other lists" },
                  { name: "exclude", label: "Exclude lists" },
                  { name: "comment", label: "Description" },
                ]}
              />
              <CrudTable
                path="interface/list/member"
                noun="List Member"
                columns={[
                  { key: "list", header: "List", render: (r) => <Badge variant="secondary">{r.list}</Badge> },
                  { key: "interface", header: "Interface", className: "font-medium" },
                  { key: "comment", header: "Description", render: (r) => cell.muted(r.comment) },
                ]}
                fields={[
                  { name: "list", label: "List", type: "select", options: lists, required: true },
                  { name: "interface", label: "Interface", type: "select", options: ifaces, required: true },
                  { name: "comment", label: "Description" },
                ]}
              />
            </>
          ),
        },
        {
          id: "bonding",
          label: "Bonding",
          content: (
            <CrudTable
              path="interface/bonding"
              noun="Bond"
              invalidate={["interface"]}
              emptyText="Combine several ports into one faster, redundant link."
              columns={[
                { key: "name", header: "Name", className: "font-medium" },
                { key: "mode", header: "Mode" },
                { key: "slaves", header: "Members" },
              ]}
              defaults={{ mode: "802.3ad" }}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "slaves", label: "Member ports", placeholder: "ether4,ether5", required: true },
                { name: "mode", label: "Mode", type: "select", options: ["802.3ad", "active-backup", "balance-rr", "balance-xor", "balance-tlb", "balance-alb", "broadcast"] },
                { name: "transmit-hash-policy", label: "Hash policy", type: "select", options: ["layer-2", "layer-2-and-3", "layer-3-and-4"] },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
