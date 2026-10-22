import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, PowerIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton, PageHeader, Panel, SettingRow, Spinner } from "@/components/common";
import { useRosCommand, useRosItem, useRosList } from "@/hooks/use-ros";
import { SettingsPanel } from "@/components/settings-kit";
import { ros } from "@/lib/api";
import { useSession } from "@/lib/session";
import { cn, errorMessage, isTrue } from "@/lib/utils";

export function SystemSettings() {
  const { disconnect } = useSession();
  const identity = useRosItem("system/identity");
  const resource = useRosItem("system/resource");
  const board = useRosItem("system/routerboard");
  const clock = useRosItem("system/clock", { refetchInterval: 1000 });
  const ntp = useRosItem("system/ntp/client");
  const setIdentity = useRosCommand("system/identity/set", ["system/identity"]);
  const setClock = useRosCommand("system/clock/set", ["system/clock"]);
  const setNtp = useRosCommand("system/ntp/client/set", ["system/ntp/client"]);

  const [name, setName] = useState("");
  const [tz, setTz] = useState("");
  const [ntpServers, setNtpServers] = useState("");
  const [ntpEnabled, setNtpEnabled] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  useEffect(() => setName(identity.data?.name ?? ""), [identity.data]);
  useEffect(() => setTz(clock.data?.["time-zone-name"] ?? ""), [clock.data?.["time-zone-name"]]);
  useEffect(() => {
    setNtpServers(ntp.data?.servers ?? "");
    setNtpEnabled(isTrue(ntp.data?.enabled));
  }, [ntp.data]);

  const ntpDirty = ntp.data && (ntpServers !== (ntp.data.servers ?? "") || ntpEnabled !== isTrue(ntp.data.enabled));

  async function reboot() {
    setRebooting(true);
    try {
      await ros.run("system/reboot");
    } catch (e) {
      // The connection usually drops mid-request when the router goes down.
      console.warn(errorMessage(e));
    }
    toast.success("Router is rebooting");
    await disconnect();
  }

  const r = resource.data;
  const b = board.data;
  const info: [string, string | undefined][] = [
    ["Model", b?.model ?? r?.["board-name"]],
    ["Serial number", b?.["serial-number"]],
    ["RouterOS", r?.version],
    ["Firmware", b?.["current-firmware"] && `${b["current-firmware"]}${b["upgrade-firmware"] && b["upgrade-firmware"] !== b["current-firmware"] ? ` (upgrade to ${b["upgrade-firmware"]} available)` : ""}`],
    ["Architecture", r?.["architecture-name"]],
    ["Uptime", r?.uptime],
  ];

  return (
    <>
      <PageHeader title="System" description="Device identity, time and maintenance." />

      <div className="space-y-6">
        <Panel title="Device" bodyClassName="py-1 divide-y">
          <SettingRow label="Device name" description="Shown in the top bar and in RouterOS prompts.">
            <Input className="w-56" value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              size="sm"
              disabled={!name || name === identity.data?.name || setIdentity.isPending}
              onClick={() => setIdentity.mutate({ name }, { onSuccess: () => toast.success("Device name updated") })}
            >
              Save
            </Button>
          </SettingRow>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 py-4 sm:grid-cols-3">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Time" bodyClassName="py-1 divide-y">
          <SettingRow label="Current time">
            <span className="tabular-nums text-muted-foreground">
              {clock.data?.date} {clock.data?.time}
            </span>
          </SettingRow>
          <SettingRow label="Time zone" description="IANA name, e.g. Asia/Bangkok or Europe/Berlin.">
            <Input className="w-56" value={tz} onChange={(e) => setTz(e.target.value)} />
            <Button
              size="sm"
              disabled={!tz || tz === clock.data?.["time-zone-name"] || setClock.isPending}
              onClick={() =>
                setClock.mutate({ "time-zone-name": tz, "time-zone-autodetect": "no" }, { onSuccess: () => toast.success("Time zone updated") })
              }
            >
              Save
            </Button>
          </SettingRow>
          <SettingRow label="NTP client" description={ntp.data?.status ? `Status: ${ntp.data.status}` : "Keep the clock in sync."}>
            <Switch checked={ntpEnabled} onCheckedChange={setNtpEnabled} />
          </SettingRow>
          <SettingRow label="NTP servers">
            <Input className="w-72" value={ntpServers} onChange={(e) => setNtpServers(e.target.value)} placeholder="pool.ntp.org" />
            <Button
              size="sm"
              disabled={!ntpDirty || setNtp.isPending}
              onClick={() =>
                setNtp.mutate({ enabled: ntpEnabled ? "yes" : "no", servers: ntpServers }, { onSuccess: () => toast.success("NTP settings applied") })
              }
            >
              Save
            </Button>
          </SettingRow>
        </Panel>

        <HealthPanel />

        <SettingsPanel
          path="system/routerboard/settings"
          title="RouterBOARD"
          fields={[
            { name: "auto-upgrade", label: "Upgrade firmware automatically after RouterOS updates", type: "switch" },
            { name: "cpu-frequency", label: "CPU frequency", placeholder: "auto" },
            { name: "boot-device", label: "Boot device", type: "select", options: ["nand-if-fail-then-ethernet", "nand-only", "flash-boot", "try-ethernet-once-then-nand"] },
            { name: "protected-routerboot", label: "Protected RouterBOOT", type: "select", options: ["disabled", "enabled"] },
          ]}
        />

        <SettingsPanel
          path="system/note"
          title="Login Note"
          description="Shown when someone logs in over SSH or WinBox."
          fields={[
            { name: "show-at-login", label: "Show at login", type: "switch" },
            { name: "note", label: "Note", type: "textarea" },
          ]}
        />

        <SettingsPanel
          path="system/watchdog"
          title="Watchdog"
          description="Reboot automatically if the router hangs or a host stops answering."
          fields={[
            { name: "watchdog-timer", label: "Hardware watchdog", type: "switch" },
            { name: "watch-address", label: "Reboot if this host is unreachable", placeholder: "none" },
            { name: "auto-send-supout", label: "E-mail diagnostics after a crash", type: "switch" },
          ]}
        />

        <AppearancePanel />

        <Panel title="Maintenance" bodyClassName="py-1">
          <SettingRow label="Restart router" description="All clients will be disconnected for about a minute.">
            <ConfirmButton title="Restart the router?" description="The dashboard will disconnect. Reconnect once the router is back up." confirmLabel="Restart" onConfirm={reboot}>
              <Button variant="destructive" size="sm" disabled={rebooting}>
                {rebooting ? <Spinner /> : <PowerIcon />} Restart
              </Button>
            </ConfirmButton>
          </SettingRow>
        </Panel>
      </div>
    </>
  );
}

function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: "light", label: "Light", icon: SunIcon },
    { id: "dark", label: "Dark", icon: MoonIcon },
    { id: "system", label: "System", icon: MonitorIcon },
  ];
  return (
    <Panel title="Appearance" bodyClassName="py-1">
      <SettingRow label="Theme" description="Applies to this app only.">
        <div className="flex gap-1 rounded-lg border p-0.5">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setTheme(o.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground",
                theme === o.id && "bg-accent text-accent-foreground hover:text-accent-foreground",
              )}
            >
              <o.icon className="size-3.5" />
              {o.label}
            </button>
          ))}
        </div>
      </SettingRow>
    </Panel>
  );
}

function HealthPanel() {
  const health = useRosList("system/health", { refetchInterval: 10_000 });
  if (!health.data?.length) return null;
  const unit = (t?: string) => (t === "C" ? "°C" : t === "V" ? " V" : t === "W" ? " W" : t === "RPM" ? " RPM" : t ? ` ${t}` : "");
  return (
    <Panel title="Health">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        {health.data.map((h) => (
          <div key={h[".id"] ?? h.name}>
            <dt className="text-xs text-muted-foreground capitalize">{h.name?.replace(/-/g, " ")}</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {h.value}
              <span className="text-sm font-normal text-muted-foreground">{unit(h.type)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
