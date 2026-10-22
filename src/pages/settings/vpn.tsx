import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import QRCode from "qrcode";
import { CopyIcon, DownloadIcon, PlusIcon, ShieldCheckIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmButton, EmptyState, LoadingBlock, Panel, StatusDot } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import { SettingsPanel, SubHeading, TabbedPage, YES_NO, cell, useOptions } from "@/components/settings-kit";
import { ResourceSheet, type FieldDef } from "@/components/resource-form";
import { useRosItem, useRosList } from "@/hooks/use-ros";
import { generateWgKeypair, ros, saveTextFile, type RosRecord } from "@/lib/api";
import { useWan } from "@/lib/network";
import { errorMessage, formatBytes, isTrue, nextFreeIp, parseCidr } from "@/lib/utils";

const MENUS = ["interface/wireguard", "interface/wireguard/peers", "ip/address", "ip/firewall/filter", "interface"];

const SERVER_FIELDS: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "listen-port", label: "Listen port (UDP)", type: "number", required: true },
  { name: "address", label: "Tunnel gateway / subnet", placeholder: "10.66.0.1/24", required: true, description: "Clients get addresses from this subnet." },
];

function WireGuardTab() {
  const qc = useQueryClient();
  const wan = useWan();
  const cloud = useRosItem("ip/cloud");
  const servers = useRosList("interface/wireguard");
  const peers = useRosList("interface/wireguard/peers", { refetchInterval: 10_000 });
  const addresses = useRosList("ip/address");
  const [creatingServer, setCreatingServer] = useState(false);
  const [addingTo, setAddingTo] = useState<RosRecord | null>(null);
  const [clientConfig, setClientConfig] = useState<{ name: string; config: string } | null>(null);

  const refresh = () => MENUS.forEach((p) => qc.invalidateQueries({ queryKey: ["ros", p] }));
  const endpointHost = (isTrue(cloud.data?.["ddns-enabled"]) && cloud.data?.["dns-name"]) || wan.address || "";

  async function createServer(_b: Record<string, string>, v: Record<string, string>) {
    if (!parseCidr(v.address)) {
      toast.error("Subnet must look like 10.66.0.1/24");
      throw new Error("invalid");
    }
    try {
      await ros.create("interface/wireguard", { name: v.name, "listen-port": v["listen-port"] });
      await ros.create("ip/address", { address: v.address, interface: v.name, comment: `${v.name} VPN` });
      const filters = await ros.list("ip/firewall/filter");
      const firstInput = filters.find((f) => f.chain === "input" && !isTrue(f.dynamic));
      await ros.create("ip/firewall/filter", {
        chain: "input",
        action: "accept",
        protocol: "udp",
        "dst-port": v["listen-port"],
        comment: `Allow WireGuard ${v.name}`,
        ...(firstInput ? { "place-before": firstInput[".id"] } : {}),
      });
      toast.success(`VPN server ${v.name} created`);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    } finally {
      refresh();
    }
  }

  async function addClient(_b: Record<string, string>, v: Record<string, string>) {
    const server = addingTo!;
    const subnet = addresses.data?.find((a) => a.interface === server.name)?.address;
    if (!subnet) {
      toast.error(`Give ${server.name} an IP address first`);
      throw new Error("no subnet");
    }
    const used = (peers.data ?? []).filter((p) => p.interface === server.name).flatMap((p) => (p["allowed-address"] ?? "").split(","));
    const ip = nextFreeIp(subnet, used);
    if (!ip) {
      toast.error("No free addresses left in the VPN subnet");
      throw new Error("full");
    }
    try {
      const [priv, pub] = await generateWgKeypair();
      await ros.create("interface/wireguard/peers", {
        interface: server.name,
        "public-key": pub,
        "allowed-address": `${ip}/32`,
        comment: v.name,
      });
      const gateway = subnet.split("/")[0];
      const lanNets = (addresses.data ?? [])
        .filter((a) => !isTrue(a.dynamic) && a.interface !== wan.interface && a.interface !== server.name)
        .map((a) => parseCidr(a.address ?? "")?.network)
        .filter(Boolean);
      const allowed = v.mode === "split" ? [parseCidr(subnet)!.network, ...lanNets].join(", ") : "0.0.0.0/0, ::/0";
      const config = [
        "[Interface]",
        `PrivateKey = ${priv}`,
        `Address = ${ip}/32`,
        `DNS = ${gateway}`,
        "",
        "[Peer]",
        `PublicKey = ${server["public-key"]}`,
        `Endpoint = ${v.endpoint}:${server["listen-port"]}`,
        `AllowedIPs = ${allowed}`,
        "PersistentKeepalive = 25",
        "",
      ].join("\n");
      setClientConfig({ name: v.name, config });
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    } finally {
      refresh();
    }
  }

  async function remove(path: string, id: string) {
    try {
      await ros.remove(path, id);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      refresh();
    }
  }

  if (servers.isLoading) return <LoadingBlock />;

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Fast, modern VPN. Recommended for phones and laptops.</p>
        <Button size="sm" onClick={() => setCreatingServer(true)}>
          <PlusIcon /> Create WireGuard Server
        </Button>
      </div>

      {servers.data?.length === 0 && (
        <EmptyState icon={<ShieldCheckIcon />} title="No VPN server yet" description="Create a WireGuard server, then add a client for each phone or laptop." />
      )}

      <div className="space-y-6">
        {servers.data?.map((s) => {
          const subnet = addresses.data?.find((a) => a.interface === s.name)?.address;
          const list = peers.data?.filter((p) => p.interface === s.name) ?? [];
          return (
            <Panel
              key={s[".id"]}
              title={
                <span className="flex items-center gap-2">
                  <StatusDot status={isTrue(s.disabled) ? "disabled" : isTrue(s.running) ? "online" : "offline"} />
                  {s.name}
                  <span className="font-normal text-muted-foreground">
                    · UDP {s["listen-port"]} · {subnet ?? "no address"}
                  </span>
                </span>
              }
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={() => setAddingTo(s)}>
                    <UserPlusIcon /> Add Client
                  </Button>
                  <ConfirmButton title={`Delete ${s.name}?`} description="Removes the interface and all of its clients." onConfirm={() => remove("interface/wireguard", s[".id"])} />
                </>
              }
              bodyClassName="p-0"
            >
              <div className="flex items-center gap-2 border-b px-4 py-2.5 text-muted-foreground">
                Server public key
                <code className="truncate rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{s["public-key"]}</code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => navigator.clipboard.writeText(s["public-key"] ?? "").then(() => toast.success("Copied"))}
                >
                  <CopyIcon />
                </Button>
              </div>
              {list.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground">No clients yet.</div>
              ) : (
                <table className="w-full">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pl-4 font-medium">Client</th>
                      <th className="font-medium">Address</th>
                      <th className="font-medium">Endpoint</th>
                      <th className="font-medium">Last handshake</th>
                      <th className="text-right font-medium">RX / TX</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p) => {
                      const online = !!p["last-handshake"] && /^(\d+s|[0-2]m)/.test(p["last-handshake"]);
                      return (
                        <tr key={p[".id"]} className="group border-b last:border-0">
                          <td className="py-2.5 pl-4">
                            <span className="flex items-center gap-2 font-medium">
                              <StatusDot status={isTrue(p.disabled) ? "disabled" : online ? "online" : "offline"} />
                              {p.comment || p.name || "Client"}
                            </span>
                          </td>
                          <td className="tabular-nums">{p["allowed-address"]}</td>
                          <td className="text-muted-foreground tabular-nums">
                            {p["current-endpoint-address"] ? `${p["current-endpoint-address"]}:${p["current-endpoint-port"]}` : "—"}
                          </td>
                          <td className="text-muted-foreground">{p["last-handshake"] ?? "Never"}</td>
                          <td className="text-right text-muted-foreground tabular-nums">
                            {formatBytes(Number(p.rx ?? 0))} / {formatBytes(Number(p.tx ?? 0))}
                          </td>
                          <td className="pr-3 text-right">
                            <span className="opacity-0 transition-opacity group-hover:opacity-100">
                              <ConfirmButton title="Remove this client?" description="It will no longer be able to connect." onConfirm={() => remove("interface/wireguard/peers", p[".id"])} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
          );
        })}
      </div>

      <ResourceSheet
        open={creatingServer}
        onOpenChange={setCreatingServer}
        title="Create VPN Server"
        description="Creates a WireGuard interface, assigns its subnet and opens the UDP port on the firewall."
        fields={SERVER_FIELDS}
        defaults={{ name: `wg${servers.data?.length ?? 0}`, "listen-port": "13231", address: "10.66.0.1/24" }}
        onSubmit={createServer}
      />
      <ResourceSheet
        open={!!addingTo}
        onOpenChange={(o) => !o && setAddingTo(null)}
        title={`Add client to ${addingTo?.name ?? ""}`}
        description="Keys are generated on this computer. The private key is never stored on the router."
        fields={[
          { name: "name", label: "Client name", placeholder: "Alice's phone", required: true },
          { name: "endpoint", label: "Router address (from the internet)", required: true, description: "Your public IP or DDNS name." },
          {
            name: "mode",
            label: "Route through VPN",
            type: "select",
            required: true,
            options: [
              { label: "All traffic (full tunnel)", value: "full" },
              { label: "Only home networks (split tunnel)", value: "split" },
            ],
          },
        ]}
        defaults={{ endpoint: endpointHost, mode: "full" }}
        submitLabel="Create Client"
        onSubmit={addClient}
      />
      <ClientConfigDialog value={clientConfig} onClose={() => setClientConfig(null)} />
    </>
  );
}

function ClientConfigDialog({ value, onClose }: { value: { name: string; config: string } | null; onClose: () => void }) {
  const [qr, setQr] = useState<string>("");
  useEffect(() => {
    setQr("");
    if (value) QRCode.toDataURL(value.config, { margin: 1, width: 240 }).then(setQr, () => setQr(""));
  }, [value]);

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{value?.name} is ready</DialogTitle>
          <DialogDescription>
            Scan the QR code with the WireGuard app, or save the config file. This is the only time the private key is shown.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-4">
          {qr && <img src={qr} alt="WireGuard config QR code" className="size-48 shrink-0 rounded-lg bg-white p-1" />}
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">{value?.config}</pre>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(value!.config).then(() => toast.success("Copied"))}>
            <CopyIcon /> Copy
          </Button>
          <Button onClick={() => saveTextFile(`${value!.name.replace(/[^\w-]+/g, "_")}.conf`, value!.config)}>
            <DownloadIcon /> Save .conf
          </Button>
        </div>
        <Badge variant="outline" className="w-fit text-muted-foreground">Keep this file private</Badge>
      </DialogContent>
    </Dialog>
  );
}

export function VpnSettings() {
  return (
    <TabbedPage
      title="VPN"
      description="Remote access for your devices and site-to-site links to other networks."
      tabs={[
        { id: "wireguard", label: "WireGuard", content: <WireGuardTab /> },
        { id: "remote", label: "Remote Access", content: <RemoteAccessTab /> },
        { id: "users", label: "VPN Users", content: <VpnUsersTab /> },
        { id: "s2s", label: "Site-to-Site (IPsec)", content: <IpsecTab /> },
        { id: "clients", label: "VPN Clients", content: <VpnClientsTab /> },
      ]}
    />
  );
}

function RemoteAccessTab() {
  const profiles = useOptions("ppp/profile");
  const certs = useOptions("certificate");
  const auth = { name: "authentication", label: "Authentication", placeholder: "mschap2", description: "pap, chap, mschap1, mschap2" } as const;
  return (
    <>
      <SettingsPanel
        path="interface/l2tp-server/server"
        title="L2TP / IPsec"
        description="Built into iOS, macOS, Android and Windows. Users sign in with a VPN user below."
        fields={[
          { name: "enabled", label: "Enabled", type: "switch" },
          { name: "use-ipsec", label: "IPsec encryption", type: "select", options: ["yes", "no", "required"] },
          { name: "ipsec-secret", label: "Pre-shared key", type: "password" },
          { name: "default-profile", label: "Default profile", type: "select", options: profiles },
          auth,
        ]}
      />
      <SettingsPanel
        path="interface/sstp-server/server"
        title="SSTP"
        description="VPN over HTTPS (TCP 443). Works through strict firewalls."
        fields={[
          { name: "enabled", label: "Enabled", type: "switch" },
          { name: "port", label: "Port", type: "number" },
          { name: "certificate", label: "Certificate", type: "select", options: certs },
          { name: "default-profile", label: "Default profile", type: "select", options: profiles },
          auth,
        ]}
      />
      <SettingsPanel
        path="interface/ovpn-server/server"
        title="OpenVPN"
        fields={[
          { name: "enabled", label: "Enabled", type: "switch" },
          { name: "port", label: "Port", type: "number" },
          { name: "protocol", label: "Protocol", type: "select", options: ["tcp", "udp"] },
          { name: "mode", label: "Mode", type: "select", options: ["ip", "ethernet"] },
          { name: "certificate", label: "Certificate", type: "select", options: certs },
          { name: "require-client-certificate", label: "Require client certificate", type: "switch" },
          { name: "cipher", label: "Ciphers", placeholder: "aes256-gcm" },
          { name: "default-profile", label: "Default profile", type: "select", options: profiles },
        ]}
      />
      <SettingsPanel
        path="interface/pptp-server/server"
        title="PPTP (legacy)"
        description="Insecure. Only enable for old devices that support nothing else."
        fields={[
          { name: "enabled", label: "Enabled", type: "switch" },
          { name: "default-profile", label: "Default profile", type: "select", options: profiles },
        ]}
      />
    </>
  );
}

function VpnUsersTab() {
  const profiles = useOptions("ppp/profile");
  const pools = useOptions("ip/pool");
  return (
    <>
      <CrudTable
        path="ppp/secret"
        noun="VPN User"
        searchKeys={["name", "service", "remote-address", "comment"]}
        columns={[
          { key: "name", header: "Username", className: "font-medium" },
          { key: "service", header: "Service", render: (r) => <span className="uppercase">{r.service ?? "any"}</span> },
          { key: "profile", header: "Profile" },
          { key: "remote-address", header: "Assigned IP", render: (r) => cell.muted(r["remote-address"]) },
          { key: "last-logged-out", header: "Last seen", render: (r) => cell.muted(r["last-logged-out"]) },
        ]}
        defaults={{ service: "any", profile: "default-encryption" }}
        fields={[
          { name: "name", label: "Username", required: true },
          { name: "password", label: "Password", type: "password" },
          { name: "service", label: "Allowed service", type: "select", options: ["any", "l2tp", "sstp", "ovpn", "pptp", "pppoe"] },
          { name: "profile", label: "Profile", type: "select", options: profiles },
          { name: "local-address", label: "Router-side address", placeholder: "From profile" },
          { name: "remote-address", label: "Client address", placeholder: "From profile pool" },
          { name: "routes", label: "Routes to add", placeholder: "192.168.50.0/24 10.0.0.2" },
          { name: "comment", label: "Description" },
        ]}
      />
      <SubHeading title="Profiles" description="Address pools, DNS and encryption shared by users." />
      <CrudTable
        path="ppp/profile"
        noun="Profile"
        showToggle={false}
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "local-address", header: "Local address", render: (r) => cell.muted(r["local-address"]) },
          { key: "remote-address", header: "Client pool", render: (r) => cell.muted(r["remote-address"]) },
          { key: "dns-server", header: "DNS", render: (r) => cell.muted(r["dns-server"]) },
          { key: "use-encryption", header: "Encryption", render: (r) => cell.muted(r["use-encryption"]) },
        ]}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "local-address", label: "Router-side address" },
          { name: "remote-address", label: "Client address pool", type: "select", options: pools },
          { name: "dns-server", label: "DNS servers" },
          { name: "use-encryption", label: "Encryption", type: "select", options: ["default", "yes", "no", "required"] },
          { name: "only-one", label: "One session per user", type: "select", options: ["default", ...YES_NO] },
          { name: "rate-limit", label: "Rate limit", placeholder: "10M/10M" },
          { name: "comment", label: "Description" },
        ]}
      />
      <SubHeading title="Connected now" />
      <CrudTable
        path="ppp/active"
        noun="Active Session"
        readOnly
        refetchInterval={10_000}
        columns={[
          { key: "name", header: "User", className: "font-medium" },
          { key: "service", header: "Service", render: (r) => <span className="uppercase">{r.service}</span> },
          { key: "caller-id", header: "From", className: "tabular-nums" },
          { key: "address", header: "Address", className: "tabular-nums" },
          { key: "uptime", header: "Uptime", render: (r) => cell.muted(r.uptime) },
        ]}
      />
    </>
  );
}

function IpsecTab() {
  const peers = useOptions("ip/ipsec/peer");
  const profiles = useOptions("ip/ipsec/profile");
  const proposals = useOptions("ip/ipsec/proposal");
  return (
    <>
      <CrudTable
        path="ip/ipsec/peer"
        noun="Peer"
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "address", header: "Remote address", className: "tabular-nums" },
          { key: "exchange-mode", header: "Exchange" },
          { key: "profile", header: "Profile", render: (r) => cell.muted(r.profile) },
        ]}
        defaults={{ "exchange-mode": "ike2", profile: "default" }}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "address", label: "Remote address", placeholder: "203.0.113.10/32", required: true },
          { name: "exchange-mode", label: "Exchange mode", type: "select", options: ["ike2", "main", "aggressive"] },
          { name: "profile", label: "Profile", type: "select", options: profiles },
          { name: "passive", label: "Passive (wait for remote)", type: "switch" },
          { name: "comment", label: "Description" },
        ]}
      />
      <SubHeading title="Identities" description="How each peer authenticates." />
      <CrudTable
        path="ip/ipsec/identity"
        noun="Identity"
        columns={[
          { key: "peer", header: "Peer", className: "font-medium" },
          { key: "auth-method", header: "Method" },
          { key: "generate-policy", header: "Generate policy", render: (r) => cell.muted(r["generate-policy"]) },
        ]}
        defaults={{ "auth-method": "pre-shared-key" }}
        fields={[
          { name: "peer", label: "Peer", type: "select", options: peers, required: true },
          { name: "auth-method", label: "Method", type: "select", options: ["pre-shared-key", "digital-signature", "eap", "eap-radius"] },
          { name: "secret", label: "Pre-shared key", type: "password", when: (v) => v["auth-method"] === "pre-shared-key" },
          { name: "certificate", label: "Certificate", when: (v) => v["auth-method"] === "digital-signature" },
          { name: "generate-policy", label: "Generate policy", type: "select", options: ["no", "port-override", "port-strict"] },
        ]}
      />
      <SubHeading title="Policies" description="Which subnets are sent through the tunnel." />
      <CrudTable
        path="ip/ipsec/policy"
        noun="Policy"
        columns={[
          { key: "src-address", header: "Local subnet", className: "tabular-nums" },
          { key: "dst-address", header: "Remote subnet", className: "tabular-nums" },
          { key: "peer", header: "Peer" },
          { key: "action", header: "Action" },
          { key: "ph2-state", header: "State", render: (r) => cell.muted(r["ph2-state"]) },
        ]}
        defaults={{ tunnel: "true", action: "encrypt", proposal: "default" }}
        fields={[
          { name: "peer", label: "Peer", type: "select", options: peers, required: true },
          { name: "src-address", label: "Local subnet", required: true },
          { name: "dst-address", label: "Remote subnet", required: true },
          { name: "tunnel", label: "Tunnel mode", type: "switch" },
          { name: "action", label: "Action", type: "select", options: ["encrypt", "none", "discard"] },
          { name: "proposal", label: "Proposal", type: "select", options: proposals },
        ]}
      />
      <SubHeading title="Crypto" />
      <CrudTable
        path="ip/ipsec/proposal"
        noun="Proposal"
        showToggle={false}
        columns={[
          { key: "name", header: "Name", className: "font-medium" },
          { key: "enc-algorithms", header: "Encryption" },
          { key: "auth-algorithms", header: "Auth" },
          { key: "pfs-group", header: "PFS" },
        ]}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "enc-algorithms", label: "Encryption", placeholder: "aes-256-cbc,aes-256-gcm" },
          { name: "auth-algorithms", label: "Authentication", placeholder: "sha256" },
          { name: "pfs-group", label: "PFS group", type: "select", options: ["none", "modp2048", "ecp256", "ecp384"] },
          { name: "lifetime", label: "Lifetime", placeholder: "30m" },
        ]}
      />
    </>
  );
}

function VpnClientsTab() {
  const profiles = useOptions("ppp/profile");
  const common = (extra: FieldDef[] = []): FieldDef[] => [
    { name: "name", label: "Name", required: true },
    { name: "connect-to", label: "Server address", required: true },
    { name: "user", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    ...extra,
    { name: "profile", label: "Profile", type: "select", options: profiles },
    { name: "add-default-route", label: "Send all traffic through VPN", type: "switch" },
    { name: "comment", label: "Description" },
  ];
  const columns = [
    { key: "name", header: "Name", className: "font-medium" },
    { key: "connect-to", header: "Server", className: "tabular-nums" },
    { key: "user", header: "User" },
    {
      key: "running",
      header: "Status",
      render: (r: Record<string, string | undefined>) => (
        <span className="flex items-center gap-2">
          <StatusDot status={isTrue(r.running) ? "online" : isTrue(r.disabled) ? "disabled" : "offline"} />
          {isTrue(r.running) ? "Connected" : "Disconnected"}
        </span>
      ),
    },
  ];
  return (
    <>
      <SubHeading title="L2TP clients" />
      <CrudTable path="interface/l2tp-client" noun="L2TP Client" invalidate={["interface"]} columns={columns} fields={common([
        { name: "use-ipsec", label: "Use IPsec", type: "switch" },
        { name: "ipsec-secret", label: "IPsec secret", type: "password", when: (v) => v["use-ipsec"] === "true" },
      ])} />
      <SubHeading title="SSTP clients" />
      <CrudTable path="interface/sstp-client" noun="SSTP Client" invalidate={["interface"]} columns={columns} fields={common([
        { name: "port", label: "Port", type: "number" },
        { name: "verify-server-certificate", label: "Verify server certificate", type: "switch" },
      ])} />
      <SubHeading title="OpenVPN clients" />
      <CrudTable path="interface/ovpn-client" noun="OpenVPN Client" invalidate={["interface"]} columns={columns} fields={common([
        { name: "port", label: "Port", type: "number" },
        { name: "protocol", label: "Protocol", type: "select", options: ["tcp", "udp"] },
        { name: "certificate", label: "Client certificate" },
        { name: "cipher", label: "Cipher", placeholder: "aes256-gcm" },
      ])} />
    </>
  );
}
