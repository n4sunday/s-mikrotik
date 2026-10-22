import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, SettingRow, Spinner } from "@/components/common";
import type { FieldDef, Option } from "@/components/resource-form";
import { ros } from "@/lib/api";
import { cn, errorMessage, isTrue } from "@/lib/utils";

const optValue = (o: Option) => (typeof o === "string" ? o : o.value);
const optLabel = (o: Option) => (typeof o === "string" ? o : o.label);

/** Normalise booleans so "yes"/"true" compare equal after a round-trip. */
function initial(fields: FieldDef[], record: Record<string, string>) {
  const v: Record<string, string> = {};
  for (const f of fields) {
    const raw = record[f.name];
    v[f.name] = f.type === "switch" ? String(isTrue(raw)) : (raw ?? "");
  }
  return v;
}

/**
 * UniFi-style panel for a RouterOS settings menu (one object, changed with
 * `.../set`), e.g. `/ip/upnp` or `/snmp`.
 */
export function SettingsPanel({
  path,
  title,
  description,
  fields,
  status,
  actions,
  className,
}: {
  path: string;
  title: ReactNode;
  description?: ReactNode;
  fields: FieldDef[];
  /** Read-only properties shown above the form, as [key, label]. */
  status?: [string, string][];
  actions?: ReactNode;
  className?: string;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ros", path],
    queryFn: async () => {
      const res = await ros.get<Record<string, string> | Record<string, string>[]>(path);
      // Some menus answer with a one-element list.
      return (Array.isArray(res) ? res[0] : res) ?? {};
    },
  });
  const record = useMemo(() => query.data ?? {}, [query.data]);
  // Callers usually pass `fields` inline, so key the memo on their shape, not identity.
  const shape = fields.map((f) => `${f.name}:${f.type ?? ""}`).join();
  const original = useMemo(() => initial(fields, record), [shape, record]);
  const [values, setValues] = useState(original);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(original), [original]);

  const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== original[k]));
  const dirty = Object.keys(changed).length > 0;

  async function apply() {
    setSaving(true);
    try {
      await ros.run(`${path}/set`, changed);
      toast.success(`${typeof title === "string" ? title : "Settings"} updated`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
      qc.invalidateQueries({ queryKey: ["ros", path] });
    }
  }

  const visible = fields.filter((f) => !f.when || f.when(values));

  return (
    <Panel
      className={className}
      title={title}
      actions={
        query.isError ? undefined : (
          <>
            {actions}
            {dirty && (
              <Button variant="ghost" size="sm" onClick={() => setValues(original)}>
                Reset
              </Button>
            )}
            <Button size="sm" disabled={!dirty || saving} onClick={apply}>
              {saving && <Spinner className="text-primary-foreground" />} Apply
            </Button>
          </>
        )
      }
      bodyClassName="py-1 divide-y"
    >
      {description && <p className="py-3 text-muted-foreground">{description}</p>}
      {query.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : query.isError ? (
        <p className="py-4 text-muted-foreground">Not available on this router ({errorMessage(query.error)}).</p>
      ) : (
        <>
          {status && status.some(([k]) => record[k]) && (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 py-3 sm:grid-cols-3">
              {status
                .filter(([k]) => record[k])
                .map(([k, label]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="truncate font-medium tabular-nums">{record[k]}</dd>
                  </div>
                ))}
            </dl>
          )}
          {visible.map((f) => (
            <SettingField
              key={f.name}
              field={f}
              value={values[f.name] ?? ""}
              changed={values[f.name] !== original[f.name]}
              onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
            />
          ))}
        </>
      )}
    </Panel>
  );
}

function SettingField({
  field,
  value,
  changed,
  onChange,
}: {
  field: FieldDef;
  value: string;
  changed: boolean;
  onChange: (v: string) => void;
}) {
  const label = <span className={cn(changed && "text-primary")}>{field.label}</span>;

  if (field.type === "textarea") {
    return (
      <div className="space-y-2 py-3">
        <div className="font-medium">{label}</div>
        {field.description && <div className="text-muted-foreground">{field.description}</div>}
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className="min-h-24 font-mono text-xs" spellCheck={false} />
      </div>
    );
  }

  let control: ReactNode;
  if (field.type === "switch") {
    const checked = field.invert ? value !== "true" : value === "true";
    control = <Switch checked={checked} onCheckedChange={(c) => onChange(String(field.invert ? !c : c))} />;
  } else if (field.type === "select") {
    control = (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((o) => (
            <SelectItem key={optValue(o)} value={optValue(o)}>
              {optLabel(o)}
            </SelectItem>
          ))}
          {value && !field.options?.some((o) => optValue(o) === value) && <SelectItem value={value}>{value}</SelectItem>}
        </SelectContent>
      </Select>
    );
  } else {
    control = (
      <Input
        className="w-72"
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
    );
  }

  return (
    <SettingRow label={label} description={field.description}>
      {control}
    </SettingRow>
  );
}

/** Page with a header and UniFi-style tabs. */
export function TabbedPage({
  title,
  description,
  tabs,
  actions,
}: {
  title: string;
  description?: string;
  tabs: { id: string; label: string; content: ReactNode }[];
  actions?: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />
      <Tabs defaultValue={tabs[0].id}>
        <TabsList className="mb-4 flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.id} value={t.id} className="space-y-6">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

/** Small heading between stacked tables inside a tab. */
export function SubHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="-mb-3">
      <h2 className="font-medium">{title}</h2>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Common renderers for table cells. */
export const cell = {
  muted: (v?: string) => <span className="text-muted-foreground">{v || "—"}</span>,
  mono: (v?: string) => <span className="font-mono text-xs">{v || "—"}</span>,
  strong: (v?: string) => <span className="font-medium">{v || "—"}</span>,
};

export const YES_NO = ["yes", "no"];

/** Names from another menu, for select options (e.g. interfaces, profiles). */
export function useOptions(path: string, key = "name") {
  const query = useQuery({ queryKey: ["ros", path], queryFn: () => ros.list(path) });
  return useMemo(() => [...new Set((query.data ?? []).map((r) => r[key]).filter(Boolean) as string[])], [query.data, key]);
}
