import { Badge } from "@/components/ui/badge";
import { CrudTable } from "@/components/crud-table";
import { SubHeading, TabbedPage, cell, useOptions } from "@/components/settings-kit";

export function HotspotSettings() {
  const ifaces = useOptions("interface");
  const pools = useOptions("ip/pool");
  const serverProfiles = useOptions("ip/hotspot/profile");
  const userProfiles = useOptions("ip/hotspot/user/profile");
  const servers = useOptions("ip/hotspot");

  return (
    <TabbedPage
      title="Hotspot"
      description="Guest portal: a login page, vouchers and per-user limits for a guest network."
      tabs={[
        {
          id: "servers",
          label: "Portals",
          content: (
            <>
              <CrudTable
                path="ip/hotspot"
                noun="Hotspot Portal"
                emptyText="Create a portal on your guest network's interface. Tip: the RouterOS hotspot setup wizard also creates DNS and NAT rules."
                columns={[
                  { key: "name", header: "Name", className: "font-medium" },
                  { key: "interface", header: "Interface" },
                  { key: "address-pool", header: "Pool", render: (r) => cell.muted(r["address-pool"]) },
                  { key: "profile", header: "Profile" },
                ]}
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "interface", label: "Guest interface", type: "select", options: ifaces, required: true },
                  { name: "address-pool", label: "Address pool", type: "select", options: pools },
                  { name: "profile", label: "Portal profile", type: "select", options: serverProfiles },
                  { name: "idle-timeout", label: "Idle timeout", placeholder: "5m" },
                  { name: "addresses-per-mac", label: "Addresses per device", type: "number" },
                ]}
              />
              <SubHeading title="Portal profiles" />
              <CrudTable
                path="ip/hotspot/profile"
                noun="Portal Profile"
                showToggle={false}
                columns={[
                  { key: "name", header: "Name", className: "font-medium" },
                  { key: "hotspot-address", header: "Portal address", className: "tabular-nums" },
                  { key: "dns-name", header: "DNS name" },
                  { key: "login-by", header: "Login methods", render: (r) => cell.muted(r["login-by"]) },
                ]}
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "hotspot-address", label: "Portal address" },
                  { name: "dns-name", label: "DNS name", placeholder: "wifi.guest" },
                  { name: "login-by", label: "Login methods", placeholder: "http-chap,cookie,trial" },
                  { name: "html-directory", label: "Login page folder", placeholder: "hotspot" },
                  { name: "rate-limit", label: "Rate limit", placeholder: "5M/5M" },
                ]}
              />
            </>
          ),
        },
        {
          id: "users",
          label: "Users & Vouchers",
          content: (
            <>
              <CrudTable
                path="ip/hotspot/user"
                noun="Hotspot User"
                searchKeys={["name", "profile", "comment"]}
                columns={[
                  { key: "name", header: "Username / code", className: "font-medium font-mono" },
                  { key: "profile", header: "Plan", render: (r) => <Badge variant="secondary">{r.profile ?? "default"}</Badge> },
                  { key: "limit-uptime", header: "Time limit", render: (r) => cell.muted(r["limit-uptime"]) },
                  { key: "limit-bytes-total", header: "Data limit", render: (r) => cell.muted(r["limit-bytes-total"]) },
                  { key: "uptime", header: "Used", render: (r) => cell.muted(r.uptime) },
                  { key: "comment", header: "Note", render: (r) => cell.muted(r.comment) },
                ]}
                fields={[
                  { name: "name", label: "Username or voucher code", required: true },
                  { name: "password", label: "Password", type: "password" },
                  { name: "profile", label: "Plan", type: "select", options: userProfiles },
                  { name: "server", label: "Portal", type: "select", options: ["all", ...servers] },
                  { name: "limit-uptime", label: "Time limit", placeholder: "1d" },
                  { name: "limit-bytes-total", label: "Data limit (bytes)", placeholder: "1G" },
                  { name: "mac-address", label: "Bind to MAC" },
                  { name: "comment", label: "Note" },
                ]}
              />
              <SubHeading title="Plans" description="User profiles with speed limits and session rules." />
              <CrudTable
                path="ip/hotspot/user/profile"
                noun="Plan"
                showToggle={false}
                columns={[
                  { key: "name", header: "Name", className: "font-medium" },
                  { key: "rate-limit", header: "Speed", render: (r) => cell.muted(r["rate-limit"]) },
                  { key: "shared-users", header: "Devices per user" },
                  { key: "session-timeout", header: "Session timeout", render: (r) => cell.muted(r["session-timeout"]) },
                ]}
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "rate-limit", label: "Speed limit (up/down)", placeholder: "2M/10M" },
                  { name: "shared-users", label: "Devices per user", type: "number" },
                  { name: "session-timeout", label: "Session timeout" },
                  { name: "idle-timeout", label: "Idle timeout" },
                  { name: "address-list", label: "Add users to address list" },
                ]}
              />
            </>
          ),
        },
        {
          id: "active",
          label: "Connected Guests",
          content: (
            <>
              <CrudTable
                path="ip/hotspot/active"
                noun="Guest"
                readOnly
                refetchInterval={10_000}
                columns={[
                  { key: "user", header: "User", className: "font-medium" },
                  { key: "address", header: "IP", className: "tabular-nums" },
                  { key: "mac-address", header: "MAC", className: "font-mono text-xs" },
                  { key: "uptime", header: "Uptime", render: (r) => cell.muted(r.uptime) },
                  { key: "bytes-in", header: "In / Out", render: (r) => cell.muted(`${r["bytes-in"] ?? 0} / ${r["bytes-out"] ?? 0}`) },
                ]}
              />
              <SubHeading title="Hosts" description="Every device seen on the guest network, logged in or not." />
              <CrudTable
                path="ip/hotspot/host"
                noun="Host"
                readOnly
                columns={[
                  { key: "mac-address", header: "MAC", className: "font-mono text-xs" },
                  { key: "address", header: "IP", className: "tabular-nums" },
                  { key: "authorized", header: "Logged in", render: (r) => (r.authorized === "true" ? "Yes" : "No") },
                  { key: "idle-time", header: "Idle", render: (r) => cell.muted(r["idle-time"]) },
                ]}
              />
            </>
          ),
        },
        {
          id: "access",
          label: "Bypass & Walled Garden",
          content: (
            <>
              <CrudTable
                path="ip/hotspot/ip-binding"
                noun="IP Binding"
                emptyText="Let specific devices skip the login page, or block them."
                columns={[
                  { key: "mac-address", header: "MAC", className: "font-mono text-xs" },
                  { key: "address", header: "IP", className: "tabular-nums" },
                  { key: "type", header: "Type", render: (r) => <Badge variant="secondary">{r.type ?? "regular"}</Badge> },
                  { key: "comment", header: "Note", render: (r) => cell.muted(r.comment) },
                ]}
                defaults={{ type: "bypassed" }}
                fields={[
                  { name: "mac-address", label: "MAC address" },
                  { name: "address", label: "IP address" },
                  { name: "type", label: "Type", type: "select", options: ["bypassed", "blocked", "regular"], required: true },
                  { name: "comment", label: "Note" },
                ]}
              />
              <SubHeading title="Walled garden" description="Sites guests can reach before logging in." />
              <CrudTable
                path="ip/hotspot/walled-garden"
                noun="Allowed Site"
                columns={[
                  { key: "dst-host", header: "Host", className: "font-medium" },
                  { key: "action", header: "Action" },
                  { key: "comment", header: "Note", render: (r) => cell.muted(r.comment) },
                ]}
                defaults={{ action: "allow" }}
                fields={[
                  { name: "dst-host", label: "Host", placeholder: "*.example.com", required: true },
                  { name: "action", label: "Action", type: "select", options: ["allow", "deny"] },
                  { name: "comment", label: "Note" },
                ]}
              />
            </>
          ),
        },
      ]}
    />
  );
}
