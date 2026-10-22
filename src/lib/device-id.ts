/**
 * Client fingerprinting: MAC vendor (IEEE OUI registry) + hostname hints
 * -> brand and device kind, so clients can show recognisable icons.
 */
import type { SimpleIcon } from "simple-icons";
import {
  siAcer, siApple, siArlo, siAsus, siBose, siCisco, siDell, siEpson, siEspressif, siFitbit, siGarmin, siGoogle,
  siHomeassistant, siHonor, siHp, siHuawei, siIntel, siLenovo, siLg, siMikrotik, siMotorola, siMsi, siNetgear,
  siNokia, siNvidia, siOneplus, siOppo, siPanasonic, siPhilipshue, siPlaystation, siQnap, siRaspberrypi, siRazer,
  siRing, siRoku, siSamsung, siSharp, siShelly, siSonos, siSony, siSynology, siTesla, siToshiba, siTplink,
  siUbiquiti, siValve, siVivo, siWyze, siXiaomi,
} from "simple-icons";

export type DeviceKind =
  | "phone" | "tablet" | "laptop" | "desktop" | "watch" | "tv" | "speaker" | "console" | "nas" | "printer"
  | "camera" | "light" | "plug" | "iot" | "network" | "server" | "unknown";

export interface Brand {
  id: string;
  name: string;
  icon?: SimpleIcon;
  /** The logo is a wide wordmark that is illegible in a square tile; show the name instead. */
  wordmark?: boolean;
  /** Kind to assume when the hostname gives no better hint. */
  kind?: DeviceKind;
}

interface BrandRule extends Brand {
  vendor?: RegExp;
  host?: RegExp;
}

const b = (rule: BrandRule) => rule;

/** Order matters: first match wins. */
const BRANDS: BrandRule[] = [
  b({ id: "apple", name: "Apple", icon: siApple, vendor: /^apple/i, host: /iphone|ipad|macbook|imac|mac-?mini|mac-?pro|mac-?studio|apple-?tv|homepod|apple-?watch/i }),
  b({ id: "wiz", name: "WiZ", kind: "light", vendor: /\bwiz\b/i, host: /^wiz[_-]/i }),
  b({ id: "philipshue", name: "Philips Hue", icon: siPhilipshue, kind: "light", vendor: /signify|philips lighting/i, host: /hue-?bridge|philips-hue/i }),
  b({ id: "playstation", name: "PlayStation", icon: siPlaystation, kind: "console", vendor: /sony interactive/i, host: /ps[345]|playstation/i }),
  b({ id: "sony", name: "Sony", icon: siSony, vendor: /^sony/i, host: /bravia|xperia/i }),
  b({ id: "samsung", wordmark: true, name: "Samsung", icon: siSamsung, vendor: /samsung/i, host: /galaxy|^sm-[a-z]\d|samsung/i }),
  b({ id: "google", name: "Google", icon: siGoogle, vendor: /^google/i, host: /pixel|chromecast|google-?(home|nest)|nest-/i }),
  b({ id: "xiaomi", name: "Xiaomi", icon: siXiaomi, vendor: /xiaomi/i, host: /xiaomi|redmi|poco|mi-?(band|box)|yeelink|zhimi|chuangmi|lumi-/i }),
  b({ id: "huawei", name: "Huawei", icon: siHuawei, vendor: /huawei/i, host: /huawei|^(p|mate)\d/i }),
  b({ id: "honor", wordmark: true, name: "Honor", icon: siHonor, vendor: /^honor/i, host: /honor/i }),
  b({ id: "oneplus", name: "OnePlus", icon: siOneplus, kind: "phone", vendor: /oneplus/i, host: /oneplus/i }),
  b({ id: "oppo", wordmark: true, name: "OPPO", icon: siOppo, kind: "phone", vendor: /^(oppo|guangdong oppo)/i, host: /oppo/i }),
  b({ id: "vivo", wordmark: true, name: "vivo", icon: siVivo, kind: "phone", vendor: /vivo mobile/i, host: /^vivo/i }),
  b({ id: "motorola", name: "Motorola", icon: siMotorola, kind: "phone", vendor: /motorola/i, host: /moto/i }),
  b({ id: "nokia", wordmark: true, name: "Nokia", icon: siNokia, vendor: /^(hmd|nokia)/i, host: /nokia/i }),
  b({ id: "lg", wordmark: true, name: "LG", icon: siLg, vendor: /^lg /i, host: /^lg|webos/i }),
  b({ id: "tplink", name: "TP-Link", icon: siTplink, vendor: /tp-?link/i, host: /^(tapo|kasa|hs1\d\d|kp\d\d\d)/i }),
  b({ id: "shelly", name: "Shelly", icon: siShelly, kind: "plug", vendor: /shelly|allterco/i, host: /^shelly/i }),
  b({ id: "tuya", name: "Tuya", kind: "plug", vendor: /tuya/i, host: /tuya|smartlife/i }),
  b({ id: "espressif", name: "Espressif", icon: siEspressif, kind: "iot", vendor: /espressif/i, host: /^esp(32|8266)?[-_]|tasmota|esphome/i }),
  b({ id: "raspberrypi", name: "Raspberry Pi", icon: siRaspberrypi, kind: "server", vendor: /raspberry/i, host: /raspberry|^rpi|^pi-?hole/i }),
  b({ id: "homeassistant", name: "Home Assistant", icon: siHomeassistant, kind: "server", host: /homeassistant|^hass/i }),
  b({ id: "synology", wordmark: true, name: "Synology", icon: siSynology, kind: "nas", vendor: /synology/i, host: /synology|diskstation|^ds\d{3}/i }),
  b({ id: "qnap", wordmark: true, name: "QNAP", icon: siQnap, kind: "nas", vendor: /qnap/i, host: /qnap/i }),
  b({ id: "sonos", wordmark: true, name: "Sonos", icon: siSonos, kind: "speaker", vendor: /\bsonos\b/i, host: /sonos/i }),
  b({ id: "bose", wordmark: true, name: "Bose", icon: siBose, kind: "speaker", vendor: /^bose/i, host: /bose/i }),
  b({ id: "amazon", name: "Amazon", vendor: /amazon/i, host: /echo|kindle|fire-?tv|amazon/i }),
  b({ id: "roku", wordmark: true, name: "Roku", icon: siRoku, kind: "tv", vendor: /^roku/i, host: /roku/i }),
  b({ id: "nintendo", name: "Nintendo", kind: "console", vendor: /nintendo/i, host: /nintendo|switch/i }),
  b({ id: "microsoft", name: "Microsoft", vendor: /^microsoft/i, host: /xbox|surface/i }),
  b({ id: "valve", name: "Valve", icon: siValve, kind: "console", vendor: /^valve/i, host: /steamdeck/i }),
  b({ id: "nvidia", name: "NVIDIA", icon: siNvidia, vendor: /nvidia/i, host: /shield/i }),
  b({ id: "tesla", name: "Tesla", icon: siTesla, vendor: /^tesla/i, host: /tesla/i }),
  b({ id: "ring", name: "Ring", icon: siRing, kind: "camera", vendor: /^ring/i, host: /^ring-/i }),
  b({ id: "arlo", wordmark: true, name: "Arlo", icon: siArlo, kind: "camera", vendor: /arlo/i, host: /arlo/i }),
  b({ id: "wyze", wordmark: true, name: "Wyze", icon: siWyze, kind: "camera", vendor: /wyze/i, host: /wyze/i }),
  b({ id: "hikvision", name: "Hikvision", kind: "camera", vendor: /hikvision/i, host: /hikvision/i }),
  b({ id: "garmin", wordmark: true, name: "Garmin", icon: siGarmin, kind: "watch", vendor: /garmin/i, host: /garmin/i }),
  b({ id: "fitbit", wordmark: true, name: "Fitbit", icon: siFitbit, kind: "watch", vendor: /fitbit/i, host: /fitbit/i }),
  b({ id: "ubiquiti", name: "Ubiquiti", icon: siUbiquiti, kind: "network", vendor: /ubiquiti/i, host: /^(ubnt|unifi|u6-|uap)/i }),
  b({ id: "mikrotik", name: "MikroTik", icon: siMikrotik, kind: "network", vendor: /routerboard|mikrotik/i, host: /mikrotik|^cap-?ax|^hap/i }),
  b({ id: "netgear", wordmark: true, name: "NETGEAR", icon: siNetgear, kind: "network", vendor: /netgear/i, host: /netgear|orbi/i }),
  b({ id: "cisco", name: "Cisco", icon: siCisco, kind: "network", vendor: /^cisco/i }),
  b({ id: "epson", wordmark: true, name: "Epson", icon: siEpson, kind: "printer", vendor: /seiko epson/i, host: /^epson/i }),
  b({ id: "hp", name: "HP", icon: siHp, vendor: /^(hewlett|hp )/i, host: /^hp[a-z0-9]{6}|^hp-/i }),
  b({ id: "dell", name: "Dell", icon: siDell, vendor: /^dell/i }),
  b({ id: "lenovo", wordmark: true, name: "Lenovo", icon: siLenovo, vendor: /lenovo/i, host: /lenovo|thinkpad/i }),
  b({ id: "asus", wordmark: true, name: "ASUS", icon: siAsus, vendor: /asustek/i, host: /^asus/i }),
  b({ id: "msi", name: "MSI", icon: siMsi, vendor: /micro-star/i }),
  b({ id: "acer", wordmark: true, name: "Acer", icon: siAcer, vendor: /^acer/i }),
  b({ id: "razer", name: "Razer", icon: siRazer, vendor: /^razer/i }),
  b({ id: "intel", wordmark: true, name: "Intel", icon: siIntel, vendor: /^intel/i }),
  b({ id: "panasonic", wordmark: true, name: "Panasonic", icon: siPanasonic, vendor: /panasonic/i }),
  b({ id: "sharp", wordmark: true, name: "Sharp", icon: siSharp, vendor: /^sharp/i }),
  b({ id: "toshiba", wordmark: true, name: "Toshiba", icon: siToshiba, vendor: /toshiba/i }),
];

/** Hostname / alias patterns -> kind, checked before brand defaults. */
const KIND_HINTS: [RegExp, DeviceKind][] = [
  [/iphone|galaxy-?[asmz]|^sm-[asmgn]|pixel|android|phone|redmi|oneplus|moto/i, "phone"],
  [/ipad|tab|kindle/i, "tablet"],
  [/watch/i, "watch"],
  [/macbook|laptop|notebook|thinkpad|xps|zenbook|surface/i, "laptop"],
  [/imac|mac-?mini|mac-?studio|desktop|^pc|-pc$|workstation|^win/i, "desktop"],
  [/apple-?tv|bravia|roku|chromecast|fire-?tv|shield|webos|tv/i, "tv"],
  [/homepod|sonos|echo|speaker|google-?home|nest-?(mini|audio)/i, "speaker"],
  [/ps[345]|playstation|xbox|nintendo|switch|steamdeck/i, "console"],
  [/nas|synology|diskstation|qnap|truenas|unraid/i, "nas"],
  [/printer|^brn|^epson|^hp[a-z0-9]{6}|laserjet|officejet|canon/i, "printer"],
  [/cam|ipc|doorbell|ring-|nvr|dvr/i, "camera"],
  [/wiz|hue|bulb|lamp|light|yeelink|led/i, "light"],
  [/plug|socket|shelly|tasmota|kasa|tapo|switch/i, "plug"],
  [/esp|iot|thermo|sensor|vacuum|roborock|zhimi|purifier|tuya/i, "iot"],
  [/server|proxmox|^pve|nuc|raspberry|^rpi|docker|hass|homeassistant/i, "server"],
  [/\bap\b|access-?point|unifi|ubnt|mesh|router|switch|cap/i, "network"],
];

export interface DeviceIdentity {
  vendor?: string;
  brand?: Brand;
  kind: DeviceKind;
  /** Randomised ("private") MAC: the vendor can't be looked up. */
  privateMac: boolean;
}

export type OuiLookup = (mac: string) => string | undefined;

/** Lazy-loads the ~800 KB vendor table on first use. */
export async function loadOui(): Promise<OuiLookup> {
  const { vendors, packed } = (await import("@/data/oui.json")).default as { vendors: string[]; packed: string };
  const map = new Map<string, number>();
  for (const entry of packed.split(",")) map.set(entry.slice(0, 6), parseInt(entry.slice(6), 36));
  return (mac) => {
    const key = mac.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase();
    const i = map.get(key);
    return i === undefined ? undefined : vendors[i];
  };
}

export function isPrivateMac(mac: string) {
  const second = parseInt(mac.replace(/[^0-9a-f]/gi, "")[1] ?? "0", 16);
  return (second & 0b0010) !== 0;
}

export function identify(
  { mac, hostName, alias, wireless }: { mac: string; hostName?: string; alias?: string; wireless?: boolean },
  lookup?: OuiLookup,
): DeviceIdentity {
  const privateMac = isPrivateMac(mac);
  const vendor = privateMac ? undefined : lookup?.(mac);
  const names = [hostName, alias].filter(Boolean).join(" ");

  const rule =
    (vendor && BRANDS.find((r) => r.vendor?.test(vendor))) || (names && BRANDS.find((r) => r.host?.test(names))) || undefined;
  const brand = rule ? { id: rule.id, name: rule.name, icon: rule.icon, wordmark: rule.wordmark, kind: rule.kind } : undefined;

  let kind = KIND_HINTS.find(([re]) => names && re.test(names))?.[1] ?? brand?.kind;
  // Private MACs are almost always phones, tablets or laptops.
  kind ??= privateMac && wireless ? "phone" : "unknown";
  return { vendor, brand, kind, privateMac };
}

export const KIND_LABEL: Record<DeviceKind, string> = {
  phone: "Phone", tablet: "Tablet", laptop: "Laptop", desktop: "Computer", watch: "Wearable", tv: "TV / Streaming",
  speaker: "Speaker", console: "Game Console", nas: "Storage (NAS)", printer: "Printer", camera: "Camera",
  light: "Smart Light", plug: "Smart Plug", iot: "Smart Device", network: "Network Device", server: "Server",
  unknown: "Device",
};
