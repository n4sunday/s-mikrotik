import { invoke } from "@tauri-apps/api/core";
import { mockRequest } from "./mock";

export type Method = "GET" | "PUT" | "PATCH" | "DELETE" | "POST";

/** A RouterOS REST record. All values come back as strings. */
export type RosRecord = { ".id": string } & Record<string, string | undefined>;

export interface ConnectionConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  https: boolean;
  /** Pinned SHA-256 fingerprint of the router's HTTPS certificate. */
  fingerprint?: string;
  /** Use the built-in simulated router instead of a real device. */
  demo?: boolean;
}

let demoMode = false;

/** The router presented a certificate that isn't (or is no longer) the pinned one. */
export class CertificateError extends Error {
  constructor(
    public kind: "untrusted" | "changed",
    public fingerprint: string,
  ) {
    super(kind === "changed" ? "The router's certificate has changed" : "The router's certificate is not trusted yet");
  }
}

export async function connect(config: ConnectionConfig): Promise<RosRecord> {
  demoMode = !!config.demo;
  if (demoMode) return (await mockRequest("GET", "system/resource")) as RosRecord;
  const { demo: _demo, ...rest } = config;
  try {
    return await invoke<RosRecord>("ros_connect", { config: rest });
  } catch (e) {
    const m = typeof e === "string" ? e.match(/^CERT_(UNTRUSTED|CHANGED):([0-9A-F]{64})$/) : null;
    if (m) throw new CertificateError(m[1] === "CHANGED" ? "changed" : "untrusted", m[2]);
    throw e;
  }
}

/** "AB12CD…" -> "AB:12:CD:…" for display. */
export function formatFingerprint(fp: string) {
  return fp.match(/.{2}/g)?.join(":") ?? fp;
}

export async function disconnect() {
  if (demoMode) {
    demoMode = false;
    return;
  }
  await invoke("ros_disconnect");
}

export async function request<T = unknown>(method: Method, path: string, body?: unknown): Promise<T> {
  if (demoMode) return mockRequest(method, path, body) as Promise<T>;
  return invoke<T>("ros_request", { method, path, body: body ?? null });
}

/** Typed helpers mirroring RouterOS REST semantics. */
export const ros = {
  list: <T = RosRecord>(path: string) => request<T[]>("GET", path),
  get: <T = RosRecord>(path: string) => request<T>("GET", path),
  create: (path: string, body: Record<string, unknown>) => request<RosRecord>("PUT", path, body),
  update: (path: string, id: string, body: Record<string, unknown>) =>
    request<RosRecord>("PATCH", `${path}/${id}`, body),
  remove: (path: string, id: string) => request("DELETE", `${path}/${id}`),
  run: <T = unknown>(path: string, body: Record<string, unknown> = {}) => request<T>("POST", path, body),
};

export const isDemo = () => demoMode;

/**
 * Run a RouterOS CLI script and return its printed output, e.g.
 * `execute("/ip address print")`. Long-running commands hit the request timeout.
 */
export async function execute(script: string): Promise<string> {
  const res = await request<{ ret?: string } | null>("POST", "execute", { script, "as-string": "" });
  return res?.ret ?? "";
}

/** WireGuard key pair as base64 [private, public]. */
export async function generateWgKeypair(): Promise<[string, string]> {
  if (demoMode) {
    const rnd = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    return [rnd(), rnd()];
  }
  return invoke<[string, string]>("wg_generate_keypair");
}

/** Ask where to save and write a text file (falls back to a browser download). */
export async function saveTextFile(defaultName: string, contents: string): Promise<boolean> {
  // In the app, Rust shows the save dialog itself so the page never chooses the path.
  if ("__TAURI_INTERNALS__" in window) return invoke<boolean>("save_text_file", { defaultName, contents });
  const url = URL.createObjectURL(new Blob([contents], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: defaultName });
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
