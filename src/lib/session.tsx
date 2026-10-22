import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { ConnectionConfig, RosRecord } from "./api";

const STORAGE_KEY = "s-mikrotik.connection";
const PINS_KEY = "s-mikrotik.cert-pins";

/** Trusted certificate fingerprints per router, like SSH known_hosts. Public data, not secrets. */
function pinKey(c: Pick<ConnectionConfig, "host" | "port">) {
  return `${c.host.trim().toLowerCase()}:${c.port ?? 443}`;
}
function loadPins(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PINS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
export function pinnedFingerprint(c: Pick<ConnectionConfig, "host" | "port">): string | undefined {
  return loadPins()[pinKey(c)];
}
function savePin(c: Pick<ConnectionConfig, "host" | "port">, fingerprint: string) {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify({ ...loadPins(), [pinKey(c)]: fingerprint }));
  } catch {
    // Without storage the user is simply asked again next time.
  }
}

/** Remembered connection details. The password is never persisted. */
export type SavedConnection = Omit<ConnectionConfig, "password" | "fingerprint">;

interface SessionValue {
  connection: SavedConnection | null;
  resource: RosRecord | null;
  connect: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function loadSavedConnection(): SavedConnection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedConnection) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [connection, setConnection] = useState<SavedConnection | null>(null);
  const [resource, setResource] = useState<RosRecord | null>(null);

  const connect = useCallback(async (input: ConnectionConfig) => {
    const config = input.https && !input.demo ? { ...input, fingerprint: input.fingerprint ?? pinnedFingerprint(input) } : input;
    const res = await api.connect(config);
    if (config.https && config.fingerprint) savePin(config, config.fingerprint);
    const { password: _password, fingerprint: _fingerprint, ...saved } = config;
    if (!config.demo) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    qc.clear();
    setResource(res);
    setConnection(saved);
  }, [qc]);

  const disconnect = useCallback(async () => {
    await api.disconnect();
    qc.clear();
    setConnection(null);
    setResource(null);
  }, [qc]);

  return (
    <SessionContext.Provider value={{ connection, resource, connect, disconnect }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
