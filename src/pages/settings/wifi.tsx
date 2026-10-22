import { useState } from "react";
import { LockIcon, UsersIcon, WifiIcon, WifiOffIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState, LoadingBlock, PageHeader, StatusDot } from "@/components/common";
import { ResourceSheet, type FieldDef } from "@/components/resource-form";
import { useRosList, useRosMutations } from "@/hooks/use-ros";
import { ros, type RosRecord } from "@/lib/api";
import { useWifiMenu } from "@/lib/network";
import { cn, isTrue } from "@/lib/utils";

/** Normalises the `wifi` (7.13+) and legacy `wireless` menus into one shape. */
function describe(r: RosRecord, legacy: boolean) {
  const band = (legacy ? r.band : r["channel.band"]) ?? "";
  return {
    ssid: (legacy ? r.ssid : r["configuration.ssid"]) ?? r.ssid ?? "—",
    band: band.startsWith("2") ? "2.4 GHz" : band.startsWith("5") ? "5 GHz" : band.startsWith("6") ? "6 GHz" : band || "—",
    standard: band.split("-")[1]?.toUpperCase(),
    hidden: isTrue(legacy ? r["hide-ssid"] : r["configuration.hide-ssid"]),
    security: legacy ? r["security-profile"] : r["security.authentication-types"],
  };
}

const AUTH_OPTIONS = [
  { label: "WPA2 Personal", value: "wpa2-psk" },
  { label: "WPA2/WPA3 Personal", value: "wpa2-psk,wpa3-psk" },
  { label: "WPA3 Personal", value: "wpa3-psk" },
];

const WIFI_FIELDS: FieldDef[] = [
  { name: "configuration.ssid", label: "Network name (SSID)", required: true },
  { name: "security.passphrase", label: "Password", type: "password", description: "At least 8 characters." },
  { name: "security.authentication-types", label: "Security protocol", type: "select", options: AUTH_OPTIONS },
  { name: "configuration.hide-ssid", label: "Hide network name", type: "switch" },
  { name: "comment", label: "Description" },
  { name: "disabled", label: "Enabled", type: "switch", invert: true },
];

const LEGACY_FIELDS: FieldDef[] = [
  { name: "ssid", label: "Network name (SSID)", required: true },
  { name: "wpa2-pre-shared-key", label: "Password", type: "password", description: "Updates the radio's security profile." },
  { name: "hide-ssid", label: "Hide network name", type: "switch" },
  { name: "comment", label: "Description" },
  { name: "disabled", label: "Enabled", type: "switch", invert: true },
];

export function WifiSettings() {
  const menu = useWifiMenu();
  const path = menu.data ?? "interface/wifi";
  const legacy = path === "interface/wireless";
  const radios = useRosList(path, { enabled: !!menu.data });
  const reg = useRosList(`${path}/registration-table`, { enabled: !!menu.data, refetchInterval: 15_000 });
  const profiles = useRosList("interface/wireless/security-profiles", { enabled: legacy });
  const { update } = useRosMutations(path, ["interface"]);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<RosRecord | null>(null);

  if (menu.isLoading || radios.isLoading) return <LoadingBlock />;

  // For legacy radios, surface the profile's passphrase as an editable field.
  const editRecord =
    editing && legacy
      ? { ...editing, "wpa2-pre-shared-key": profiles.data?.find((p) => p.name === editing["security-profile"])?.["wpa2-pre-shared-key"] }
      : editing;

  async function save(body: Record<string, string>) {
    const { "wpa2-pre-shared-key": psk, ...rest } = body;
    if (psk !== undefined && legacy) {
      const profile = profiles.data?.find((p) => p.name === editing!["security-profile"]);
      if (profile) {
        await ros.update("interface/wireless/security-profiles", profile[".id"], { "wpa2-pre-shared-key": psk });
        qc.invalidateQueries({ queryKey: ["ros", "interface/wireless/security-profiles"] });
      }
    }
    if (Object.keys(rest).length) await update.mutateAsync({ id: editing![".id"], body: rest });
    toast.success("WiFi settings applied");
  }

  return (
    <>
      <PageHeader title="WiFi" description={legacy ? "Wireless radios (legacy wireless package)." : "Wireless radios (RouterOS wifi package)."} />

      {!menu.data || radios.data?.length === 0 ? (
        <EmptyState icon={<WifiOffIcon />} title="No wireless radios" description="This router doesn't expose a wifi or wireless interface." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {radios.data?.map((r) => {
            const d = describe(r, legacy);
            const disabled = isTrue(r.disabled);
            const clients = reg.data?.filter((c) => c.interface === r.name).length ?? 0;
            return (
              <div
                key={r[".id"]}
                role="button"
                tabIndex={0}
                onClick={() => setEditing(r)}
                onKeyDown={(e) => e.key === "Enter" && setEditing(r)}
                className={cn(
                  "group cursor-pointer rounded-xl border bg-card p-4 text-left transition-colors outline-none hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50",
                  disabled && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-10 items-center justify-center rounded-xl", disabled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                      <WifiIcon className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 text-[15px] font-semibold">
                        {d.ssid}
                        {d.hidden && <Badge variant="secondary" className="h-4 text-[10px]">Hidden</Badge>}
                      </div>
                      <div className="text-muted-foreground">
                        {r.name} {r.comment && `· ${r.comment}`}
                      </div>
                    </div>
                  </div>
                  <span onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={!disabled}
                      onCheckedChange={(c) => update.mutate({ id: r[".id"], body: { disabled: String(!c) } })}
                    />
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <StatusDot status={disabled ? "disabled" : isTrue(r.running) ? "online" : "warning"} />
                    {d.band}
                    {d.standard && ` · ${d.standard}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <LockIcon className="size-3.5" />
                    {AUTH_OPTIONS.find((o) => o.value === d.security)?.label ?? d.security ?? "Open"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UsersIcon className="size-3.5" />
                    {clients} {clients === 1 ? "client" : "clients"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ResourceSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Edit ${editing ? describe(editing, legacy).ssid : "WiFi"}`}
        description={editing ? `${editing.name} · ${describe(editing, legacy).band}` : undefined}
        fields={legacy ? LEGACY_FIELDS : WIFI_FIELDS}
        record={editRecord ?? undefined}
        onSubmit={save}
      />
    </>
  );
}
