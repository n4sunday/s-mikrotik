import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveIcon, CopyIcon, DownloadIcon, FileTextIcon, RefreshCwIcon, RotateCcwIcon, UploadCloudIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton, EmptyState, PageHeader, Panel, SettingRow, Spinner } from "@/components/common";
import { useRosItem, useRosList } from "@/hooks/use-ros";
import { execute, ros, saveTextFile } from "@/lib/api";
import { useSession } from "@/lib/session";
import { errorMessage, formatBytes } from "@/lib/utils";

function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  async function act(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  return { busy, act };
}

export function MaintenanceSettings() {
  return (
    <>
      <PageHeader title="Maintenance" description="Backups, configuration export, software updates and files." />
      <div className="space-y-6">
        <BackupPanel />
        <UpdatesPanel />
        <FilesPanel />
        <ResetPanel />
      </div>
    </>
  );
}

function BackupPanel() {
  const qc = useQueryClient();
  const identity = useRosItem("system/identity");
  const { busy, act } = useAction();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [exported, setExported] = useState<string | null>(null);

  const defaultName = `${identity.data?.name ?? "router"}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Panel title="Backup & Export" bodyClassName="py-1 divide-y">
      <SettingRow label="Create backup" description="Binary backup stored on the router (Files). Restore needs the same device model.">
        <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} />
        <Input className="w-40" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (optional)" />
        <Button
          size="sm"
          disabled={!!busy}
          onClick={() =>
            act(
              "backup",
              async () => {
                await ros.run("system/backup/save", { name: name || defaultName, ...(password ? { password } : { "dont-encrypt": "yes" }) });
                qc.invalidateQueries({ queryKey: ["ros", "file"] });
              },
              "Backup saved on the router",
            )
          }
        >
          {busy === "backup" ? <Spinner className="text-primary-foreground" /> : <ArchiveIcon />} Back up
        </Button>
      </SettingRow>
      <SettingRow label="Export configuration" description="Readable script of the whole config. Can be pasted into a terminal to restore.">
        <div className="flex items-center gap-2">
          <Switch id="sensitive" checked={sensitive} onCheckedChange={setSensitive} />
          <Label htmlFor="sensitive" className="text-muted-foreground">Include secrets</Label>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => act("export", async () => setExported(await execute(sensitive ? "/export show-sensitive" : "/export")))}
        >
          {busy === "export" ? <Spinner /> : <FileTextIcon />} Export
        </Button>
      </SettingRow>

      <Dialog open={exported !== null} onOpenChange={(o) => !o && setExported(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configuration export</DialogTitle>
            <DialogDescription>{exported?.split("\n").length ?? 0} lines</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">{exported}</pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(exported ?? "").then(() => toast.success("Copied"))}>
              <CopyIcon /> Copy
            </Button>
            <Button onClick={() => saveTextFile(`${defaultName}.rsc`, exported ?? "")}>
              <DownloadIcon /> Save .rsc
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function UpdatesPanel() {
  const qc = useQueryClient();
  const { disconnect } = useSession();
  const update = useRosItem("system/package/update");
  const packages = useRosList("system/package");
  const board = useRosItem("system/routerboard");
  const { busy, act } = useAction();

  const u = update.data;
  const hasUpdate = u?.["latest-version"] && u["installed-version"] && u["latest-version"] !== u["installed-version"];
  const b = board.data;
  const fwUpgrade = b?.["upgrade-firmware"] && b["current-firmware"] !== b["upgrade-firmware"];

  return (
    <Panel title="Software" bodyClassName="py-1 divide-y">
      <SettingRow
        label={
          <span className="flex items-center gap-2">
            RouterOS {u?.["installed-version"]}
            {hasUpdate && <Badge className="bg-primary/15 text-primary">{u?.["latest-version"]} available</Badge>}
          </span>
        }
        description={u?.status ?? "Check MikroTik's servers for a newer version."}
      >
        <Select
          value={u?.channel}
          onValueChange={(channel) =>
            act("channel", async () => {
              await ros.run("system/package/update/set", { channel });
              qc.invalidateQueries({ queryKey: ["ros", "system/package/update"] });
            })
          }
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            {["stable", "long-term", "testing", "development"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() =>
            act("check", async () => {
              await ros.run("system/package/update/check-for-updates", { once: "" });
              await qc.invalidateQueries({ queryKey: ["ros", "system/package/update"] });
            })
          }
        >
          {busy === "check" ? <Spinner /> : <RefreshCwIcon />} Check
        </Button>
        {hasUpdate && (
          <ConfirmButton
            title={`Install RouterOS ${u?.["latest-version"]}?`}
            description="The router downloads the update and reboots. You'll be disconnected."
            confirmLabel="Install & Reboot"
            destructive={false}
            onConfirm={() =>
              act("install", async () => {
                await ros.run("system/package/update/install").catch(() => {});
                toast.success("Installing update, the router will reboot");
                await disconnect();
              })
            }
          >
            <Button size="sm">
              <UploadCloudIcon /> Install
            </Button>
          </ConfirmButton>
        )}
      </SettingRow>

      {b?.routerboard === "true" && (
        <SettingRow
          label={
            <span className="flex items-center gap-2">
              RouterBOARD firmware {b["current-firmware"]}
              {fwUpgrade && <Badge className="bg-primary/15 text-primary">{b["upgrade-firmware"]} ready</Badge>}
            </span>
          }
          description="Firmware upgrades take effect after a reboot."
        >
          <Button
            size="sm"
            variant="outline"
            disabled={!fwUpgrade || !!busy}
            onClick={() =>
              act(
                "fw",
                async () => {
                  await ros.run("system/routerboard/upgrade");
                  qc.invalidateQueries({ queryKey: ["ros", "system/routerboard"] });
                },
                "Firmware upgraded, reboot to apply",
              )
            }
          >
            Upgrade Firmware
          </Button>
        </SettingRow>
      )}

      <div className="py-3">
        <div className="mb-2 font-medium">Installed packages</div>
        <div className="flex flex-wrap gap-1.5">
          {packages.data?.map((p) => (
            <Badge key={p[".id"]} variant="secondary" className={p.disabled === "true" ? "opacity-50" : undefined}>
              {p.name} {p.version}
            </Badge>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function FilesPanel() {
  const qc = useQueryClient();
  const files = useRosList("file");
  const { disconnect } = useSession();
  const { act } = useAction();
  const refresh = () => qc.invalidateQueries({ queryKey: ["ros", "file"] });

  return (
    <Panel title="Files" bodyClassName="p-0">
      {!files.data?.length ? (
        <EmptyState title="No files" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.data
              .filter((f) => f.type !== "directory")
              .map((f) => (
                <TableRow key={f[".id"]} className="group h-10">
                  <TableCell className="pl-4 font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground">{f.type}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBytes(Number(f.size ?? 0))}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{f["creation-time"] ?? f["last-modified"]}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <span className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {f.type === "backup" && (
                        <ConfirmButton
                          title={`Restore ${f.name}?`}
                          description="The router loads this backup and reboots. Encrypted backups need their password (use the Terminal: /system backup load)."
                          confirmLabel="Restore & Reboot"
                          onConfirm={() =>
                            act("restore", async () => {
                              await ros.run("system/backup/load", { name: f.name }).catch(() => {});
                              toast.success("Restoring backup, the router will reboot");
                              await disconnect();
                            })
                          }
                        >
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" title="Restore">
                            <RotateCcwIcon />
                          </Button>
                        </ConfirmButton>
                      )}
                      <ConfirmButton
                        title={`Delete ${f.name}?`}
                        onConfirm={() => act("rm", () => ros.remove("file", f[".id"]).finally(refresh), "File deleted")}
                      />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}

function ResetPanel() {
  const { disconnect } = useSession();
  const identity = useRosItem("system/identity");
  const [keepDefaults, setKeepDefaults] = useState(true);
  const [confirm, setConfirm] = useState("");
  const name = identity.data?.name ?? "";

  return (
    <Panel title="Danger Zone" className="border-destructive/30" bodyClassName="py-1">
      <SettingRow label="Reset configuration" description="Erases all settings. A backup is saved automatically before the reset.">
        <div className="flex items-center gap-2">
          <Switch id="defaults" checked={keepDefaults} onCheckedChange={setKeepDefaults} />
          <Label htmlFor="defaults" className="text-muted-foreground">Load default config</Label>
        </div>
        <ConfirmButton
          title="Reset the router?"
          description={`Everything is erased${keepDefaults ? " and the default configuration is loaded" : ", leaving the router unconfigured"}. You will lose access through this app.`}
          confirmLabel="Reset"
          onConfirm={async () => {
            if (confirm !== name) return toast.error("Type the device name to confirm");
            await ros.run("system/reset-configuration", { "no-defaults": keepDefaults ? "no" : "yes", "skip-backup": "no" }).catch(() => {});
            toast.success("Router is resetting");
            await disconnect();
          }}
        >
          <Button variant="destructive" size="sm" disabled={confirm !== name || !name}>
            Reset
          </Button>
        </ConfirmButton>
      </SettingRow>
      <div className="pb-3">
        <Input className="w-72" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={`Type "${name}" to enable reset`} />
      </div>
    </Panel>
  );
}
