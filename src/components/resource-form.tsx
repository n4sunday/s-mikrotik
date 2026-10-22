import { Fragment, useEffect, useState, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/common";
import { cn, isTrue } from "@/lib/utils";

export type Option = string | { label: string; value: string };

export interface FieldDef {
  /** RouterOS property name, e.g. `dst-address`. */
  name: string;
  label: string;
  type?: "text" | "password" | "number" | "select" | "switch" | "textarea";
  /** Group heading shown above the first field of each section. */
  section?: string;
  placeholder?: string;
  description?: string;
  options?: Option[];
  required?: boolean;
  /** For switches bound to `disabled`: show "Enabled" semantics. */
  invert?: boolean;
  /** Only render when this returns true for the current form values. */
  when?: (values: Record<string, string>) => boolean;
}

const NONE = "__none__";

function optionValue(o: Option) {
  return typeof o === "string" ? o : o.value;
}
function optionLabel(o: Option) {
  return typeof o === "string" ? o : o.label;
}

function initialValues(fields: FieldDef[], record?: Record<string, string | undefined>, defaults?: Record<string, string>) {
  const v: Record<string, string> = {};
  for (const f of fields) {
    const raw = record?.[f.name] ?? defaults?.[f.name];
    if (f.type === "switch") v[f.name] = isTrue(raw) ? "true" : "false";
    else v[f.name] = raw ?? "";
  }
  return v;
}

/**
 * Builds the request body. On create, empty values are omitted; on update,
 * only changed fields are sent so RouterOS keeps untouched properties.
 */
function buildBody(fields: FieldDef[], values: Record<string, string>, original?: Record<string, string>) {
  const body: Record<string, string> = {};
  for (const f of fields) {
    if (f.when && !f.when(values)) continue;
    const val = values[f.name];
    if (original) {
      if (val !== original[f.name]) body[f.name] = val;
    } else if (val !== "") {
      body[f.name] = val;
    }
  }
  return body;
}

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const [reveal, setReveal] = useState(false);

  if (field.type === "switch") {
    const checked = field.invert ? value !== "true" : value === "true";
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
        <div>
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.description && <p className="mt-0.5 text-xs text-muted-foreground">{field.description}</p>}
        </div>
        <Switch
          id={field.name}
          checked={checked}
          onCheckedChange={(c) => onChange(String(field.invert ? !c : c))}
        />
      </div>
    );
  }

  let control: ReactNode;
  if (field.type === "textarea") {
    control = (
      <Textarea
        id={field.name}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-h-28 font-mono text-xs"
      />
    );
  } else if (field.type === "select") {
    control = (
      <Select value={value || (field.required ? undefined : NONE)} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger id={field.name} className="w-full">
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {!field.required && <SelectItem value={NONE}>{field.placeholder ?? "None"}</SelectItem>}
          {field.options?.map((o) => (
            <SelectItem key={optionValue(o)} value={optionValue(o)}>
              {optionLabel(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (field.type === "password") {
    control = (
      <div className="relative">
        <Input
          id={field.name}
          type={reveal ? "text" : "password"}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="pr-9"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
          onClick={() => setReveal((r) => !r)}
        >
          {reveal ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
    );
  } else {
    control = (
      <Input
        id={field.name}
        type={field.type === "number" ? "number" : "text"}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {control}
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
    </div>
  );
}

/** A side panel form, like the UniFi slide-in editors. */
export function ResourceSheet({
  open,
  onOpenChange,
  title,
  description,
  fields,
  record,
  defaults,
  onSubmit,
  submitLabel,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  /** Existing record for edit mode; omit to create. */
  record?: Record<string, string | undefined>;
  defaults?: Record<string, string>;
  onSubmit: (body: Record<string, string>, values: Record<string, string>) => Promise<unknown>;
  submitLabel?: string;
  footer?: ReactNode;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string> | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const init = initialValues(fields, record, defaults);
    setValues(init);
    setOriginal(record ? init : undefined);
  }, [open, record]);

  const missing = fields.some((f) => f.required && (!f.when || f.when(values)) && !values[f.name]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(buildBody(fields, values, original), values);
      onOpenChange(false);
    } catch {
      // Errors are surfaced by the mutation's toast.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <form onSubmit={submit} className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {fields
              .filter((f) => !f.when || f.when(values))
              .map((f, i, visible) => (
                <Fragment key={f.name}>
                  {f.section && f.section !== visible[i - 1]?.section && (
                    <div className={cn("text-xs font-medium tracking-wide text-muted-foreground uppercase", i > 0 && "border-t pt-4")}>
                      {f.section}
                    </div>
                  )}
                  <FieldInput field={f} value={values[f.name] ?? ""} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
                </Fragment>
              ))}
          </div>
          <SheetFooter className="flex-row justify-between border-t">
            <div>{footer}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || missing}>
                {saving && <Spinner className="text-primary-foreground" />}
                {submitLabel ?? (record ? "Apply Changes" : "Create")}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
