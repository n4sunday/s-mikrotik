import { Badge } from "@/components/ui/badge";
import { CrudTable } from "@/components/crud-table";
import { SettingsPanel, TabbedPage, cell, useOptions } from "@/components/settings-kit";

export function LoggingSettings() {
  const actions = useOptions("system/logging/action");

  return (
    <TabbedPage
      title="Logging & Notifications"
      description="What gets logged, where it goes, and how the router sends e-mail."
      tabs={[
        {
          id: "rules",
          label: "Log Rules",
          content: (
            <CrudTable
              path="system/logging"
              noun="Log Rule"
              columns={[
                {
                  key: "topics",
                  header: "Topics",
                  render: (r) => (
                    <span className="flex flex-wrap gap-1">
                      {r.topics?.split(",").map((t) => (
                        <Badge key={t} variant="secondary" className="h-4 text-[10px]">{t}</Badge>
                      ))}
                    </span>
                  ),
                },
                { key: "action", header: "Destination", className: "font-medium" },
                { key: "prefix", header: "Prefix", render: (r) => cell.muted(r.prefix) },
              ]}
              defaults={{ action: "memory" }}
              fields={[
                { name: "topics", label: "Topics", placeholder: "info,!debug or firewall", required: true, description: "Prefix a topic with ! to exclude it." },
                { name: "action", label: "Destination", type: "select", options: actions, required: true },
                { name: "prefix", label: "Prefix" },
              ]}
            />
          ),
        },
        {
          id: "destinations",
          label: "Destinations",
          content: (
            <CrudTable
              path="system/logging/action"
              noun="Destination"
              showToggle={false}
              columns={[
                { key: "name", header: "Name", className: "font-medium" },
                { key: "target", header: "Type" },
                {
                  key: "remote",
                  header: "Where",
                  render: (r) =>
                    cell.muted(
                      r.target === "remote" ? `${r.remote}:${r["remote-port"] ?? 514}` : r.target === "disk" ? r["disk-file-name"] : r.target === "memory" ? `${r["memory-lines"] ?? ""} lines` : "",
                    ),
                },
              ]}
              defaults={{ target: "remote", "remote-port": "514" }}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "target", label: "Type", type: "select", options: ["remote", "disk", "memory", "echo", "email"], required: true },
                { name: "remote", label: "Syslog server", when: (v) => v.target === "remote" },
                { name: "remote-port", label: "Port", type: "number", when: (v) => v.target === "remote" },
                { name: "bsd-syslog", label: "BSD syslog format", type: "switch", when: (v) => v.target === "remote" },
                { name: "disk-file-name", label: "File name", when: (v) => v.target === "disk" },
                { name: "disk-lines-per-file", label: "Lines per file", type: "number", when: (v) => v.target === "disk" },
                { name: "memory-lines", label: "Lines kept", type: "number", when: (v) => v.target === "memory" },
                { name: "email-to", label: "Send to", when: (v) => v.target === "email" },
              ]}
            />
          ),
        },
        {
          id: "email",
          label: "E-mail",
          content: (
            <SettingsPanel
              path="tool/e-mail"
              title="Outgoing e-mail (SMTP)"
              description="Used by logging, Netwatch and scripts (/tool e-mail send)."
              fields={[
                { name: "server", label: "SMTP server", placeholder: "smtp.gmail.com" },
                { name: "port", label: "Port", type: "number" },
                { name: "tls", label: "TLS", type: "select", options: ["no", "yes", "starttls"] },
                { name: "from", label: "From address" },
                { name: "user", label: "Username" },
                { name: "password", label: "Password", type: "password" },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
