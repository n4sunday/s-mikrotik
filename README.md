# S-MikroTik

A desktop dashboard for MikroTik routers with a UniFi-style UI.
Built with **Tauri 2**, **React**, **shadcn/ui** and **Tailwind CSS v4**.

## Features

- **Dashboard**: WAN status, live internet throughput, gateway health (CPU, memory, storage), front-panel port view, busiest interfaces
- **Topology**: Internet → gateway → ports/radios → clients
- **Ports & Interfaces**: live per-interface rates, enable/disable, rename/describe
- **Client Devices**: merged from DHCP leases, ARP, bridge hosts and WiFi registrations; alias, fixed IP, block/unblock, forget
- **System Log**: live tail with filtering
- **Tools**: ping, traceroute, DNS lookup, Wake-on-LAN, all run from the router
- **Terminal**: run any RouterOS CLI command (via `/execute`)
- **All RouterOS Menus**: WinBox-style tree of 166 menus (interfaces, bridge, WiFi, PPP, IP, firewall, IPsec, IPv6, routing/OSPF/BGP, queues, system, users, tools). Each one is listed and editable, and items can be added, enabled, disabled and removed. Any other path can be opened by typing it.
- **Settings** (grouped like UniFi)
  - **Network**: WiFi, Networks (VLAN + gateway + DHCP in one form), Internet (DHCP/PPPoE/DNS), DHCP, DNS (local records, DoH, cache), IPv6 (prefix delegation, SLAAC/RA, firewall), Bridge & VLANs (bridges, ports, VLAN table, interface lists, bonding)
  - **Security**: Firewall & Security (port forwarding, filter, NAT, address lists, mangle, raw, layer 7, live connections, protocol helpers), VPN (WireGuard with QR clients, L2TP/SSTP/OpenVPN servers, VPN users, IPsec site-to-site, VPN clients), Hotspot (portals, vouchers, plans, walled garden), Certificates (create and sign)
  - **Traffic**: Traffic Management (bandwidth limits, queue tree, queue types incl. CAKE), Routing (static, policy routing, OSPF, BGP, route filters)
  - **Services**: DDNS & UPnP, SNMP/NetFlow/neighbor discovery, NTP server, proxies, device access (WinBox MAC, SSH, RoMON), Automation (schedules, scripts with Run, Netwatch), Logging & Alerts (rules, syslog destinations, SMTP), Containers (start/stop, veth, env, mounts, registry)
  - **Administration**: Users & Access, System (identity, time, health, RouterBOARD, login note, watchdog, theme, restart), Maintenance (backup/restore, export, updates, firmware, files, reset)

## Requirements

- RouterOS **v7.1+** (REST API)
- The `www-ssl` (recommended) or `www` service enabled under **IP → Services**

## Develop

```sh
pnpm install
pnpm tauri dev
```

Use **"Explore with a simulated router"** on the sign-in screen to try every page without hardware.
The UI also runs in a plain browser via `pnpm dev`, but only in demo mode: real connections go through the Rust backend.

## Build

```sh
pnpm tauri build
```

## How it works

The webview never talks to the router directly. `src-tauri/src/lib.rs` exposes commands
(`ros_connect`, `ros_disconnect`, `ros_request`) that proxy RouterOS REST calls with `reqwest`,
plus `wg_generate_keypair` and `write_text_file` for VPN clients and exports.
That avoids CORS and accepts the router's self-signed certificate. The password stays in memory
only; host, port and username are remembered in local storage.

## Security & privacy

- **Certificate pinning (trust on first use).** RouterOS uses self-signed certificates, so instead of turning verification off the app shows the router's SHA-256 fingerprint on first connect, remembers it, and refuses to connect (with a warning) if it ever changes. Compare it with `/certificate print detail` on the router.
- **Credentials** live only in memory in the Rust process for the session. They are never written to disk or exposed to web storage; only host, port, username and certificate fingerprints are remembered.
- **Plain HTTP** (`www` service) works but sends the password unencrypted. The sign-in screen warns about this.
- **Locked-down webview:** strict Content-Security-Policy, only the core Tauri permissions, and Rust validates every request (allowed methods, RouterOS menu paths only, bare host names, no redirects). Files are only written to a location picked in a native save dialog.
- **No telemetry or third-party calls.** Fonts and the MAC vendor database are bundled; the app only talks to your router.
- Run `cargo test` in `src-tauri` for the request-validation tests. To check pinning against a live HTTPS server, run `PIN_TEST_PORT=… PIN_TEST_FP=… cargo test pinning_live -- --ignored`.
