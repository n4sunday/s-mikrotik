export { cn } from "cn"

export function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return "Unexpected error";
}

/** RouterOS returns booleans as "true"/"false" (or "yes"/"no"). */
export function isTrue(v: string | undefined): boolean {
  return v === "true" || v === "yes";
}

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : digits)} ${units[i]}`;
}

export function formatBps(bitsPerSecond: number): string {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return "0 bps";
  const units = ["bps", "Kbps", "Mbps", "Gbps"];
  const i = Math.min(Math.floor(Math.log(bitsPerSecond) / Math.log(1000)), units.length - 1);
  return `${(bitsPerSecond / 1000 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Shorten a RouterOS duration like "3d7h42m10s" to its two most significant parts. */
export function formatUptime(v: string | undefined): string {
  if (!v) return "—";
  const parts = v.match(/\d+[wdhms]/g);
  if (!parts) return v;
  return parts.slice(0, 2).join(" ");
}

export function ipToInt(ip: string) {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}
export function intToIp(n: number) {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
}

/** "192.168.30.1/24" -> network, prefix and a sensible DHCP range. */
export function parseCidr(cidr: string) {
  const m = cidr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m) return null;
  const prefix = Number(m[2]);
  if (prefix < 8 || prefix > 30) return null;
  const host = ipToInt(m[1]);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (host & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const size = broadcast - network - 1;
  // Leave the lower part of the subnet for static assignments.
  const start = network + Math.max(2, Math.floor(size * 0.4));
  return {
    host: m[1],
    prefix,
    network: `${intToIp(network)}/${prefix}`,
    range: `${intToIp(start)}-${intToIp(broadcast - 1)}`,
  };
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "net";
}

/** First host address in `cidr` not present in `used` (bare IPs or CIDRs). */
export function nextFreeIp(cidr: string, used: string[]): string | null {
  const c = parseCidr(cidr);
  if (!c) return null;
  const taken = new Set(used.map((u) => u.split("/")[0]));
  taken.add(c.host);
  const [net, prefix] = c.network.split("/");
  const start = ipToInt(net) + 1;
  const end = ipToInt(net) + 2 ** (32 - Number(prefix)) - 2;
  for (let n = start; n <= end; n++) {
    const ip = intToIp(n);
    if (!taken.has(ip)) return ip;
  }
  return null;
}
