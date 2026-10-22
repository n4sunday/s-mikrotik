import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ActivityIcon, GlobeIcon, PowerIcon, RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Spinner } from "@/components/common";
import { useRosList } from "@/hooks/use-ros";
import { execute, ros, type RosRecord } from "@/lib/api";
import { useClients } from "@/lib/network";
import { errorMessage } from "@/lib/utils";

function ToolPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <span className="text-primary [&_svg]:size-4">{icon}</span>
          {title}
        </span>
      }
    >
      <p className="mb-3 text-muted-foreground">{description}</p>
      {children}
    </Panel>
  );
}

function useRunner<T>() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  async function run(fn: () => Promise<T>) {
    setBusy(true);
    setResult(null);
    try {
      setResult(await fn());
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, result, run };
}

function Ping() {
  const [address, setAddress] = useState("1.1.1.1");
  const [count, setCount] = useState("4");
  const { busy, result, run } = useRunner<RosRecord[]>();
  const summary = result?.at(-1);

  return (
    <ToolPanel icon={<ActivityIcon />} title="Ping" description="Send ICMP echo requests from the router.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => ros.run<RosRecord[]>("ping", { address, count }));
        }}
      >
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Host or IP" />
        <Input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} className="w-16" title="Count" />
        <Button type="submit" disabled={busy || !address}>
          {busy && <Spinner className="text-primary-foreground" />} Ping
        </Button>
      </form>
      {result && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 font-mono text-xs">
          {result.map((r, i) => (
            <div key={i}>
              {r.seq} {r.host} {r.time ? `time=${r.time} ttl=${r.ttl}` : r.status ?? "timeout"}
            </div>
          ))}
          {summary && (
            <div className="mt-2 border-t pt-2 font-sans text-[13px]">
              <span className="font-medium">{summary["packet-loss"] ?? 0}% loss</span>
              <span className="text-muted-foreground"> · avg {summary["avg-rtt"] ?? "—"} · min {summary["min-rtt"] ?? "—"} · max {summary["max-rtt"] ?? "—"}</span>
            </div>
          )}
        </div>
      )}
    </ToolPanel>
  );
}

function Traceroute() {
  const [address, setAddress] = useState("8.8.8.8");
  const { busy, result, run } = useRunner<RosRecord[]>();
  return (
    <ToolPanel icon={<RouteIcon />} title="Traceroute" description="Show each hop between the router and a destination.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => ros.run<RosRecord[]>("tool/traceroute", { address, count: "1" }));
        }}
      >
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Host or IP" />
        <Button type="submit" disabled={busy || !address}>
          {busy && <Spinner className="text-primary-foreground" />} Trace
        </Button>
      </form>
      {result && (
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">#</th>
              <th className="font-medium">Address</th>
              <th className="font-medium">Loss</th>
              <th className="text-right font-medium">Last</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {result.map((h, i) => (
              <tr key={i} className="border-t">
                <td className="py-1">{i + 1}</td>
                <td>{h.address || "*"}</td>
                <td>{h.loss ?? "—"}</td>
                <td className="text-right">{h.last ?? h.avg ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ToolPanel>
  );
}

function DnsLookup() {
  const [name, setName] = useState("mikrotik.com");
  const { busy, result, run } = useRunner<string>();
  return (
    <ToolPanel icon={<GlobeIcon />} title="DNS Lookup" description="Resolve a hostname using the router's DNS.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          // Only plain host names reach the script; RouterOS expands `$` and `[...]` inside strings.
          if (!/^(?=.{1,253}$)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.?$/.test(name.trim())) return toast.error("Enter a valid host name");
          run(() => execute(`:put [:resolve "${name.trim()}"]`));
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="example.com" />
        <Button type="submit" disabled={busy || !name}>
          {busy && <Spinner className="text-primary-foreground" />} Resolve
        </Button>
      </form>
      {result !== null && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 font-mono text-xs">{result.trim() || "No answer"}</div>
      )}
    </ToolPanel>
  );
}

function WakeOnLan() {
  const { clients } = useClients();
  const interfaces = useRosList("interface");
  const [mac, setMac] = useState("");
  const [iface, setIface] = useState("bridge");
  const { busy, run } = useRunner<unknown>();
  return (
    <ToolPanel icon={<PowerIcon />} title="Wake on LAN" description="Send a magic packet to wake a sleeping device.">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Device</Label>
          <Select value={mac} onValueChange={setMac}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a known client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.mac} value={c.mac}>
                  {c.name} · {c.mac}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={mac} onChange={(e) => setMac(e.target.value)} placeholder="or type a MAC address" className="font-mono text-xs" />
        </div>
        <div className="flex gap-2">
          <Select value={iface} onValueChange={setIface}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(interfaces.data ?? []).map((i) => (
                <SelectItem key={i[".id"]} value={i.name!}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={busy || !mac}
            onClick={() =>
              run(async () => {
                await ros.run("tool/wol", { mac, interface: iface });
                toast.success("Magic packet sent");
              })
            }
          >
            {busy && <Spinner className="text-primary-foreground" />} Wake
          </Button>
        </div>
      </div>
    </ToolPanel>
  );
}

export function ToolsPage() {
  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <PageHeader title="Tools" description="Network diagnostics run from the router itself." />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Ping />
        <Traceroute />
        <DnsLookup />
        <WakeOnLan />
      </div>
    </div>
  );
}
