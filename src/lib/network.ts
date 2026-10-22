import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRosList } from "@/hooks/use-ros";
import { ros, type RosRecord } from "./api";
import { isTrue } from "./utils";
import { identify, loadOui, type DeviceIdentity } from "./device-id";

/**
 * RouterOS 7.13+ ships the new `wifi` package; older devices use `wireless`.
 * Detect which menu exists so the UI works with either.
 */
export function useWifiMenu() {
  return useQuery({
    queryKey: ["ros", "wifi-menu"],
    staleTime: Infinity,
    queryFn: async (): Promise<"interface/wifi" | "interface/wireless" | null> => {
      for (const path of ["interface/wifi", "interface/wireless"] as const) {
        try {
          await ros.list(path);
          return path;
        } catch {
          // try the next one
        }
      }
      return null;
    },
  });
}

/** Figures out which interface faces the internet. */
export function useWan() {
  const dhcp = useRosList("ip/dhcp-client", { refetchInterval: 15_000 });
  const pppoe = useRosList("interface/pppoe-client", { refetchInterval: 15_000 });
  const addresses = useRosList("ip/address", { refetchInterval: 15_000 });

  return useMemo(() => {
    const ppp = pppoe.data?.find((p) => !isTrue(p.disabled));
    const dh = dhcp.data?.find((d) => !isTrue(d.disabled));
    const iface = ppp?.name ?? dh?.interface ?? "ether1";
    const addr = addresses.data?.find((a) => a.interface === iface)?.address ?? dh?.address;
    const up = ppp ? isTrue(ppp.running) || ppp.status === "connected" : dh?.status === "bound";
    return {
      interface: iface,
      kind: ppp ? ("PPPoE" as const) : dh ? ("DHCP" as const) : ("Static" as const),
      address: addr?.split("/")[0],
      gateway: dh?.gateway,
      dns: [dh?.["primary-dns"], dh?.["secondary-dns"]].filter(Boolean) as string[],
      up: up ?? false,
      expires: dh?.["expires-after"],
      isLoading: dhcp.isLoading || pppoe.isLoading,
    };
  }, [dhcp.data, pppoe.data, addresses.data, dhcp.isLoading, pppoe.isLoading]);
}

export interface Client {
  mac: string;
  name: string;
  hostName?: string;
  ip?: string;
  online: boolean;
  wireless: boolean;
  /** Physical port / radio the client is attached to. */
  port?: string;
  network?: string;
  signal?: number;
  txRate?: string;
  rxRate?: string;
  uptime?: string;
  lastSeen?: string;
  lease?: RosRecord;
  fixedIp: boolean;
  blocked: boolean;
  identity: DeviceIdentity;
}

/** MAC vendor lookup, loaded once per session. */
export function useOui() {
  return useQuery({ queryKey: ["oui"], queryFn: loadOui, staleTime: Infinity, gcTime: Infinity });
}

export function useClients(refetchInterval = 10_000) {
  const wifiMenu = useWifiMenu();
  const leases = useRosList("ip/dhcp-server/lease", { refetchInterval });
  const arp = useRosList("ip/arp", { refetchInterval });
  const hosts = useRosList("interface/bridge/host", { refetchInterval });
  const blocked = useRosList("ip/firewall/address-list");
  const reg = useRosList(`${wifiMenu.data}/registration-table`, {
    refetchInterval,
    enabled: !!wifiMenu.data,
  });
  const wan = useWan();
  const oui = useOui();

  const clients = useMemo(() => {
    const map = new Map<string, Client>();
    const get = (mac: string) => {
      const key = mac.toUpperCase();
      let c = map.get(key);
      if (!c) {
        c = { mac: key, name: key, online: false, wireless: false, fixedIp: false, blocked: false, identity: { kind: "unknown", privateMac: false } };
        map.set(key, c);
      }
      return c;
    };

    for (const l of leases.data ?? []) {
      if (!l["mac-address"]) continue;
      const c = get(l["mac-address"]);
      c.lease = l;
      c.ip = l["active-address"] ?? l.address;
      c.hostName = l["host-name"];
      c.name = l.comment || l["host-name"] || c.mac;
      c.network = l.server;
      c.fixedIp = !isTrue(l.dynamic);
      c.lastSeen = l["last-seen"];
      c.online = l.status === "bound";
    }
    for (const a of arp.data ?? []) {
      if (!a["mac-address"] || a.interface === wan.interface) continue;
      const c = get(a["mac-address"]);
      c.ip ??= a.address;
      c.port ??= a.interface;
      if (isTrue(a.complete)) c.online = true;
    }
    for (const h of hosts.data ?? []) {
      if (!h["mac-address"] || isTrue(h.local)) continue;
      const c = map.get(h["mac-address"].toUpperCase());
      if (c) c.port = h["on-interface"];
    }
    for (const r of reg.data ?? []) {
      if (!r["mac-address"]) continue;
      const c = get(r["mac-address"]);
      c.wireless = true;
      c.online = true;
      c.port = r.interface;
      c.signal = Number(r.signal ?? r["signal-strength"]?.split("@")[0]);
      c.txRate = r["tx-rate"];
      c.rxRate = r["rx-rate"];
      c.uptime = r.uptime;
    }
    const blockedIps = new Set(
      (blocked.data ?? []).filter((b) => b.list === BLOCK_LIST && !isTrue(b.disabled)).map((b) => b.address),
    );
    for (const c of map.values()) {
      if (c.port && /^(wifi|wlan)/.test(c.port)) c.wireless = true;
      c.blocked = !!c.ip && blockedIps.has(c.ip);
      c.identity = identify({ mac: c.mac, hostName: c.hostName, alias: c.lease?.comment, wireless: c.wireless }, oui.data);
    }
    return [...map.values()].sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  }, [leases.data, arp.data, hosts.data, reg.data, blocked.data, wan.interface, oui.data]);

  return { clients, isLoading: leases.isLoading || arp.isLoading };
}

export const BLOCK_LIST = "blocked";

/** Signal (dBm) to a 0-4 bar score. */
export function signalBars(dbm?: number) {
  if (dbm === undefined || Number.isNaN(dbm)) return 0;
  if (dbm >= -55) return 4;
  if (dbm >= -65) return 3;
  if (dbm >= -75) return 2;
  return 1;
}
