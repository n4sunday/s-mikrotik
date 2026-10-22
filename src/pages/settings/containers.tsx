import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PlayIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import { SettingsPanel, SubHeading, TabbedPage, cell, useOptions } from "@/components/settings-kit";
import { ros, type RosRecord } from "@/lib/api";
import { errorMessage } from "@/lib/utils";

export function ContainerSettings() {
  const qc = useQueryClient();
  const veths = useOptions("interface/veth");

  async function control(r: RosRecord, action: "start" | "stop") {
    try {
      await ros.run(`container/${action}`, { ".id": r[".id"] });
      toast.success(`${r.name ?? r.tag} ${action === "start" ? "starting" : "stopping"}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["ros", "container"] }), 800);
    }
  }

  return (
    <TabbedPage
      title="Containers"
      description="Run Docker images on the router (Pi-hole, AdGuard, Home Assistant…). Needs the container package and device-mode container=yes."
      tabs={[
        {
          id: "containers",
          label: "Containers",
          content: (
            <CrudTable
              path="container"
              noun="Container"
              showToggle={false}
              refetchInterval={5000}
              emptyText="Pull an image such as adguard/adguardhome and attach it to a veth interface."
              columns={[
                { key: "name", header: "Name", render: (r) => cell.strong(r.name ?? r.hostname ?? r.tag) },
                { key: "tag", header: "Image", render: (r) => <span className="font-mono text-xs">{r.tag ?? r["remote-image"]}</span> },
                { key: "interface", header: "Interface" },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => (
                    <span className="flex items-center gap-2 capitalize">
                      <StatusDot status={r.status === "running" ? "online" : r.status === "stopped" ? "disabled" : "warning"} />
                      {r.status ?? "—"}
                    </span>
                  ),
                },
              ]}
              rowActions={(r) =>
                r.status === "running" ? (
                  <Button variant="outline" size="xs" onClick={() => control(r, "stop")}>
                    <SquareIcon /> Stop
                  </Button>
                ) : (
                  <Button variant="outline" size="xs" disabled={r.status === "extracting"} onClick={() => control(r, "start")}>
                    <PlayIcon /> Start
                  </Button>
                )
              }
              defaults={{ "start-on-boot": "true", logging: "true" }}
              fields={[
                { name: "remote-image", label: "Image", placeholder: "adguard/adguardhome:latest", required: true },
                { name: "name", label: "Name" },
                { name: "interface", label: "Network (veth)", type: "select", options: veths, required: true },
                { name: "root-dir", label: "Storage folder", placeholder: "usb1/adguard" },
                { name: "envlist", label: "Environment list" },
                { name: "mounts", label: "Mounts", placeholder: "adguard_conf" },
                { name: "cmd", label: "Command override" },
                { name: "hostname", label: "Hostname" },
                { name: "start-on-boot", label: "Start on boot", type: "switch" },
                { name: "logging", label: "Log output", type: "switch" },
              ]}
            />
          ),
        },
        {
          id: "network",
          label: "Networking",
          content: (
            <CrudTable
              path="interface/veth"
              noun="veth Interface"
              invalidate={["interface"]}
              emptyText="Each container gets a veth interface. Add it to a bridge to put the container on your LAN."
              columns={[
                { key: "name", header: "Name", className: "font-medium" },
                { key: "address", header: "Address", className: "tabular-nums" },
                { key: "gateway", header: "Gateway", className: "tabular-nums" },
              ]}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "address", label: "Container address", placeholder: "172.17.0.2/24", required: true },
                { name: "gateway", label: "Gateway", placeholder: "172.17.0.1" },
              ]}
            />
          ),
        },
        {
          id: "env",
          label: "Env & Mounts",
          content: (
            <>
              <CrudTable
                path="container/envs"
                noun="Variable"
                showToggle={false}
                columns={[
                  { key: "name", header: "List", className: "font-medium" },
                  { key: "key", header: "Key", className: "font-mono text-xs" },
                  { key: "value", header: "Value", className: "font-mono text-xs" },
                ]}
                fields={[
                  { name: "name", label: "List name", required: true },
                  { name: "key", label: "Key", required: true },
                  { name: "value", label: "Value" },
                ]}
              />
              <SubHeading title="Mounts" />
              <CrudTable
                path="container/mounts"
                noun="Mount"
                showToggle={false}
                columns={[
                  { key: "name", header: "Name", className: "font-medium" },
                  { key: "src", header: "Router path", className: "font-mono text-xs" },
                  { key: "dst", header: "Container path", className: "font-mono text-xs" },
                ]}
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "src", label: "Router path", placeholder: "/usb1/adguard/conf", required: true },
                  { name: "dst", label: "Container path", placeholder: "/opt/adguardhome/conf", required: true },
                ]}
              />
            </>
          ),
        },
        {
          id: "config",
          label: "Registry",
          content: (
            <SettingsPanel
              path="container/config"
              title="Container settings"
              fields={[
                { name: "registry-url", label: "Registry", placeholder: "https://registry-1.docker.io" },
                { name: "username", label: "Registry user" },
                { name: "password", label: "Registry password", type: "password" },
                { name: "tmpdir", label: "Temp folder for pulls", placeholder: "usb1/pull" },
                { name: "ram-high", label: "Memory limit", placeholder: "0 (unlimited)" },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
