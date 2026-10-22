import { useMemo, useState, type ReactNode } from "react";
import { PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton, EmptyState, LoadingBlock } from "@/components/common";
import { ResourceSheet, type FieldDef } from "@/components/resource-form";
import { useRosList, useRosMutations } from "@/hooks/use-ros";
import type { RosRecord } from "@/lib/api";
import { cn, isTrue } from "@/lib/utils";

export interface Column {
  key: string;
  header: string;
  render?: (row: RosRecord) => ReactNode;
  className?: string;
}

/**
 * List / create / edit / enable / delete for any RouterOS menu.
 * Dynamic rows (created by the router itself) are shown read-only.
 */
export function CrudTable({
  path,
  noun,
  columns,
  fields,
  filter,
  defaults,
  createExtra,
  searchKeys,
  toolbar,
  invalidate,
  refetchInterval,
  allowCreate = true,
  allowDelete = true,
  readOnly = false,
  showToggle = true,
  rowActions,
  emptyText,
}: {
  path: string;
  /** Singular label, e.g. "Route". */
  noun: string;
  columns: Column[];
  fields?: FieldDef[];
  filter?: (row: RosRecord) => boolean;
  defaults?: Record<string, string>;
  /** Fixed properties added to every create request (e.g. `chain`). */
  createExtra?: Record<string, string>;
  searchKeys?: string[];
  toolbar?: ReactNode;
  invalidate?: string[];
  refetchInterval?: number;
  allowCreate?: boolean;
  allowDelete?: boolean;
  /** Status tables: no create, edit, toggle or delete. */
  readOnly?: boolean;
  /** Show the Enabled switch column (menus without `disabled` should hide it). */
  showToggle?: boolean;
  /** Extra per-row buttons, e.g. "Run" for scripts. */
  rowActions?: (row: RosRecord) => ReactNode;
  emptyText?: string;
}) {
  const editable = !readOnly && !!fields;
  const toggle = showToggle && !readOnly;
  const { data, isLoading } = useRosList(path, { refetchInterval });
  const { create, update, remove } = useRosMutations(path, invalidate);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RosRecord | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    let list = data ?? [];
    if (filter) list = list.filter(filter);
    const q = query.trim().toLowerCase();
    if (q) {
      const keys = searchKeys ?? columns.map((c) => c.key);
      list = list.filter((r) => keys.some((k) => r[k]?.toLowerCase().includes(q)) || r.comment?.toLowerCase().includes(q));
    }
    return list;
  }, [data, filter, query, searchKeys, columns]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-8 pl-8" />
        </div>
        <div className="flex flex-1 items-center gap-2">{toolbar}</div>
        {allowCreate && editable && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon /> Create {noun}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title={`No ${noun.toLowerCase()}s`} description={query ? "Nothing matches your search." : emptyText} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {toggle && <TableHead className="w-14 pl-4">Enabled</TableHead>}
                {columns.map((c, i) => (
                  <TableHead key={c.key} className={cn(c.className, !toggle && i === 0 && "pl-4")}>
                    {c.header}
                  </TableHead>
                ))}
                <TableHead className={rowActions ? "w-40" : "w-20"} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const dynamic = isTrue(row.dynamic) || !editable;
                const disabled = isTrue(row.disabled);
                return (
                  <TableRow
                    key={row[".id"]}
                    className={cn("group h-11", disabled && "text-muted-foreground", !dynamic && "cursor-pointer")}
                    onClick={() => !dynamic && setEditing(row)}
                  >
                    {toggle && (
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        {dynamic ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Dynamic
                          </Badge>
                        ) : (
                          <Switch
                            size="sm"
                            checked={!disabled}
                            onCheckedChange={(c) => update.mutate({ id: row[".id"], body: { disabled: String(!c) } })}
                          />
                        )}
                      </TableCell>
                    )}
                    {columns.map((c, i) => (
                      <TableCell key={c.key} className={cn("max-w-72 truncate", c.className, !toggle && i === 0 && "pl-4")}>
                        {c.render ? c.render(row) : row[c.key] || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    ))}
                    <TableCell className="pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions && <div className="inline-flex gap-1 align-middle">{rowActions(row)}</div>}
                      {!dynamic && (
                        <div className="inline-flex justify-end gap-0.5 align-middle opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setEditing(row)}>
                            <PencilIcon />
                          </Button>
                          {allowDelete && (
                            <ConfirmButton
                              title={`Delete ${noun.toLowerCase()}?`}
                              description="This change is applied to the router immediately."
                              onConfirm={() => remove.mutate(row[".id"])}
                            />
                          )}
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

      {fields && (
        <>
          <ResourceSheet
            open={creating}
            onOpenChange={setCreating}
            title={`Create ${noun}`}
            fields={fields}
            defaults={defaults}
            onSubmit={(body) => create.mutateAsync({ ...createExtra, ...body })}
          />
          <ResourceSheet
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
            title={`Edit ${noun}`}
            description={editing?.comment}
            fields={fields}
            record={editing ?? undefined}
            onSubmit={(body) => (Object.keys(body).length ? update.mutateAsync({ id: editing![".id"], body }) : Promise.resolve())}
          />
        </>
      )}
    </div>
  );
}
