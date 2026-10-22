import { Badge } from "@/components/ui/badge";
import { CrudTable } from "@/components/crud-table";
import { SettingsPanel, TabbedPage, cell } from "@/components/settings-kit";
import { useRosCommand } from "@/hooks/use-ros";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "SRV", "TXT", "FWD", "NXDOMAIN"];

export function DnsSettings() {
  const flush = useRosCommand("ip/dns/cache/flush", ["ip/dns/cache", "ip/dns"]);

  return (
    <TabbedPage
      title="DNS"
      description="Resolver, local host names and encrypted DNS."
      tabs={[
        {
          id: "records",
          label: "Local Records",
          content: (
            <CrudTable
              path="ip/dns/static"
              noun="DNS Record"
              searchKeys={["name", "address", "cname", "regexp", "comment"]}
              columns={[
                { key: "name", header: "Name", render: (r) => cell.strong(r.name ?? r.regexp) },
                { key: "type", header: "Type", render: (r) => <Badge variant="secondary">{r.type ?? "A"}</Badge> },
                { key: "address", header: "Value", render: (r) => <span className="tabular-nums">{r.address ?? r.cname ?? r.text ?? r["forward-to"] ?? r["mx-exchange"] ?? "—"}</span> },
                { key: "ttl", header: "TTL", render: (r) => cell.muted(r.ttl) },
                { key: "comment", header: "Description", render: (r) => cell.muted(r.comment) },
              ]}
              defaults={{ type: "A", ttl: "1d" }}
              fields={[
                { name: "name", label: "Host name", placeholder: "nas.lan" },
                { name: "regexp", label: "…or regular expression", placeholder: ".*\\.ads\\.example$", description: "Use instead of a name to match many hosts." },
                { name: "type", label: "Record type", type: "select", options: RECORD_TYPES, required: true },
                { name: "address", label: "IP address", when: (v) => !v.type || v.type === "A" || v.type === "AAAA" },
                { name: "cname", label: "Canonical name", when: (v) => v.type === "CNAME" },
                { name: "mx-exchange", label: "Mail server", when: (v) => v.type === "MX" },
                { name: "mx-preference", label: "Preference", type: "number", when: (v) => v.type === "MX" },
                { name: "ns", label: "Name server", when: (v) => v.type === "NS" },
                { name: "text", label: "Text", when: (v) => v.type === "TXT" },
                { name: "srv-target", label: "Target", when: (v) => v.type === "SRV" },
                { name: "srv-port", label: "Port", type: "number", when: (v) => v.type === "SRV" },
                { name: "forward-to", label: "Forward to DNS server", when: (v) => v.type === "FWD" },
                { name: "match-subdomain", label: "Also match subdomains", type: "switch" },
                { name: "ttl", label: "TTL", placeholder: "1d" },
                { name: "comment", label: "Description" },
              ]}
            />
          ),
        },
        {
          id: "resolver",
          label: "Resolver",
          content: (
            <>
              <SettingsPanel
                path="ip/dns"
                title="Resolver"
                status={[
                  ["dynamic-servers", "ISP servers"],
                  ["cache-used", "Cache used"],
                ]}
                fields={[
                  { name: "servers", label: "Upstream servers", placeholder: "1.1.1.1,8.8.8.8", description: "Comma separated." },
                  { name: "allow-remote-requests", label: "Serve DNS to LAN clients", type: "switch" },
                  { name: "cache-size", label: "Cache size", placeholder: "2048KiB" },
                  { name: "cache-max-ttl", label: "Max cache TTL", placeholder: "1w" },
                  { name: "max-concurrent-queries", label: "Max concurrent queries", type: "number" },
                ]}
              />
              <SettingsPanel
                path="ip/dns"
                title="Encrypted DNS (DoH)"
                description="Send upstream queries over HTTPS. Requires the provider's CA in Certificates when verification is on."
                fields={[
                  { name: "use-doh-server", label: "DoH server URL", placeholder: "https://cloudflare-dns.com/dns-query" },
                  { name: "verify-doh-cert", label: "Verify server certificate", type: "switch" },
                ]}
              />
            </>
          ),
        },
        {
          id: "cache",
          label: "Cache",
          content: (
            <CrudTable
              path="ip/dns/cache"
              noun="Cached Entry"
              readOnly
              toolbar={
                <Button size="sm" variant="outline" onClick={() => flush.mutate({}, { onSuccess: () => toast.success("DNS cache flushed") })}>
                  Flush cache
                </Button>
              }
              columns={[
                { key: "name", header: "Name", className: "font-medium" },
                { key: "type", header: "Type" },
                { key: "data", header: "Data", className: "tabular-nums" },
                { key: "ttl", header: "TTL", render: (r) => cell.muted(r.ttl) },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
