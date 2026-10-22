import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Columns3Icon, PencilIcon, PlusIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmButton, EmptyState, LoadingBlock, Panel, Spinner } from "@/components/common";
import { ros, type RosRecord } from "@/lib/api";
import { cn, errorMessage, isTrue } from "@/lib/utils";

/** Properties RouterOS reports but won't accept in `set`. */
const READ_ONLY = new Set([
  ".id", ".nextid", "dynamic", "running", "invalid", "inactive", "active", "status", "slave", "builtin", "default",
  "bytes", "packets", "rate", "packet-rate", "queued-bytes", "queued-packets", "dropped", "total-bytes", "total-packets",
  "rx-byte", "tx-byte", "rx-packet", "tx-packet", "rx-drop", "tx-drop", "rx-error", "tx-error", "tx-queue-drop",
  "fp-rx-byte", "fp-tx-byte", "fp-rx-packet", "fp-tx-packet", "link-downs", "last-link-up-time", "last-link-down-time",
  "actual-mtu", "default-name", "uptime", "creation-time", "last-seen", "expires-after", "active-address",
  "active-mac-address", "active-client-id", "active-server", "host-name", "age", "size", "type", "public-key",
  "current-firmware", "factory-firmware", "upgrade-firmware", "serial-number", "model", "revision", "version",
  "build-time", "cpu", "cpu-count", "cpu-frequency", "cpu-load", "free-memory", "total-memory", "free-hdd-space",
  "total-hdd-space", "architecture-name", "board-name", "platform", "write-sect-total", "write-sect-since-reboot",
  "bad-blocks", "last-logged-in", "last-handshake", "rx", "tx", "current-tx-powers", "mac-address-actual",
]);

const PRIORITY = ["name", "address", "interface", "list", "chain", "action", "dst-address", "gateway", "target", "max-limit", "src-address", "protocol", "dst-port", "type", "mac-address", "user", "group", "server", "status", "value"];

function isReadOnly(key: string, record?: Record<string, string | undefined>) {
  if (READ_ONLY.has(key)) return true;
  // Counters and stats usually end like this.
  if (/-(bytes|packets|count|errors|drops)$/.test(key)) return true;
  return isTrue(record?.dynamic) && key !== "comment";
}

function isBool(v: string | undefined) {
  return v === "true" || v === "false";
}

function pickColumns(rows: RosRecord[], all: boolean) {
  const keys = new Set<string>();
  for (const r of rows.slice(0, 50)) for (const k of Object.keys(r)) keys.add(k);
  [".id", "disabled", "dynamic", "comment", ".nextid"].forEach((k) => keys.delete(k));
  const ordered = [...PRIORITY.filter((k) => keys.has(k)), ...[...keys].filter((k) => !PRIORITY.includes(k)).sort()];
  return all ? ordered : ordered.slice(0, 6);
}

export function GenericMenu({ path, title }: { path: string; title: string }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ros", path],
    queryFn: () => ros.get<RosRecord[] | Record<string, string> | null>(path),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["ros", path] });

  if (query.isLoading) return <LoadingBlock />;
  if (query.isError)
    return (
      <EmptyState
        title="Menu not available"
        description={`${errorMessage(query.error)}. The package may not be installed on this router.`}
      />
    );
  if (Array.isArray(query.data)) return <GenericTable path={path} title={title} rows={query.data} onRefresh={refresh} fetching={query.isFetching} />;
  return <GenericSingleton path={path} title={title} record={query.data ?? {}} onRefresh={refresh} />;
}

function GenericTable({
  path,
  title,
  rows,
  onRefresh,
  fetching,
}: {
  path: string;
  title: string;
  rows: RosRecord[];
  onRefresh: () => void;
  fetching: boolean;
}) {
  const [search, setSearch] = useState("");
  const [allColumns, setAllColumns] = useState(false);
  const [editing, setEditing] = useState<RosRecord | null>(null);
  const [creating, setCreating] = useState(false);

  const columns = useMemo(() => pickColumns(rows, allColumns), [rows, allColumns]);
  const hasDisabled = rows.some((r) => r.disabled !== undefined);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r).some((v) => v?.toLowerCase().includes(q)));
  }, [rows, search]);

  // Keys seen on other rows make a good starting form for new ones.
  const suggested = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) if (!isReadOnly(k) && k !== "disabled") keys.add(k);
    return [...PRIORITY.filter((k) => keys.has(k)), ...[...keys].filter((k) => !PRIORITY.includes(k))];
  }, [rows]);

  async function mutate(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    } finally {
      onRefresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${rows.length} items`} className="h-8 pl-8" />
        </div>
        <Button variant={allColumns ? "secondary" : "ghost"} size="sm" onClick={() => setAllColumns((a) => !a)}>
          <Columns3Icon /> {allColumns ? "Fewer columns" : "All columns"}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRefresh} title="Refresh">
          <RefreshCwIcon className={cn(fetching && "animate-spin")} />
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon /> Add
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()}`} description={search ? "Nothing matches your search." : "This menu is empty."} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {hasDisabled && <TableHead className="w-14 pl-4">Enabled</TableHead>}
                {columns.map((c) => (
                  <TableHead key={c} className={cn("whitespace-nowrap", !hasDisabled && c === columns[0] && "pl-4")}>
                    {c}
                  </TableHead>
                ))}
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const dynamic = isTrue(r.dynamic);
                const disabled = isTrue(r.disabled);
                return (
                  <TableRow key={r[".id"] ?? JSON.stringify(r)} className={cn("group h-10 cursor-pointer", disabled && "text-muted-foreground")} onClick={() => setEditing(r)}>
                    {hasDisabled && (
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        {dynamic ? (
                          <Badge variant="secondary" className="text-[10px]">Dynamic</Badge>
                        ) : (
                          <Switch
                            size="sm"
                            checked={!disabled}
                            onCheckedChange={(c) => mutate(() => ros.update(path, r[".id"], { disabled: String(!c) })).catch(() => {})}
                          />
                        )}
                      </TableCell>
                    )}
                    {columns.map((c, i) => (
                      <TableCell key={c} className={cn("max-w-64 truncate", !hasDisabled && i === 0 && "pl-4", i === 0 && "font-medium")}>
                        {r[c] ?? <span className="text-muted-foreground/50">—</span>}
                        {i === 0 && r.comment && <div className="truncate text-xs font-normal text-muted-foreground">{r.comment}</div>}
                      </TableCell>
                    ))}
                    <TableCell className="pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {r[".id"] && !dynamic && (
                        <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setEditing(r)}>
                            <PencilIcon />
                          </Button>
                          <ConfirmButton
                            title="Remove this item?"
                            description={`Removes ${r.name ?? r[".id"]} from ${path}.`}
                            onConfirm={() => mutate(() => ros.remove(path, r[".id"]), "Removed").catch(() => {})}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <PropertySheet
        open={creating}
        onOpenChange={setCreating}
        title={`Add to ${title}`}
        description={`/${path}`}
        suggestedKeys={suggested}
        onSubmit={(body) => mutate(() => ros.create(path, body), "Added")}
      />
      <PropertySheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.name ?? editing?.[".id"] ?? "Edit"}
        description={`/${path}`}
        record={editing ?? undefined}
        onSubmit={(body) => mutate(() => ros.update(path, editing![".id"], body), "Changes applied")}
      />
    </div>
  );
}

function GenericSingleton({
  path,
  title,
  record,
  onRefresh,
}: {
  path: string;
  title: string;
  record: Record<string, string>;
  onRefresh: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(record);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(record), [record]);

  const keys = Object.keys(record);
  const editable = keys.filter((k) => !isReadOnly(k));
  const readOnly = keys.filter((k) => isReadOnly(k));
  const changed = Object.fromEntries(editable.filter((k) => values[k] !== record[k]).map((k) => [k, values[k]]));
  const dirty = Object.keys(changed).length > 0;

  async function apply() {
    setSaving(true);
    try {
      await ros.run(`${path}/set`, changed);
      toast.success(`${title} updated`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
      onRefresh();
    }
  }

  if (keys.length === 0) return <EmptyState title="No properties" description="This menu returned no settings." />;

  return (
    <div className="space-y-4">
      <Panel
        title="Settings"
        bodyClassName="py-1 divide-y"
        actions={
          <>
            <Button variant="ghost" size="sm" disabled={!dirty} onClick={() => setValues(record)}>
              Reset
            </Button>
            <Button size="sm" disabled={!dirty || saving} onClick={apply}>
              {saving && <Spinner className="text-primary-foreground" />} Apply Changes
            </Button>
          </>
        }
      >
        {editable.length === 0 && <div className="py-3 text-muted-foreground">Nothing editable here.</div>}
        {editable.map((k) => (
          <div key={k} className="flex items-center justify-between gap-6 py-2.5">
            <Label htmlFor={`s-${k}`} className={cn("font-medium", values[k] !== record[k] && "text-primary")}>
              {k}
            </Label>
            {isBool(record[k]) ? (
              <Switch id={`s-${k}`} checked={values[k] === "true"} onCheckedChange={(c) => setValues((v) => ({ ...v, [k]: String(c) }))} />
            ) : (
              <Input
                id={`s-${k}`}
                className="w-80"
                value={values[k] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                spellCheck={false}
              />
            )}
          </div>
        ))}
      </Panel>
      {readOnly.length > 0 && (
        <Panel title="Status">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
            {readOnly.map((k) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="truncate font-medium tabular-nums">{record[k] || "—"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}
    </div>
  );
}

interface Entry {
  key: string;
  value: string;
  original?: string;
  custom?: boolean;
}

/** Key/value editor for any RouterOS item. Only changed properties are sent. */
export function PropertySheet({
  open,
  onOpenChange,
  title,
  description,
  record,
  suggestedKeys = [],
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  record?: Record<string, string | undefined>;
  suggestedKeys?: string[];
  onSubmit: (body: Record<string, string>) => Promise<unknown>;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (record) {
      setEntries(
        Object.entries(record)
          .filter(([k]) => !isReadOnly(k, record))
          .map(([key, v]) => ({ key, value: v ?? "", original: v ?? "" })),
      );
    } else {
      setEntries(suggestedKeys.map((key) => ({ key, value: "" })));
    }
    // Only re-seed when the sheet opens or a different record is edited.
  }, [open, record]);

  const readOnly = record ? Object.entries(record).filter(([k]) => isReadOnly(k, record)) : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, string> = {};
    for (const en of entries) {
      const key = en.key.trim();
      if (!key) continue;
      if (record ? en.value !== en.original : en.value !== "") body[key] = en.value;
    }
    if (Object.keys(body).length === 0) return onOpenChange(false);
    setSaving(true);
    try {
      await onSubmit(body);
      onOpenChange(false);
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  const set = (i: number, patch: Partial<Entry>) => setEntries((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <form onSubmit={submit} className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle className="truncate">{title}</SheetTitle>
            {description && <SheetDescription className="font-mono text-xs">{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {entries.map((en, i) => (
              <div key={i} className="grid grid-cols-[160px_1fr_auto] items-center gap-2">
                {en.custom ? (
                  <Input value={en.key} onChange={(e) => set(i, { key: e.target.value })} placeholder="property" className="h-8 font-mono text-xs" />
                ) : (
                  <Label className={cn("truncate font-mono text-xs", record && en.value !== en.original && "text-primary")} title={en.key}>
                    {en.key}
                  </Label>
                )}
                {isBool(en.original) ? (
                  <div className="flex h-8 items-center">
                    <Switch checked={en.value === "true"} onCheckedChange={(c) => set(i, { value: String(c) })} />
                  </div>
                ) : (
                  <Input value={en.value} onChange={(e) => set(i, { value: e.target.value })} className="h-8" spellCheck={false} />
                )}
                {en.custom || !record ? (
                  <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setEntries((l) => l.filter((_, j) => j !== i))}>
                    <XIcon />
                  </Button>
                ) : (
                  <span className="w-7" />
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEntries((l) => [...l, { key: "", value: "", custom: true }])}>
              <PlusIcon /> Add property
            </Button>

            {readOnly.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Read-only</div>
                <dl className="grid grid-cols-[160px_1fr] gap-y-1.5">
                  {readOnly.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="truncate font-mono text-xs text-muted-foreground">{k}</dt>
                      <dd className="truncate text-xs tabular-nums">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner className="text-primary-foreground" />}
              {record ? "Apply Changes" : "Add"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
