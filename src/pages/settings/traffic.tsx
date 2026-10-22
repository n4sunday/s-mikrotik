import { useState } from "react";
import { GaugeIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton, EmptyState, LoadingBlock } from "@/components/common";
import { CrudTable } from "@/components/crud-table";
import { TabbedPage, cell, useOptions } from "@/components/settings-kit";
import { ResourceSheet, type FieldDef } from "@/components/resource-form";
import { useRosList, useRosMutations } from "@/hooks/use-ros";
import type { RosRecord } from "@/lib/api";
import { useClients } from "@/lib/network";
import { cn, formatBps, isTrue } from "@/lib/utils";

/** "10M" / "512k" / "0" -> bits per second. */
function parseRate(v?: string) {
  if (!v) return 0;
  const m = v.trim().match(/^([\d.]+)\s*([kMG]?)/);
  if (!m) return 0;
  return Number(m[1]) * ({ "": 1, k: 1e3, M: 1e6, G: 1e9 } as Record<string, number>)[m[2]];
}

/** Simple queue `max-limit` is "upload/download" from the target's point of view. */
function limits(q: RosRecord) {
  const [up, down] = (q["max-limit"] ?? "0/0").split("/");
  return { up: parseRate(up), down: parseRate(down) };
}

function Usage({ value, limit }: { value: number; limit: number }) {
  const pct = limit ? Math.min(100, (value / limit) * 100) : 0;
  return (
    <div className="flex min-w-36 flex-col gap-1">
      <div className="flex justify-between text-xs tabular-nums">
        <span>{formatBps(value)}</span>
        <span className="text-muted-foreground">{limit ? formatBps(limit) : "Unlimited"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", pct > 90 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LimitsTab() {
  const queues = useRosList("queue/simple", { refetchInterval: 3000 });
  const { create, update, remove } = useRosMutations("queue/simple");
  const { clients } = useClients();
  const [editing, setEditing] = useState<RosRecord | null>(null);
  const [creating, setCreating] = useState(false);

  const fields: FieldDef[] = [
    { name: "name", label: "Name", required: true },
    {
      name: "target",
      label: "Device or subnet",
      type: "select",
      required: true,
      options: [
        ...clients.filter((c) => c.ip).map((c) => ({ label: `${c.name} (${c.ip})`, value: `${c.ip}/32` })),
        ...(editing?.target && !clients.some((c) => `${c.ip}/32` === editing.target) ? [editing.target] : []),
      ],
    },
    { name: "down", label: "Download limit (Mbps)", type: "number", placeholder: "Unlimited" },
    { name: "up", label: "Upload limit (Mbps)", type: "number", placeholder: "Unlimited" },
    { name: "comment", label: "Description" },
  ];

  const toBody = (v: Record<string, string>) => ({
    name: v.name,
    target: v.target,
    "max-limit": `${v.up ? `${v.up}M` : "0"}/${v.down ? `${v.down}M` : "0"}`,
    ...(v.comment ? { comment: v.comment } : {}),
  });

  const record = editing && {
    name: editing.name,
    target: editing.target,
    down: limits(editing).down ? String(limits(editing).down / 1e6) : "",
    up: limits(editing).up ? String(limits(editing).up / 1e6) : "",
    comment: editing.comment,
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Limit how fast a device or subnet can download and upload.</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <PlusIcon /> Create Limit
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {queues.isLoading ? (
          <LoadingBlock />
        ) : !queues.data?.length ? (
          <EmptyState icon={<GaugeIcon />} title="No bandwidth limits" description="Limit how fast a device can download or upload." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 pl-4">Enabled</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Download</TableHead>
                <TableHead>Upload</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.data.map((q) => {
                const l = limits(q);
                const [rateUp, rateDown] = (q.rate ?? "0/0").split("/").map(Number);
                const dynamic = isTrue(q.dynamic);
                return (
                  <TableRow key={q[".id"]} className="group h-14 cursor-pointer" onClick={() => !dynamic && setEditing(q)}>
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Switch size="sm" checked={!isTrue(q.disabled)} disabled={dynamic} onCheckedChange={(c) => update.mutate({ id: q[".id"], body: { disabled: String(!c) } })} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{q.name}</div>
                      {q.comment && <div className="text-xs text-muted-foreground">{q.comment}</div>}
                    </TableCell>
                    <TableCell className="tabular-nums">{q.target}</TableCell>
                    <TableCell><Usage value={rateDown || 0} limit={l.down} /></TableCell>
                    <TableCell><Usage value={rateUp || 0} limit={l.up} /></TableCell>
                    <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                      {!dynamic && (
                        <span className="opacity-0 transition-opacity group-hover:opacity-100">
                          <ConfirmButton title="Delete this limit?" onConfirm={() => remove.mutate(q[".id"])} />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ResourceSheet open={creating} onOpenChange={setCreating} title="Create Bandwidth Limit" fields={fields} onSubmit={(_b, v) => create.mutateAsync(toBody(v))} />
      <ResourceSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
        fields={fields}
        record={record ?? undefined}
        onSubmit={(_b, v) => update.mutateAsync({ id: editing![".id"], body: toBody(v) })}
      />
    </>
  );
}

export function TrafficSettings() {
  return (
    <TabbedPage
      title="Traffic Management"
      description="Bandwidth limits, hierarchical shaping and queue disciplines."
      tabs={[
        { id: "limits", label: "Bandwidth Limits", content: <LimitsTab /> },
        { id: "tree", label: "Queue Tree", content: <QueueTree /> },
        { id: "types", label: "Queue Types", content: <QueueTypes /> },
      ]}
    />
  );
}

function QueueTree() {
  const ifaces = useOptions("interface");
  const tree = useOptions("queue/tree");
  const types = useOptions("queue/type");
  return (
    <CrudTable
      path="queue/tree"
      noun="Queue"
      refetchInterval={5000}
      emptyText="Shape traffic marked by Mangle rules, e.g. give VoIP priority on the WAN."
      columns={[
        { key: "name", header: "Name", className: "font-medium" },
        { key: "parent", header: "Parent" },
        { key: "packet-mark", header: "Packet mark", render: (r) => cell.muted(r["packet-mark"]) },
        { key: "priority", header: "Priority" },
        { key: "max-limit", header: "Max limit", render: (r) => cell.muted(r["max-limit"]) },
        { key: "rate", header: "Rate", render: (r) => <span className="tabular-nums">{formatBps(Number(r.rate ?? 0))}</span> },
      ]}
      defaults={{ priority: "8", queue: "default" }}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "parent", label: "Parent", type: "select", options: ["global", ...ifaces, ...tree], required: true },
        { name: "packet-mark", label: "Packet mark", placeholder: "From a Mangle rule" },
        { name: "priority", label: "Priority (1 = highest)", type: "number" },
        { name: "limit-at", label: "Guaranteed rate", placeholder: "5M" },
        { name: "max-limit", label: "Maximum rate", placeholder: "50M" },
        { name: "queue", label: "Queue type", type: "select", options: types },
        { name: "comment", label: "Description" },
      ]}
    />
  );
}

function QueueTypes() {
  return (
    <CrudTable
      path="queue/type"
      noun="Queue Type"
      showToggle={false}
      columns={[
        { key: "name", header: "Name", className: "font-medium" },
        { key: "kind", header: "Kind" },
        { key: "pcq-rate", header: "PCQ rate", render: (r) => cell.muted(r["pcq-rate"]) },
        { key: "pcq-classifier", header: "Classifier", render: (r) => cell.muted(r["pcq-classifier"]) },
      ]}
      defaults={{ kind: "cake" }}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "kind", label: "Kind", type: "select", options: ["cake", "fq-codel", "pcq", "sfq", "red", "pfifo", "bfifo", "mq-pfifo", "none"], required: true },
        { name: "pcq-rate", label: "Rate per connection", when: (v) => v.kind === "pcq" },
        { name: "pcq-classifier", label: "Classifier", type: "select", options: ["src-address", "dst-address", "src-port", "dst-port"], when: (v) => v.kind === "pcq" },
        { name: "cake-bandwidth", label: "Bandwidth", placeholder: "100M", when: (v) => v.kind === "cake" },
        { name: "cake-diffserv", label: "Diffserv", type: "select", options: ["diffserv3", "diffserv4", "diffserv8", "besteffort"], when: (v) => v.kind === "cake" },
      ]}
    />
  );
}
