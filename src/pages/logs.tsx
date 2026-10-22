import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { useRosList } from "@/hooks/use-ros";
import { cn } from "@/lib/utils";

function severity(topics: string) {
  if (/critical|error/.test(topics)) return "error";
  if (/warning/.test(topics)) return "warning";
  return "info";
}

export function LogsPage() {
  const [live, setLive] = useState(true);
  const [query, setQuery] = useState("");
  const { data, isLoading } = useRosList("log", { refetchInterval: live ? 5000 : undefined });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...(data ?? [])].reverse();
    return q ? list.filter((l) => l.message?.toLowerCase().includes(q) || l.topics?.includes(q)) : list;
  }, [data, query]);

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <PageHeader
        title="System Log"
        description="Recent router events, newest first."
        actions={
          <div className="flex items-center gap-2">
            <Switch id="live" checked={live} onCheckedChange={setLive} />
            <Label htmlFor="live">Live</Label>
          </div>
        }
      />
      <div className="relative mb-3 w-72">
        <SearchIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter messages or topics" className="h-8 pl-8" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title="No log entries" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 pl-4">Time</TableHead>
                <TableHead className="w-56">Topics</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => {
                const sev = severity(l.topics ?? "");
                return (
                  <TableRow key={l[".id"]}>
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{l.time}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {l.topics?.split(",").map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className={cn(
                              "h-4 text-[10px]",
                              sev === "error" && (t === "error" || t === "critical") && "bg-destructive/15 text-destructive",
                              sev === "warning" && t === "warning" && "bg-warning/15 text-warning",
                            )}
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className={cn("whitespace-normal", sev === "error" && "text-destructive")}>{l.message}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
