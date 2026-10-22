import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrafficSample } from "@/hooks/use-traffic";
import { formatBps } from "@/lib/utils";

const SERIES = [
  { key: "rx", label: "Download", color: "var(--chart-1)" },
  { key: "tx", label: "Upload", color: "var(--chart-2)" },
] as const;

/** Live download/upload chart for one interface. */
export function TrafficChart({ history, iface, height = 220 }: { history: TrafficSample[]; iface: string; height?: number }) {
  const data = history.map((s) => ({
    t: s.t,
    rx: s.rates[iface]?.rx ?? 0,
    tx: s.rates[iface]?.tx ?? 0,
  }));
  const last = data.at(-1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-6">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-semibold tabular-nums">{formatBps(last?.[s.key] ?? 0)}</span>
          </div>
        ))}
      </div>
      <div style={{ height }}>
        {data.length < 2 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">Collecting samples…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t) => new Date(t).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                width={76}
                tickFormatter={(v) => formatBps(v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
                formatter={(v, name) => [formatBps(v as number), SERIES.find((s) => s.key === name)?.label ?? name]}
              />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#fill-${s.key})`}
                  isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
