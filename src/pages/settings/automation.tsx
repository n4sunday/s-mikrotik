import { toast } from "sonner";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrudTable } from "@/components/crud-table";
import { StatusDot } from "@/components/common";
import { TabbedPage, cell } from "@/components/settings-kit";
import { ros } from "@/lib/api";
import { errorMessage } from "@/lib/utils";

const POLICY_HINT = "read,write,policy,test (comma separated)";

export function AutomationSettings() {
  return (
    <TabbedPage
      title="Automation"
      description="Scheduled tasks, scripts and reacting to hosts going up or down."
      tabs={[
        {
          id: "scheduler",
          label: "Schedules",
          content: (
            <CrudTable
              path="system/scheduler"
              noun="Schedule"
              columns={[
                { key: "name", header: "Name", className: "font-medium" },
                { key: "interval", header: "Every", render: (r) => (r.interval && r.interval !== "0s" ? r.interval : "Once") },
                { key: "start-time", header: "Starts", render: (r) => cell.muted([r["start-date"], r["start-time"]].filter(Boolean).join(" ")) },
                { key: "next-run", header: "Next run", render: (r) => cell.muted(r["next-run"]) },
                { key: "run-count", header: "Runs", className: "tabular-nums" },
              ]}
              defaults={{ interval: "1d", "start-time": "03:00:00" }}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "start-date", label: "Start date", placeholder: "2026-01-01" },
                { name: "start-time", label: "Start time", placeholder: "startup or 03:00:00" },
                { name: "interval", label: "Repeat every", placeholder: "1d, 1h, 0s for once" },
                { name: "on-event", label: "Run", type: "textarea", placeholder: "/system script run my-script", required: true },
                { name: "policy", label: "Permissions", placeholder: POLICY_HINT },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
        {
          id: "scripts",
          label: "Scripts",
          content: (
            <CrudTable
              path="system/script"
              noun="Script"
              showToggle={false}
              columns={[
                { key: "name", header: "Name", className: "font-medium" },
                { key: "source", header: "Source", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.source?.split("\n")[0]}</span> },
                { key: "last-started", header: "Last run", render: (r) => cell.muted(r["last-started"]) },
                { key: "run-count", header: "Runs", className: "tabular-nums" },
              ]}
              rowActions={(r) => (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    ros
                      .run("system/script/run", { ".id": r[".id"] })
                      .then(() => toast.success(`Ran ${r.name}`))
                      .catch((e) => toast.error(errorMessage(e)))
                  }
                >
                  <PlayIcon /> Run
                </Button>
              )}
              defaults={{ policy: "read,write,policy,test" }}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "source", label: "Script", type: "textarea", required: true },
                { name: "policy", label: "Permissions", placeholder: POLICY_HINT },
                { name: "dont-require-permissions", label: "Don't require permissions", type: "switch" },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
        {
          id: "netwatch",
          label: "Netwatch",
          content: (
            <CrudTable
              path="tool/netwatch"
              noun="Monitor"
              refetchInterval={10_000}
              emptyText="Ping a host and run a script when it goes down or comes back, e.g. switch to a backup WAN."
              columns={[
                { key: "host", header: "Host", className: "font-medium tabular-nums" },
                { key: "type", header: "Check" },
                { key: "interval", header: "Every" },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => (
                    <span className="flex items-center gap-2 capitalize">
                      <StatusDot status={r.status === "up" ? "online" : r.status === "down" ? "offline" : "disabled"} />
                      {r.status ?? "unknown"}
                    </span>
                  ),
                },
                { key: "comment", header: "Description", render: (r) => cell.muted(r.comment) },
              ]}
              defaults={{ type: "icmp", interval: "30s" }}
              fields={[
                { name: "host", label: "Host", required: true },
                { name: "type", label: "Check", type: "select", options: ["icmp", "tcp-conn", "http-get", "simple"] },
                { name: "port", label: "Port", type: "number", when: (v) => v.type === "tcp-conn" || v.type === "http-get" },
                { name: "interval", label: "Every" },
                { name: "timeout", label: "Timeout" },
                { name: "up-script", label: "When up", type: "textarea" },
                { name: "down-script", label: "When down", type: "textarea" },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
