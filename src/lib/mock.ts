/**
 * In-memory simulated RouterOS device used by "Demo mode".
 * Implements the generic REST semantics (GET/PUT/PATCH/DELETE on tables,
 * POST `.../set` on singletons) so every page works without hardware.
 */
import type { Method, RosRecord } from "./api";

type Row = Record<string, string>;

const bootedAt = Date.now() - (3 * 86400 + 7 * 3600 + 42 * 60) * 1000;
let nextId = 100;
const id = () => `*${(nextId++).toString(16).toUpperCase()}`;

function rows(list: Row[]): Row[] {
  return list.map((r) => ({ ".id": id(), disabled: "false", ...r }));
}

const singles: Record<string, Row> = {
  "system/identity": { name: "Home-Gateway" },
  "system/resource": {
    "board-name": "hAP ax^3",
    platform: "MikroTik",
    version: "7.16.1 (stable)",
    "architecture-name": "arm64",
    cpu: "ARM64",
    "cpu-count": "4",
    "cpu-frequency": "864",
    "cpu-load": "4",
    "total-memory": "1073741824",
    "free-memory": "812646400",
    "total-hdd-space": "134217728",
    "free-hdd-space": "98566144",
    "build-time": "2024-10-10 11:23:14",
  },
  "system/routerboard": {
    routerboard: "true",
    model: "C53UiG+5HPaxD2HPaxD",
    "serial-number": "HE80A1B2C3D",
    "firmware-type": "ipq6000",
    "current-firmware": "7.16.1",
    "upgrade-firmware": "7.16.1",
  },
  "system/clock": { "time-zone-name": "Asia/Bangkok", "time-zone-autodetect": "true", date: "", time: "" },
  "system/ntp/client": { enabled: "true", mode: "unicast", servers: "time.cloudflare.com,pool.ntp.org", status: "synchronized" },
  "ip/dns": {
    servers: "1.1.1.1,8.8.8.8",
    "dynamic-servers": "203.150.213.1,203.150.218.161",
    "allow-remote-requests": "true",
    "cache-size": "2048KiB",
    "cache-used": "412KiB",
  },
};

Object.assign(singles, {
  "ip/cloud": { "ddns-enabled": "true", "dns-name": "he80a1b2c3d.sn.mynetname.net", "public-address": "171.97.42.118", status: "updated", "update-time": "true" },
  "ip/settings": { "ip-forward": "true", "send-redirects": "true", "accept-source-route": "false", "accept-redirects": "false", "secure-redirects": "true", "rp-filter": "no", "tcp-syncookies": "false", "allow-fast-path": "true" },
  "ip/upnp": { enabled: "false", "allow-disable-external-interface": "false", "show-dummy-rule": "true" },
  "ip/ssh": { "strong-crypto": "true", "always-allow-password-login": "false", "forwarding-enabled": "no", "host-key-size": "2048" },
  "ip/proxy": { enabled: "false", port: "8080", "cache-on-disk": "false", "max-cache-size": "unlimited" },
  "ip/socks": { enabled: "false", port: "1080", version: "4" },
  "ip/smb": { enabled: "auto", domain: "MSHOME", comment: "MikrotikSMB" },
  "ip/traffic-flow": { enabled: "false", "cache-entries": "32k", "active-flow-timeout": "30m", "inactive-flow-timeout": "15s" },
  "ip/neighbor/discovery-settings": { "discover-interface-list": "LAN", protocol: "cdp,lldp,mndp", mode: "tx-and-rx" },
  "ip/firewall/connection/tracking": { enabled: "auto", "tcp-established-timeout": "1d", "udp-timeout": "30s", "total-entries": "412", "max-entries": "1048576" },
  "ipv6/settings": { "disable-ipv6": "false", forward: "true", "accept-router-advertisements": "yes-if-forwarding-disabled" },
  "interface/bridge/settings": { "use-ip-firewall": "false", "allow-fast-path": "true", "bridge-fast-path-active": "true" },
  "system/package/update": { channel: "stable", "installed-version": "7.16.1", "latest-version": "", status: "" },
  "system/routerboard/settings": { "auto-upgrade": "false", "boot-device": "nand-if-fail-then-ethernet", "cpu-frequency": "auto", "protected-routerboot": "disabled" },
  "system/ntp/server": { enabled: "false", broadcast: "false", multicast: "false", manycast: "false" },
  "system/note": { "show-at-login": "true", note: "" },
  "system/watchdog": { "watch-address": "none", "watchdog-timer": "true", "auto-send-supout": "false" },
  "system/license": { "software-id": "ABCD-1234", nlevel: "6", features: "" },
  "system/device-mode": { mode: "home", container: "false", "traffic-gen": "false", scheduler: "true", socks: "true", fetch: "true", "bandwidth-test": "true" },
  snmp: { enabled: "false", contact: "", location: "", "trap-version": "1" },
  "tool/bandwidth-server": { enabled: "true", authenticate: "true", "allocate-udp-ports-from": "2000", "max-sessions": "100" },
  "tool/romon": { enabled: "false", id: "00:00:00:00:00:00" },
  "tool/e-mail": { server: "0.0.0.0", port: "25", tls: "no", from: "<>", user: "" },
  "tool/graphing": { "store-every": "5min", "page-refresh": "300" },
  "tool/mac-server/mac-winbox": { "allowed-interface-list": "LAN" },
  "tool/sniffer": { "filter-interface": "", "file-name": "", "streaming-enabled": "false", running: "false" },
  "container/config": { "registry-url": "https://registry-1.docker.io", tmpdir: "usb1/pull", "ram-high": "0" },
  "interface/l2tp-server/server": { enabled: "true", "use-ipsec": "required", "ipsec-secret": "demo-psk-123", "default-profile": "default-encryption", authentication: "mschap2" },
  "interface/sstp-server/server": { enabled: "false", port: "443", certificate: "none", "default-profile": "default-encryption", authentication: "mschap2" },
  "interface/ovpn-server/server": { enabled: "false", port: "1194", protocol: "udp", mode: "ip", certificate: "none", "require-client-certificate": "false", cipher: "aes256-gcm", "default-profile": "default-encryption" },
  "interface/pptp-server/server": { enabled: "false", "default-profile": "default-encryption" },
  "tool/mac-server": { "allowed-interface-list": "LAN" },
});
Object.assign(singles["ip/dns"], { "use-doh-server": "", "verify-doh-cert": "false", "cache-max-ttl": "1w", "max-concurrent-queries": "100" });

const ethMac = (n: number) => `48:A9:8A:4F:21:${(0x10 + n).toString(16).toUpperCase()}`;

const tables: Record<string, Row[]> = {
  interface: rows([
    { name: "ether1", "default-name": "ether1", type: "ether", "mac-address": ethMac(1), running: "true", comment: "WAN", "rx-byte": "981234567890", "tx-byte": "123456789012", "link-speed": "1Gbps", mtu: "1500" },
    { name: "ether2", "default-name": "ether2", type: "ether", "mac-address": ethMac(2), running: "true", comment: "Office PC", "rx-byte": "12345678901", "tx-byte": "234567890123", "link-speed": "1Gbps", mtu: "1500" },
    { name: "ether3", "default-name": "ether3", type: "ether", "mac-address": ethMac(3), running: "true", comment: "NAS", "rx-byte": "45678901234", "tx-byte": "56789012345", "link-speed": "1Gbps", mtu: "1500" },
    { name: "ether4", "default-name": "ether4", type: "ether", "mac-address": ethMac(4), running: "false", comment: "", "rx-byte": "0", "tx-byte": "0", mtu: "1500" },
    { name: "ether5", "default-name": "ether5", type: "ether", "mac-address": ethMac(5), running: "true", comment: "Living room AP", "rx-byte": "8901234567", "tx-byte": "90123456789", "link-speed": "100Mbps", mtu: "1500" },
    { name: "wifi1", "default-name": "wifi1", type: "wifi", "mac-address": ethMac(6), running: "true", comment: "5 GHz", "rx-byte": "34567890123", "tx-byte": "456789012345", mtu: "1500" },
    { name: "wifi2", "default-name": "wifi2", type: "wifi", "mac-address": ethMac(7), running: "true", comment: "2.4 GHz", "rx-byte": "4567890123", "tx-byte": "23456789012", mtu: "1500" },
    { name: "bridge", type: "bridge", "mac-address": ethMac(2), running: "true", comment: "LAN", "rx-byte": "105678901234", "tx-byte": "806789012345", mtu: "1500" },
    { name: "vlan20-iot", type: "vlan", "mac-address": ethMac(2), running: "true", comment: "IoT", "rx-byte": "456789012", "tx-byte": "3456789012", mtu: "1500" },
    { name: "wg-home", type: "wg", running: "true", comment: "WireGuard", "rx-byte": "123456789", "tx-byte": "987654321", mtu: "1420" },
  ]),
  "interface/bridge": rows([{ name: "bridge", "vlan-filtering": "false", "protocol-mode": "rstp", comment: "LAN" }]),
  "interface/bridge/port": rows([
    { interface: "ether2", bridge: "bridge", pvid: "1" },
    { interface: "ether3", bridge: "bridge", pvid: "1" },
    { interface: "ether4", bridge: "bridge", pvid: "1" },
    { interface: "ether5", bridge: "bridge", pvid: "1" },
    { interface: "wifi1", bridge: "bridge", pvid: "1" },
    { interface: "wifi2", bridge: "bridge", pvid: "1" },
  ]),
  "interface/vlan": rows([{ name: "vlan20-iot", "vlan-id": "20", interface: "bridge" }]),
  "interface/wifi": rows([
    { name: "wifi1", "configuration.ssid": "HomeNet", "configuration.mode": "ap", "security.authentication-types": "wpa2-psk,wpa3-psk", "security.passphrase": "supersecret", "channel.band": "5ghz-ax", "channel.width": "20/40/80mhz", "configuration.country": "Thailand", running: "true", "mac-address": ethMac(6), "configuration.hide-ssid": "false" },
    { name: "wifi2", "configuration.ssid": "HomeNet", "configuration.mode": "ap", "security.authentication-types": "wpa2-psk,wpa3-psk", "security.passphrase": "supersecret", "channel.band": "2ghz-ax", "channel.width": "20/40mhz", "configuration.country": "Thailand", running: "true", "mac-address": ethMac(7), "configuration.hide-ssid": "false" },
  ]),
  "interface/wifi/registration-table": rows([
    { interface: "wifi1", "mac-address": "A4:83:E7:12:34:56", signal: "-48", "tx-rate": "1.2Gbps", "rx-rate": "864Mbps", uptime: "5h12m3s", band: "5ghz-ax" },
    { interface: "wifi1", "mac-address": "F0:18:98:AB:CD:EF", signal: "-61", "tx-rate": "433Mbps", "rx-rate": "390Mbps", uptime: "1d2h4m", band: "5ghz-ac" },
    { interface: "wifi2", "mac-address": "24:0A:C4:11:22:33", signal: "-72", "tx-rate": "72Mbps", "rx-rate": "54Mbps", uptime: "3d1h", band: "2ghz-n" },
    { interface: "wifi1", "mac-address": "10:39:17:98:76:54", signal: "-55", "tx-rate": "866Mbps", "rx-rate": "650Mbps", uptime: "42m10s", band: "5ghz-ax" },
    { interface: "wifi2", "mac-address": "A8:BB:50:3C:11:01", signal: "-58", "tx-rate": "72Mbps", "rx-rate": "54Mbps", uptime: "1h0m", band: "2ghz-n" },
    { interface: "wifi2", "mac-address": "A8:BB:50:3C:11:02", signal: "-66", "tx-rate": "72Mbps", "rx-rate": "54Mbps", uptime: "2h7m", band: "2ghz-n" },
    { interface: "wifi1", "mac-address": "10:30:47:AA:01:02", signal: "-52", "tx-rate": "866Mbps", "rx-rate": "780Mbps", uptime: "3h14m", band: "5ghz-ax" },
    { interface: "wifi1", "mac-address": "90:47:48:12:34:56", signal: "-60", "tx-rate": "866Mbps", "rx-rate": "780Mbps", uptime: "4h21m", band: "5ghz-ax" },
    { interface: "wifi1", "mac-address": "00:04:3C:5A:6B:7C", signal: "-63", "tx-rate": "866Mbps", "rx-rate": "780Mbps", uptime: "5h28m", band: "5ghz-ax" },
    { interface: "wifi1", "mac-address": "DA:1F:22:33:44:55", signal: "-57", "tx-rate": "866Mbps", "rx-rate": "780Mbps", uptime: "6h35m", band: "5ghz-ax" },
  ]),
  "ip/address": rows([
    { address: "192.168.88.1/24", network: "192.168.88.0", interface: "bridge", comment: "Default" },
    { address: "10.20.0.1/24", network: "10.20.0.0", interface: "vlan20-iot", comment: "IoT" },
    { address: "10.99.0.1/24", network: "10.99.0.0", interface: "wg-home", comment: "VPN" },
    { address: "171.97.42.118/22", network: "171.97.40.0", interface: "ether1", dynamic: "true" },
  ]),
  "ip/dhcp-client": rows([
    { interface: "ether1", status: "bound", address: "171.97.42.118/22", gateway: "171.97.40.1", "primary-dns": "203.150.213.1", "secondary-dns": "203.150.218.161", "expires-after": "21h44m12s", "add-default-route": "yes", "use-peer-dns": "yes", comment: "defconf" },
  ]),
  "interface/pppoe-client": rows([]),
  "ip/route": rows([
    { "dst-address": "0.0.0.0/0", gateway: "171.97.40.1", distance: "1", dynamic: "true", active: "true", "routing-table": "main" },
    { "dst-address": "192.168.88.0/24", gateway: "bridge", distance: "0", dynamic: "true", active: "true", connect: "true", "routing-table": "main" },
    { "dst-address": "10.20.0.0/24", gateway: "vlan20-iot", distance: "0", dynamic: "true", active: "true", connect: "true", "routing-table": "main" },
    { "dst-address": "172.16.50.0/24", gateway: "10.99.0.2", distance: "1", active: "true", "routing-table": "main", comment: "Office via VPN" },
  ]),
  "ip/pool": rows([
    { name: "dhcp-lan", ranges: "192.168.88.10-192.168.88.254" },
    { name: "dhcp-iot", ranges: "10.20.0.100-10.20.0.200" },
  ]),
  "ip/dhcp-server": rows([
    { name: "dhcp-lan", interface: "bridge", "address-pool": "dhcp-lan", "lease-time": "30m" },
    { name: "dhcp-iot", interface: "vlan20-iot", "address-pool": "dhcp-iot", "lease-time": "1d" },
  ]),
  "ip/dhcp-server/network": rows([
    { address: "192.168.88.0/24", gateway: "192.168.88.1", "dns-server": "192.168.88.1", comment: "LAN" },
    { address: "10.20.0.0/24", gateway: "10.20.0.1", "dns-server": "10.20.0.1", comment: "IoT" },
  ]),
  "ip/dhcp-server/lease": rows([
    { address: "192.168.88.10", "mac-address": "A4:83:E7:12:34:56", "host-name": "MacBook-Pro", server: "dhcp-lan", status: "bound", dynamic: "true", "expires-after": "24m11s", "last-seen": "5s" },
    { address: "192.168.88.11", "mac-address": "F0:18:98:AB:CD:EF", "host-name": "iPhone", server: "dhcp-lan", status: "bound", dynamic: "true", "expires-after": "18m2s", "last-seen": "12s" },
    { address: "192.168.88.5", "mac-address": "00:11:32:AA:BB:CC", "host-name": "synology-nas", server: "dhcp-lan", status: "bound", dynamic: "false", comment: "NAS", "last-seen": "1s" },
    { address: "192.168.88.20", "mac-address": "D8:BB:C1:44:55:66", "host-name": "DESKTOP-OFFICE", server: "dhcp-lan", status: "bound", dynamic: "false", comment: "Office PC", "last-seen": "2s" },
    { address: "192.168.88.30", "mac-address": "10:39:17:98:76:54", "host-name": "Galaxy-Tab", server: "dhcp-lan", status: "bound", dynamic: "true", "expires-after": "29m40s", "last-seen": "3s" },
    { address: "192.168.88.4", "mac-address": "74:4D:28:01:02:03", "host-name": "Living-AP", server: "dhcp-lan", status: "bound", dynamic: "false", comment: "Living room AP", "last-seen": "1s" },
    { address: "10.20.0.101", "mac-address": "24:0A:C4:11:22:33", "host-name": "esp32-thermo", server: "dhcp-iot", status: "bound", dynamic: "true", "expires-after": "20h", "last-seen": "40s" },
    { address: "10.20.0.102", "mac-address": "50:EC:50:77:88:99", "host-name": "smart-plug", server: "dhcp-iot", status: "waiting", dynamic: "true", "last-seen": "2h13m" },
    { address: "10.20.0.110", "mac-address": "A8:BB:50:3C:11:01", "host-name": "wiz_3c1101", server: "dhcp-iot", status: "bound", dynamic: "true", "expires-after": "20m", "last-seen": "2s" },
    { address: "10.20.0.111", "mac-address": "A8:BB:50:3C:11:02", "host-name": "wiz_3c1102", server: "dhcp-iot", status: "bound", dynamic: "true", "expires-after": "21m", "last-seen": "3s" },
    { address: "192.168.88.40", "mac-address": "10:30:47:AA:01:02", "host-name": "Samsung-TV", server: "dhcp-lan", status: "bound", dynamic: "true", "expires-after": "22m", "last-seen": "4s" },
    { address: "192.168.88.41", "mac-address": "90:47:48:12:34:56", "host-name": "PS5-641", server: "dhcp-lan", status: "bound", dynamic: "true", "expires-after": "23m", "last-seen": "5s" },
    { address: "192.168.88.42", "mac-address": "00:04:3C:5A:6B:7C", "host-name": "Sonos-Kitchen", server: "dhcp-lan", status: "bound", dynamic: "true", "expires-after": "24m", "last-seen": "6s" },
    { address: "192.168.88.43", "mac-address": "DA:1F:22:33:44:55", "host-name": "iPhone-2", server: "dhcp-lan", status: "bound", dynamic: "true", "expires-after": "25m", "last-seen": "7s" },
  ]),
  "ip/arp": rows([
    { address: "192.168.88.10", "mac-address": "A4:83:E7:12:34:56", interface: "bridge", complete: "true", dynamic: "true" },
    { address: "192.168.88.11", "mac-address": "F0:18:98:AB:CD:EF", interface: "bridge", complete: "true", dynamic: "true" },
    { address: "192.168.88.5", "mac-address": "00:11:32:AA:BB:CC", interface: "bridge", complete: "true", dynamic: "true" },
    { address: "192.168.88.20", "mac-address": "D8:BB:C1:44:55:66", interface: "bridge", complete: "true", dynamic: "true" },
    { address: "192.168.88.30", "mac-address": "10:39:17:98:76:54", interface: "bridge", complete: "true", dynamic: "true" },
    { address: "192.168.88.4", "mac-address": "74:4D:28:01:02:03", interface: "bridge", complete: "true", dynamic: "true" },
    { address: "10.20.0.101", "mac-address": "24:0A:C4:11:22:33", interface: "vlan20-iot", complete: "true", dynamic: "true" },
    { address: "171.97.40.1", "mac-address": "00:1E:58:00:00:01", interface: "ether1", complete: "true", dynamic: "true" },
  ]),
  "interface/bridge/host": rows([
    { "mac-address": "D8:BB:C1:44:55:66", "on-interface": "ether2", bridge: "bridge" },
    { "mac-address": "00:11:32:AA:BB:CC", "on-interface": "ether3", bridge: "bridge" },
    { "mac-address": "74:4D:28:01:02:03", "on-interface": "ether5", bridge: "bridge" },
    { "mac-address": "A4:83:E7:12:34:56", "on-interface": "wifi1", bridge: "bridge" },
    { "mac-address": "F0:18:98:AB:CD:EF", "on-interface": "wifi1", bridge: "bridge" },
    { "mac-address": "10:39:17:98:76:54", "on-interface": "wifi1", bridge: "bridge" },
  ]),
  "ip/firewall/filter": rows([
    { chain: "input", action: "accept", "connection-state": "established,related,untracked", comment: "defconf: accept established,related,untracked", bytes: "8123456789", packets: "9123456" },
    { chain: "input", action: "drop", "connection-state": "invalid", comment: "defconf: drop invalid", bytes: "123456", packets: "1203" },
    { chain: "input", action: "accept", protocol: "icmp", comment: "defconf: accept ICMP", bytes: "345678", packets: "4501" },
    { chain: "input", action: "accept", protocol: "udp", "dst-port": "51820", comment: "Allow WireGuard", bytes: "98765432", packets: "120345" },
    { chain: "input", action: "drop", "in-interface-list": "!LAN", comment: "defconf: drop all not coming from LAN", bytes: "4567890", packets: "56789" },
    { chain: "forward", action: "fasttrack-connection", "connection-state": "established,related", "hw-offload": "true", comment: "defconf: fasttrack", bytes: "912345678901", packets: "812345678" },
    { chain: "forward", action: "accept", "connection-state": "established,related,untracked", comment: "defconf: accept established,related, untracked", bytes: "12345678", packets: "123456" },
    { chain: "forward", action: "drop", "src-address": "10.20.0.0/24", "dst-address": "192.168.88.0/24", comment: "Isolate IoT from LAN", bytes: "234567", packets: "3456" },
    { chain: "forward", action: "drop", "connection-state": "invalid", comment: "defconf: drop invalid", bytes: "56789", packets: "678" },
  ]),
  "ip/firewall/nat": rows([
    { chain: "srcnat", action: "masquerade", "out-interface-list": "WAN", comment: "defconf: masquerade", bytes: "51234567890", packets: "61234567" },
    { chain: "dstnat", action: "dst-nat", protocol: "tcp", "dst-port": "8443", "in-interface-list": "WAN", "to-addresses": "192.168.88.5", "to-ports": "443", comment: "NAS HTTPS", bytes: "1234567", packets: "2345" },
    { chain: "dstnat", action: "dst-nat", protocol: "udp", "dst-port": "32400", "in-interface-list": "WAN", "to-addresses": "192.168.88.5", "to-ports": "32400", comment: "Plex", disabled: "true", bytes: "0", packets: "0" },
  ]),
  "ip/firewall/address-list": rows([{ list: "blocked", address: "192.168.88.66", comment: "Blocked device" }]),
  log: [],
  user: rows([
    { name: "admin", group: "full", address: "", "last-logged-in": "2026-10-22 08:01:12", comment: "system default user" },
    { name: "monitor", group: "read", address: "192.168.88.0/24", "last-logged-in": "2026-10-19 21:44:03", comment: "Read-only for Grafana" },
  ]),
  "user/group": rows([
    { name: "read", policy: "local,telnet,ssh,reboot,read,test,winbox,password,web,sniff,sensitive,api,romon,rest-api,!ftp,!write,!policy", skin: "default" },
    { name: "write", policy: "local,telnet,ssh,reboot,read,write,test,winbox,password,web,sniff,sensitive,api,romon,rest-api,!ftp,!policy", skin: "default" },
    { name: "full", policy: "local,telnet,ssh,ftp,reboot,read,write,policy,test,winbox,password,web,sniff,sensitive,api,romon,rest-api", skin: "default" },
  ]),
  "user/active": rows([
    { name: "admin", via: "rest-api", address: "192.168.88.10", when: "2026-10-22 14:30:02", group: "full" },
    { name: "admin", via: "winbox", address: "192.168.88.20", when: "2026-10-22 09:12:45", group: "full" },
  ]),
  "ip/service": rows([
    { name: "telnet", port: "23", address: "", disabled: "true" },
    { name: "ftp", port: "21", address: "", disabled: "true" },
    { name: "www", port: "80", address: "", disabled: "true" },
    { name: "ssh", port: "22", address: "192.168.88.0/24" },
    { name: "www-ssl", port: "443", address: "", certificate: "webfig" },
    { name: "api", port: "8728", address: "", disabled: "true" },
    { name: "winbox", port: "8291", address: "" },
    { name: "api-ssl", port: "8729", address: "", disabled: "true" },
  ]),
  "queue/simple": rows([
    { name: "Galaxy-Tab", target: "192.168.88.30/32", "max-limit": "5M/20M", comment: "Kids tablet", rate: "0/0" },
    { name: "IoT", target: "10.20.0.0/24", "max-limit": "2M/5M", rate: "0/0" },
  ]),
  "interface/wireguard": rows([
    { name: "wg-home", "listen-port": "13231", mtu: "1420", "private-key": "aGVsbG8tdGhpcy1pcy1hLWRlbW8tcHJpdmF0ZS1rZXk=", "public-key": "WGhvbWVQdWJsaWNLZXlEZW1vMTIzNDU2Nzg5MGFiY2Q=", running: "true" },
  ]),
  "interface/wireguard/peers": rows([
    { interface: "wg-home", "public-key": "UGhvbmVLZXlEZW1vMTIzNDU2Nzg5MGFiY2RlZmdoaWo=", "allowed-address": "10.99.0.2/32", comment: "My phone", "current-endpoint-address": "49.228.12.7", "current-endpoint-port": "51544", "last-handshake": "42s", rx: "184320000", tx: "912340000" },
    { interface: "wg-home", "public-key": "TGFwdG9wS2V5RGVtbzEyMzQ1Njc4OTBhYmNkZWZnaGk=", "allowed-address": "10.99.0.3/32", comment: "Work laptop", "last-handshake": "3d4h", rx: "52340000", tx: "12340000" },
  ]),
  "system/package": rows([
    { name: "routeros", version: "7.16.1", "build-time": "2024-10-10 11:23:14", size: "12.3MiB" },
    { name: "wifi-qcom", version: "7.16.1", "build-time": "2024-10-10 11:23:14", size: "4.1MiB" },
    { name: "container", version: "7.16.1", "build-time": "2024-10-10 11:23:14", size: "140KiB", disabled: "true" },
  ]),
  file: rows([
    { name: "flash", type: "disk" },
    { name: "auto-before-reset.backup", type: "backup", size: "41231", "creation-time": "2026-09-01 10:02:11" },
    { name: "Home-Gateway-2026-10-01.backup", type: "backup", size: "48890", "creation-time": "2026-10-01 22:00:04" },
    { name: "skins", type: "directory" },
    { name: "pub", type: "directory" },
  ]),
  "system/scheduler": rows([
    { name: "nightly-backup", "start-time": "03:00:00", interval: "1d", "on-event": "/system backup save name=nightly", "run-count": "52", "next-run": "2026-10-23 03:00:00" },
  ]),
  "system/script": rows([
    { name: "update-ddns", source: "/ip cloud force-update", policy: "read,write,test", "run-count": "4", owner: "admin" },
  ]),
  "ip/firewall/mangle": rows([
    { chain: "prerouting", action: "mark-connection", "new-connection-mark": "voip", protocol: "udp", "dst-port": "5060-5061", comment: "Mark VoIP", bytes: "123456", packets: "1234" },
  ]),
  "ip/firewall/raw": rows([]),
  "ip/dns/static": rows([
    { name: "nas.lan", address: "192.168.88.5", ttl: "1d" },
    { name: "router.lan", address: "192.168.88.1", ttl: "1d" },
  ]),
  "interface/list": rows([
    { name: "WAN", builtin: "false", comment: "defconf" },
    { name: "LAN", builtin: "false", comment: "defconf" },
  ]),
  "interface/list/member": rows([
    { list: "LAN", interface: "bridge" },
    { list: "WAN", interface: "ether1" },
  ]),
  "system/logging": rows([
    { topics: "info", action: "memory", prefix: "" },
    { topics: "error", action: "memory", prefix: "" },
    { topics: "warning", action: "memory", prefix: "" },
    { topics: "critical", action: "echo", prefix: "" },
  ]),
  certificate: rows([{ name: "webfig", "common-name": "192.168.88.1", "key-type": "rsa", "key-size": "2048", "days-valid": "365", trusted: "true", "invalid-after": "2027-03-01 10:00:00" }]),
  "tool/netwatch": rows([{ host: "1.1.1.1", type: "icmp", interval: "30s", status: "up", comment: "Internet check" }]),
  "ppp/secret": rows([
    { name: "alice", service: "l2tp", profile: "default-encryption", "remote-address": "10.70.0.10", "last-logged-out": "2026-10-21 18:22:10" },
    { name: "bob", service: "any", profile: "default-encryption", "last-logged-out": "2026-10-18 09:02:51" },
  ]),
  "ppp/profile": rows([
    { name: "default", "use-encryption": "default", "only-one": "default" },
    { name: "default-encryption", "local-address": "10.70.0.1", "remote-address": "vpn-pool", "dns-server": "10.70.0.1", "use-encryption": "yes" },
  ]),
  "ppp/active": rows([{ name: "alice", service: "l2tp", "caller-id": "49.228.12.7", address: "10.70.0.10", uptime: "1h12m" }]),
  "ip/ipsec/proposal": rows([{ name: "default", "enc-algorithms": "aes-256-cbc,aes-192-cbc,aes-128-cbc", "auth-algorithms": "sha1", "pfs-group": "modp1024", lifetime: "30m" }]),
  "ip/ipsec/profile": rows([{ name: "default", "hash-algorithm": "sha1", "enc-algorithm": "aes-128,3des", "dh-group": "modp2048,modp1024" }]),
  "ipv6/dhcp-client": rows([{ interface: "ether1", request: "prefix", "pool-name": "isp-pd", "pool-prefix-length": "64", prefix: "2405:9800:b001:12::/56", status: "bound", "add-default-route": "yes", "use-peer-dns": "yes" }]),
  "ipv6/pool": rows([{ name: "isp-pd", prefix: "2405:9800:b001:12::/56", "prefix-length": "64" }]),
  "ipv6/address": rows([
    { address: "2405:9800:b001:12::1/64", "from-pool": "isp-pd", interface: "bridge", advertise: "true" },
    { address: "fe80::4aa9:8aff:fe4f:2112/64", interface: "bridge", dynamic: "true", "link-local": "true", advertise: "false" },
  ]),
  "ipv6/nd": rows([{ interface: "all", "ra-interval": "3m20s-10m", "advertise-dns": "yes", "managed-address-configuration": "false", "other-configuration": "false", default: "true" }]),
  "ipv6/firewall/filter": rows([
    { chain: "input", action: "accept", "connection-state": "established,related,untracked", comment: "defconf: accept established,related,untracked" },
    { chain: "input", action: "accept", protocol: "icmpv6", comment: "defconf: accept ICMPv6" },
    { chain: "input", action: "drop", "in-interface-list": "!LAN", comment: "defconf: drop everything else not coming from LAN" },
  ]),
  "interface/bridge/vlan": rows([{ bridge: "bridge", "vlan-ids": "20", tagged: "bridge,ether5", untagged: "" }]),
  "routing/table": rows([{ name: "main", fib: "true", dynamic: "true" }, { name: "via-vpn", fib: "true", comment: "Route some clients through VPN" }]),
  "routing/rule": rows([{ "src-address": "192.168.88.20/32", action: "lookup", table: "via-vpn", comment: "Office PC via VPN" }]),
  "queue/type": rows([
    { name: "default", kind: "pfifo", default: "true" },
    { name: "pcq-download-default", kind: "pcq", "pcq-rate": "0", "pcq-classifier": "dst-address", default: "true" },
    { name: "cake-wan", kind: "cake", "cake-bandwidth": "500M", "cake-diffserv": "diffserv4" },
  ]),
  "queue/tree": rows([{ name: "voip-priority", parent: "ether1", "packet-mark": "voip", priority: "1", "max-limit": "5M", rate: "0", queue: "default" }]),
  "ip/upnp/interfaces": rows([{ interface: "ether1", type: "external" }, { interface: "bridge", type: "internal" }]),
  "snmp/community": rows([{ name: "public", addresses: "::/0", security: "none", "read-access": "true", "write-access": "false", default: "true" }]),
  "system/logging/action": rows([
    { name: "memory", target: "memory", "memory-lines": "1000", default: "true" },
    { name: "disk", target: "disk", "disk-file-name": "log", "disk-lines-per-file": "1000", default: "true" },
    { name: "echo", target: "echo", default: "true" },
    { name: "remote", target: "remote", remote: "192.168.88.5", "remote-port": "514", default: "true" },
  ]),
  "ip/dns/cache": rows([
    { name: "www.google.com", type: "A", data: "142.250.199.36", ttl: "3m12s" },
    { name: "api.github.com", type: "A", data: "20.205.243.168", ttl: "48s" },
    { name: "time.cloudflare.com", type: "A", data: "162.159.200.1", ttl: "12m" },
    { name: "mikrotik.com", type: "A", data: "159.148.147.196", ttl: "4m40s" },
  ]),
  "ip/firewall/service-port": rows([
    { name: "ftp", ports: "21" },
    { name: "tftp", ports: "69" },
    { name: "irc", ports: "6667", disabled: "true" },
    { name: "h323", ports: "" },
    { name: "sip", ports: "5060,5061", disabled: "true" },
    { name: "pptp", ports: "" },
    { name: "rtsp", ports: "554", disabled: "true" },
  ]),
  "ip/firewall/layer7-protocol": rows([]),
  container: rows([
    { name: "adguard", tag: "adguard/adguardhome:latest", interface: "veth1", "root-dir": "usb1/adguard", status: "running", "start-on-boot": "true" },
  ]),
  "interface/veth": rows([{ name: "veth1", address: "172.17.0.2/24", gateway: "172.17.0.1" }]),
  "container/mounts": rows([{ name: "adguard_conf", src: "/usb1/adguard/conf", dst: "/opt/adguardhome/conf" }]),
  "system/health": rows([
    { name: "cpu-temperature", value: "52", type: "C" },
    { name: "board-temperature1", value: "44", type: "C" },
  ]),
};

const logTopics = [
  ["dhcp,info", "dhcp-lan assigned 192.168.88.11 for F0:18:98:AB:CD:EF iPhone"],
  ["wireless,info", "A4:83:E7:12:34:56@wifi1: connected, signal strength -48"],
  ["system,info,account", "user admin logged in from 192.168.88.10 via rest-api"],
  ["interface,info", "ether4 link down"],
  ["dhcp,info", "dhcp-client on ether1 got IP address 171.97.42.118"],
  ["wireless,info", "24:0A:C4:11:22:33@wifi2: disconnected, received deauth: sending station leaving (3)"],
  ["firewall,info", "input: in:ether1 out:(unknown 0), proto TCP (SYN), 45.12.8.3:51234->171.97.42.118:22, len 60"],
  ["system,info", "router rebooted"],
  ["critical,error", "login failure for user root from 45.12.8.3 via ssh"],
  ["system,info", "ntp change time Oct/22/2026 08:01:02 => Oct/22/2026 08:01:03"],
];
for (let i = 0; i < 60; i++) {
  const [topics, message] = logTopics[i % logTopics.length];
  const t = new Date(Date.now() - (60 - i) * 97_000);
  tables.log.push({ ".id": id(), time: t.toTimeString().slice(0, 8), topics, message });
}

/** Simulated per-interface throughput in bytes/s. */
const rates: Record<string, [number, number]> = {
  ether1: [6_200_000, 900_000],
  ether2: [250_000, 3_100_000],
  ether3: [120_000, 1_200_000],
  ether5: [80_000, 600_000],
  wifi1: [400_000, 2_800_000],
  wifi2: [20_000, 90_000],
  bridge: [870_000, 7_800_000],
  "vlan20-iot": [3_000, 12_000],
  "wg-home": [8_000, 15_000],
};
let lastTick = Date.now();

function tickCounters() {
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  const t = now / 1000;
  for (const row of tables.interface) {
    const r = rates[row.name];
    if (!r || row.disabled === "true") continue;
    // Smooth pseudo-random wave so the charts look alive.
    const wobble = 0.55 + 0.45 * Math.sin(t / 7 + row.name.length) + Math.random() * 0.35;
    row["rx-byte"] = String(Math.round(Number(row["rx-byte"]) + r[0] * wobble * dt));
    row["tx-byte"] = String(Math.round(Number(row["tx-byte"]) + r[1] * wobble * dt));
  }
}

function formatUptime(seconds: number) {
  const w = Math.floor(seconds / 604800);
  const d = Math.floor((seconds % 604800) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${w ? `${w}w` : ""}${d ? `${d}d` : ""}${h}h${m}m${s}s`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function stringify(body: unknown): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries((body ?? {}) as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "boolean" ? String(v) : String(v);
  }
  return out;
}

function splitPath(path: string): [string, string | null] {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const idx = clean.lastIndexOf("/*");
  if (idx >= 0) return [clean.slice(0, idx), clean.slice(idx + 1)];
  return [clean, null];
}

export async function mockRequest(method: Method, path: string, body?: unknown): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 80 + Math.random() * 120));
  const [table, rowId] = splitPath(path);

  if (method === "GET") {
    if (table === "system/resource") {
      const res = singles[table];
      res.uptime = formatUptime((Date.now() - bootedAt) / 1000);
      res["cpu-load"] = String(Math.round(3 + Math.random() * 14));
      res["free-memory"] = String(780_000_000 + Math.round(Math.random() * 40_000_000));
      return clone(res);
    }
    if (table === "system/clock") {
      const now = new Date();
      singles[table].date = now.toISOString().slice(0, 10);
      singles[table].time = now.toTimeString().slice(0, 8);
    }
    if (table === "interface") tickCounters();
    if (table === "queue/simple") {
      for (const q of tables[table]) {
        const [up, down] = (q["max-limit"] ?? "0/0").split("/").map((v) => parseFloat(v) * 1e6 || 50e6);
        q.rate = `${Math.round(up * Math.random() * 0.8)}/${Math.round(down * (0.3 + Math.random() * 0.7))}`;
      }
    }
    if (table === "ip/firewall/connection") return fakeConnections();
    if (singles[table]) return clone(singles[table]);
    // Unknown menus behave like an empty table, as on a router without that feature in use.
    const list = (tables[table] ??= []);
    if (rowId) {
      const row = list.find((r) => r[".id"] === rowId);
      if (!row) throw "no such item";
      return clone(row);
    }
    return clone(list);
  }

  if (method === "PUT") {
    const list = (tables[table] ??= []);
    const { "place-before": placeBefore, ...props } = stringify(body);
    const row: Row = { ".id": id(), disabled: "false", ...props };
    if (table === "interface/wireguard") {
      row["listen-port"] ??= "13231";
      row["private-key"] = randomKey();
      row["public-key"] = randomKey();
      row.running = "true";
    }
    if (table === "ip/address" && row.address?.includes("/")) {
      const [ip, prefix] = row.address.split("/");
      const mask = (~0 << (32 - Number(prefix))) >>> 0;
      const n = ip.split(".").reduce((a, o) => (a << 8) + Number(o), 0) & mask;
      row.network = [24, 16, 8, 0].map((sft) => (n >>> sft) & 255).join(".");
    }
    // Interfaces created in a sub-menu also show up in /interface.
    const sub = table.match(/^interface\/([a-z0-9-]+)$/)?.[1];
    if (sub && row.name && !["list", "wifi", "wireless"].includes(sub)) {
      tables.interface.push({ ".id": id(), name: row.name, type: sub === "wireguard" ? "wg" : sub, running: "true", disabled: "false", "rx-byte": "0", "tx-byte": "0", comment: row.comment ?? "" });
    }
    const before = placeBefore ? list.findIndex((r) => r[".id"] === placeBefore) : -1;
    if (before >= 0) list.splice(before, 0, row);
    else list.push(row);
    return clone(row);
  }

  if (method === "PATCH") {
    const row = tables[table]?.find((r) => r[".id"] === rowId);
    if (!row) throw "no such item";
    Object.assign(row, stringify(body));
    return clone(row);
  }

  if (method === "DELETE") {
    const list = tables[table];
    const i = list?.findIndex((r) => r[".id"] === rowId) ?? -1;
    if (i < 0) throw "no such item";
    const [removed] = list.splice(i, 1);
    if (/^interface\/[a-z0-9-]+$/.test(table) && removed.name) {
      tables.interface = tables.interface.filter((r) => r.name !== removed.name);
    }
    return null;
  }

  // POST: console commands
  if (table.endsWith("/set")) {
    const target = table.slice(0, -4);
    if (!singles[target]) throw `no such command (${table})`;
    Object.assign(singles[target], stringify(body));
    return [];
  }
  if (table === "ip/dhcp-server/lease/make-static") {
    const leaseId = (body as RosRecord)[".id"];
    const row = tables["ip/dhcp-server/lease"].find((r) => r[".id"] === leaseId);
    if (row) row.dynamic = "false";
    return [];
  }
  const args = (body ?? {}) as Record<string, string>;
  switch (table) {
    case "system/reboot":
    case "system/reset-configuration":
    case "system/backup/load":
    case "system/package/update/install":
    case "tool/wol":
      return [];
    case "execute":
      return { ret: fakeCli(args.script ?? "") };
    case "ping": {
      const count = Number(args.count || 4);
      const times = Array.from({ length: count }, () => 8 + Math.random() * 12);
      const out: Row[] = times.map((t, i) => ({ seq: String(i), host: args.address, size: "56", ttl: "57", time: `${t.toFixed(1)}ms` }));
      Object.assign(out[out.length - 1], {
        sent: String(count),
        received: String(count),
        "packet-loss": "0",
        "min-rtt": `${Math.min(...times).toFixed(1)}ms`,
        "avg-rtt": `${(times.reduce((a, b) => a + b, 0) / count).toFixed(1)}ms`,
        "max-rtt": `${Math.max(...times).toFixed(1)}ms`,
      });
      return out;
    }
    case "tool/traceroute":
      return ["192.168.1.1", "171.97.40.1", "10.180.24.1", "203.150.213.53", "72.14.239.130", args.address].map((a, i) => ({
        address: a,
        loss: "0%",
        last: `${(1 + i * 3 + Math.random() * 2).toFixed(1)}ms`,
      }));
    case "system/backup/save":
      tables.file.push({ ".id": id(), name: `${args.name}.backup`, type: "backup", size: "49012", "creation-time": new Date().toISOString().slice(0, 19).replace("T", " "), disabled: "false" });
      return [];
    case "system/package/update/check-for-updates":
      Object.assign(singles["system/package/update"], { "latest-version": "7.16.2", status: "New version is available" });
      return [{ status: "New version is available" }];
    case "ip/dns/cache/flush":
      tables["ip/dns/cache"] = [];
      return [];
    case "ip/cloud/force-update":
    case "system/script/run":
      return [];
    case "certificate/sign": {
      const cert = tables.certificate.find((c) => c[".id"] === args[".id"]);
      if (cert) cert["invalid-after"] = new Date(Date.now() + Number(cert["days-valid"] || 365) * 86_400_000).toISOString().slice(0, 19).replace("T", " ");
      return [];
    }
    case "container/start":
    case "container/stop": {
      const c = tables.container.find((r) => r[".id"] === args[".id"]);
      if (c) c.status = table.endsWith("start") ? "running" : "stopped";
      return [];
    }
    case "system/routerboard/upgrade":
      singles["system/routerboard"]["current-firmware"] = singles["system/routerboard"]["upgrade-firmware"];
      return [];
  }
  throw `no such command (${table})`;
}

function randomKey() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
}

/** Tiny imitation of the RouterOS console for /execute. */
function fakeCli(script: string): string {
  const resolve = script.match(/:resolve "([^"]+)"/);
  if (resolve) return `104.18.${resolve[1].length}.${(resolve[1].charCodeAt(0) * 7) % 255}`;
  if (/^\s*\/export/.test(script)) {
    const out = [`# ${new Date().toISOString().slice(0, 19)} by RouterOS 7.16.1`, "# model = C53UiG+5HPaxD2HPaxD"];
    for (const path of ["interface/bridge", "interface/vlan", "interface/wireguard", "ip/pool", "ip/dhcp-server", "ip/address", "ip/dhcp-server/network", "ip/dns/static", "ip/firewall/filter", "ip/firewall/nat", "ip/route", "queue/simple"]) {
      const list = (tables[path] ?? []).filter((r) => r.dynamic !== "true");
      if (!list.length) continue;
      out.push(`/${path.replace(/\//g, " ")}`);
      for (const r of list) {
        const props = Object.entries(r)
          .filter(([k, v]) => !k.startsWith(".") && !["running", "bytes", "packets", "rate", "public-key", "network", "active", "disabled"].includes(k) && v !== "")
          .filter(([k]) => !k.includes("key") || /show-sensitive/.test(script))
          .map(([k, v]) => `${k}=${/[\s,]/.test(v) ? `"${v}"` : v}`);
        out.push(`add ${props.join(" ")}`);
      }
    }
    out.push("/system identity", `set name=${singles["system/identity"].name}`);
    return out.join("\n");
  }
  const print = script.trim().match(/^\/?(.+?)\s+print\b/);
  if (print) {
    const path = print[1].trim().replace(/\s+/g, "/");
    if (singles[path]) return Object.entries(singles[path]).map(([k, v]) => `${k.padStart(22)}: ${v}`).join("\n");
    const list = tables[path];
    if (!list) return `bad command name ${print[1]}`;
    const keys = [...new Set(list.flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith(".") && k !== "disabled").slice(0, 5);
    const widths = keys.map((k) => Math.max(k.length, ...list.map((r) => (r[k] ?? "").length)));
    const head = " #  " + keys.map((k, i) => k.toUpperCase().padEnd(widths[i])).join("  ");
    const body = list.map((r, n) => `${String(n).padStart(2)} ${r.disabled === "true" ? "X" : " "} ` + keys.map((k, i) => (r[k] ?? "").padEnd(widths[i])).join("  "));
    return [head, ...body].join("\n");
  }
  return "";
}

function fakeConnections(): Row[] {
  const lan = ["192.168.88.10", "192.168.88.11", "192.168.88.20", "192.168.88.30", "192.168.88.40", "10.20.0.101"];
  const remote = [["142.250.199.36", "443", "tcp"], ["20.205.243.168", "443", "tcp"], ["1.1.1.1", "53", "udp"], ["162.159.200.1", "123", "udp"], ["17.253.85.204", "443", "tcp"], ["52.94.236.248", "443", "tcp"]];
  return Array.from({ length: 24 }, (_, i) => {
    const [ip, port, proto] = remote[i % remote.length];
    return {
      ".id": `*C${i}`,
      protocol: proto,
      "src-address": `${lan[i % lan.length]}:${49152 + ((i * 7919) % 16000)}`,
      "dst-address": `${ip}:${port}`,
      "tcp-state": proto === "tcp" ? (i % 5 === 0 ? "time-wait" : "established") : "",
      timeout: proto === "tcp" ? "23h59m" : "2m58s",
      "orig-bytes": String(Math.round(Math.random() * 2e6)),
      "repl-bytes": String(Math.round(Math.random() * 2e7)),
      assured: "true",
    };
  });
}
