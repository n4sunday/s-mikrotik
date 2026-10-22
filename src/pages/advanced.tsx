import { useMemo, useState } from "react";
import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GenericMenu } from "@/components/generic-menu";
import { CATALOG, ALL_MENUS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** WinBox-style access to every RouterOS menu through the generic editor. */
export function AdvancedPage() {
  const [path, setPath] = useState("ip/firewall/mangle");
  const [filter, setFilter] = useState("");
  const [custom, setCustom] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(q) || i.path.includes(q) || g.label.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [filter]);

  const current = ALL_MENUS.find((m) => m.path === path);

  return (
    <div className="flex h-full">
      <nav className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a menu" className="h-8 pl-8" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const p = custom.trim().replace(/^\/+|\/+$/g, "").replace(/\s+/g, "/");
              if (p) setPath(p);
            }}
          >
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Open path, e.g. /ip/dns/static" className="h-8 font-mono text-xs" />
          </form>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {groups.map((g) => {
            const isCollapsed = collapsed[g.label] && !filter;
            return (
              <div key={g.label} className="mb-1">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [g.label]: !c[g.label] }))}
                  className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
                >
                  <ChevronRightIcon className={cn("size-3 transition-transform", !isCollapsed && "rotate-90")} />
                  {g.label}
                </button>
                {!isCollapsed &&
                  g.items.map((i) => (
                    <button
                      key={i.path}
                      onClick={() => setPath(i.path)}
                      className={cn(
                        "flex w-full items-center rounded-md py-1.5 pr-2 pl-6 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        path === i.path && "bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {i.label}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="pb-4">
            <div className="text-muted-foreground">{current?.group ?? "Custom"}</div>
            <h1 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
              {current?.label ?? path}
              <code className="text-xs font-normal text-muted-foreground">/{path.replace(/\//g, " ")}</code>
            </h1>
          </div>
          <GenericMenu key={path} path={path} title={current?.label ?? path} />
        </div>
      </div>
    </div>
  );
}
