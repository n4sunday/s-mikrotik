import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRosList } from "./use-ros";
import type { RosRecord } from "@/lib/api";

export interface Rate {
  rx: number; // bits per second
  tx: number;
}

export interface TrafficSample {
  t: number;
  rates: Record<string, Rate>;
}

const HISTORY = 60;

/**
 * Polls `/interface` and derives per-interface throughput from the byte
 * counters, keeping a rolling history for charts.
 */
function useTrafficPoller(intervalMs: number) {
  const query = useRosList<RosRecord>("interface", { refetchInterval: intervalMs });
  const prev = useRef<{ t: number; counters: Record<string, [number, number]> } | null>(null);
  const [history, setHistory] = useState<TrafficSample[]>([]);

  useEffect(() => {
    const list = query.data;
    if (!list) return;
    const t = query.dataUpdatedAt;
    const counters: Record<string, [number, number]> = {};
    for (const i of list) counters[i.name!] = [Number(i["rx-byte"] ?? 0), Number(i["tx-byte"] ?? 0)];

    const last = prev.current;
    prev.current = { t, counters };
    if (!last || t <= last.t) return;

    const dt = (t - last.t) / 1000;
    const rates: Record<string, Rate> = {};
    for (const [name, [rx, tx]] of Object.entries(counters)) {
      const p = last.counters[name];
      if (!p) continue;
      rates[name] = { rx: Math.max(0, ((rx - p[0]) * 8) / dt), tx: Math.max(0, ((tx - p[1]) * 8) / dt) };
    }
    setHistory((h) => [...h.slice(-(HISTORY - 1)), { t, rates }]);
  }, [query.data, query.dataUpdatedAt]);

  const latest = history.at(-1)?.rates ?? {};
  return { interfaces: query.data, history, latest, isLoading: query.isLoading };
}

type TrafficValue = ReturnType<typeof useTrafficPoller>;
const TrafficContext = createContext<TrafficValue | null>(null);

/** Keeps polling for the whole session so history survives page switches. */
export function TrafficProvider({ children, intervalMs = 2000 }: { children: ReactNode; intervalMs?: number }) {
  const value = useTrafficPoller(intervalMs);
  return createElement(TrafficContext.Provider, { value }, children);
}

export function useTraffic() {
  const ctx = useContext(TrafficContext);
  if (!ctx) throw new Error("useTraffic must be used inside TrafficProvider");
  return ctx;
}
