import type { ReactNode } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 pb-4", className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export type Status = "online" | "offline" | "warning" | "disabled";

const dotColor: Record<Status, string> = {
  online: "bg-success shadow-[0_0_0_3px] shadow-success/15",
  offline: "bg-destructive shadow-[0_0_0_3px] shadow-destructive/15",
  warning: "bg-warning shadow-[0_0_0_3px] shadow-warning/15",
  disabled: "bg-muted-foreground/40",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", dotColor[status], className)} />;
}

/** UniFi-style panel: flat card with a small title row. */
export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card text-card-foreground", className)}>
      {(title || actions) && (
        <header className="flex h-11 items-center justify-between gap-2 border-b px-4">
          <h2 className="font-medium">{title}</h2>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Meter({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct > 85 ? "bg-destructive" : pct > 65 ? "bg-warning" : "bg-primary";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      {icon && <div className="text-muted-foreground/60 [&_svg]:size-8">{icon}</div>}
      <div className="font-medium text-foreground">{title}</div>
      {description && <div className="max-w-sm">{description}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2Icon className={cn("size-4 animate-spin text-muted-foreground", className)} />;
}

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner className="size-5" />
    </div>
  );
}

/** A settings row: label + description on the left, control on the right. */
export function SettingRow({
  label,
  description,
  children,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-6 py-3", className)}>
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {description && <div className="mt-0.5 text-muted-foreground">{description}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export function ConfirmButton({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  children,
  destructive = true,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  children?: ReactNode;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
            <Trash2Icon />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
