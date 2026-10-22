import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BanIcon, LaptopIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmButton, EmptyState, LoadingBlock, PageHeader, Spinner, StatusDot } from "@/components/common";
import { ros } from "@/lib/api";
import { DeviceIcon } from "@/components/device-icon";
import { KIND_LABEL } from "@/lib/device-id";
import { BLOCK_LIST, signalBars, useClients, type Client } from "@/lib/network";
import { cn, errorMessage, formatUptime } from "@/lib/utils";

type Filter = "all" | "wired" | "wireless" | "offline";

export function SignalBars({ dbm }: { dbm?: number }) {
  const bars = signalBars(dbm);
  return (
    <span className="inline-flex items-end gap-px" title={dbm ? `${dbm} dBm` : undefined}>
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          className={cn("w-[3px] rounded-[1px]", b <= bars ? (bars <= 1 ? "bg-warning" : "bg-success") : "bg-muted-foreground/25")}
          style={{ height: 3 + b * 2.5 }}
        />
      ))}
    </span>
  );
}

export function ClientsPage() {
  const { clients, isLoading } = useClients();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedMac, setSelectedMac] = useState<string | null>(null);
  const selected = clients.find((c) => c.mac === selectedMac) ?? null;

  const counts = useMemo(
    () => ({
      all: clients.filter((c) => c.online).length,
      wired: clients.filter((c) => c.online && !c.wireless).length,
      wireless: clients.filter((c) => c.online && c.wireless).length,
      offline: clients.filter((c) => !c.online).length,
    }),
    [clients],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter === "offline" ? c.online : !c.online) return false;
      if (filter === "wired" && c.wireless) return false;
      if (filter === "wireless" && !c.wireless) return false;
      if (!q) return true;
      return [c.name, c.hostName, c.ip, c.mac, c.port].some((v) => v?.toLowerCase().includes(q));
    });
  }, [clients, filter, query]);

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <PageHeader title="Client Devices" description="Everything connected to your network, from DHCP, ARP and wireless registrations." />

      <div className="mb-3 flex items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All · {counts.all}</TabsTrigger>
            <TabsTrigger value="wired">Wired · {counts.wired}</TabsTrigger>
            <TabsTrigger value="wireless">WiFi · {counts.wireless}</TabsTrigger>
            <TabsTrigger value="offline">Offline · {counts.offline}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, IP or MAC" className="h-8 pl-8" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={<LaptopIcon />} title="No clients" description="Nothing matches this view." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>WiFi Rate</TableHead>
                <TableHead className="pr-4 text-right">{filter === "offline" ? "Last Seen" : "Uptime"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.mac} className="h-12 cursor-pointer" onClick={() => setSelectedMac(c.mac)}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <DeviceIcon identity={c.identity} wireless={c.wireless} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-medium">
                          <StatusDot status={c.blocked ? "offline" : c.online ? "online" : "disabled"} />
                          <span className="truncate">{c.name}</span>
                          {c.blocked && <Badge variant="destructive" className="h-4 text-[10px]">Blocked</Badge>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[c.identity.brand?.name ?? c.identity.vendor, c.hostName !== c.name ? c.hostName : undefined].filter(Boolean).join(" · ") ||
                            KIND_LABEL[c.identity.kind]}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {c.wireless && <SignalBars dbm={c.signal} />}
                      {c.port ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.ip ?? "—"}
                    {c.fixedIp && <Badge variant="secondary" className="ml-2 h-4 text-[10px]">Fixed</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.mac}</TableCell>
                  <TableCell>{c.network ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{c.txRate ? `${c.txRate} / ${c.rxRate}` : "—"}</TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground tabular-nums">
                    {filter === "offline" ? formatUptime(c.lastSeen) : formatUptime(c.uptime ?? c.lastSeen)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ClientSheet client={selected} onClose={() => setSelectedMac(null)} />
    </div>
  );
}

export function ClientSheet({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [alias, setAlias] = useState("");
  const [fixed, setFixed] = useState(false);
  const [ip, setIp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client) return;
    setAlias(client.lease?.comment ?? "");
    setFixed(client.fixedIp);
    setIp(client.ip ?? "");
    // Reset the form only when a different client is opened.
  }, [client?.mac]);

  const refresh = () => {
    for (const p of ["ip/dhcp-server/lease", "ip/firewall/address-list", "ip/firewall/filter"])
      qc.invalidateQueries({ queryKey: ["ros", p] });
  };

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const lease = client!.lease!;
    await run(async () => {
      if (fixed && !client!.fixedIp) await ros.run("ip/dhcp-server/lease/make-static", { ".id": lease[".id"] });
      const body: Record<string, string> = {};
      if (alias !== (lease.comment ?? "")) body.comment = alias;
      if (fixed && ip && ip !== lease.address) body.address = ip;
      if (Object.keys(body).length) await ros.update("ip/dhcp-server/lease", lease[".id"], body);
      onClose();
    }, "Client updated");
  }

  async function toggleBlock() {
    const c = client!;
    await run(async () => {
      const list = await ros.list("ip/firewall/address-list");
      if (c.blocked) {
        for (const e of list.filter((e) => e.list === BLOCK_LIST && e.address === c.ip)) {
          await ros.remove("ip/firewall/address-list", e[".id"]);
        }
        return;
      }
      await ros.create("ip/firewall/address-list", { list: BLOCK_LIST, address: c.ip, comment: c.name });
      // Make sure a drop rule for the list exists, ahead of the fasttrack/accept rules.
      const filters = await ros.list("ip/firewall/filter");
      if (!filters.some((f) => f["src-address-list"] === BLOCK_LIST && f.chain === "forward")) {
        const first = filters.find((f) => f.chain === "forward" && f.dynamic !== "true");
        await ros.create("ip/firewall/filter", {
          chain: "forward",
          action: "drop",
          "src-address-list": BLOCK_LIST,
          comment: "Block clients (managed by dashboard)",
          ...(first ? { "place-before": first[".id"] } : {}),
        });
      }
    }, c.blocked ? "Client unblocked" : "Client blocked");
  }

  async function forget() {
    await run(async () => {
      await ros.remove("ip/dhcp-server/lease", client!.lease![".id"]);
      onClose();
    }, "Lease removed");
  }

  const details: [string, string | undefined][] = client
    ? [
        ["Status", client.online ? "Online" : "Offline"],
        ["Device type", KIND_LABEL[client.identity.kind]],
        ["Manufacturer", client.identity.vendor ?? (client.identity.privateMac ? "Private MAC (randomized)" : "Unknown")],
        ["IP Address", client.ip],
        ["MAC Address", client.mac],
        ["Hostname", client.hostName],
        ["Connection", client.port],
        ["Network", client.network],
        ["Signal", client.signal ? `${client.signal} dBm` : undefined],
        ["TX / RX Rate", client.txRate ? `${client.txRate} / ${client.rxRate}` : undefined],
        ["Uptime", client.uptime],
        ["Lease expires", client.lease?.["expires-after"]],
      ]
    : [];

  return (
    <Sheet open={!!client} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        {client && (
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b">
              <div className="flex items-center gap-3">
                <DeviceIcon identity={client.identity} wireless={client.wireless} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{client.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1.5">
                    <StatusDot status={client.online ? "online" : "disabled"} />
                    {client.wireless ? "Wireless" : "Wired"} · {client.ip ?? "no IP"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <dl className="grid grid-cols-[120px_1fr] gap-y-2">
                {details
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="truncate text-right tabular-nums">{v}</dd>
                    </div>
                  ))}
              </dl>

              {client.lease ? (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="alias">Alias</Label>
                    <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={client.hostName ?? client.mac} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div>
                      <Label htmlFor="fixed">Fixed IP Address</Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">Always hand out the same IP (static lease)</p>
                    </div>
                    <Switch id="fixed" checked={fixed} onCheckedChange={setFixed} disabled={client.fixedIp} />
                  </div>
                  {fixed && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="ip">IP Address</Label>
                      <Input id="ip" value={ip} onChange={(e) => setIp(e.target.value)} className="tabular-nums" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-muted-foreground">
                  This device has no DHCP lease, so alias and fixed IP can't be set from here.
                </p>
              )}
            </div>

            <SheetFooter className="flex-row items-center justify-between border-t">
              <div className="flex gap-2">
                <Button variant={client.blocked ? "outline" : "destructive"} onClick={toggleBlock} disabled={busy || !client.ip}>
                  <BanIcon /> {client.blocked ? "Unblock" : "Block"}
                </Button>
                {client.lease && (
                  <ConfirmButton title="Forget this client?" description="Removes its DHCP lease." confirmLabel="Forget" onConfirm={forget}>
                    <Button variant="ghost" disabled={busy}>Forget</Button>
                  </ConfirmButton>
                )}
              </div>
              {client.lease && (
                <Button onClick={save} disabled={busy}>
                  {busy && <Spinner className="text-primary-foreground" />} Apply
                </Button>
              )}
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
