import { useState } from "react";
import { FlaskConicalIcon, LockIcon, ShieldAlertIcon, TriangleAlertIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CertificateError, formatFingerprint } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/common";
import { Logo } from "@/components/logo";
import { loadSavedConnection, pinnedFingerprint, useSession } from "@/lib/session";
import { errorMessage } from "@/lib/utils";

export function LoginPage() {
  const { connect } = useSession();
  const saved = loadSavedConnection();
  const [host, setHost] = useState(saved?.host ?? "192.168.88.1");
  const [port, setPort] = useState(saved?.port ? String(saved.port) : "");
  const [username, setUsername] = useState(saved?.username ?? "admin");
  const [password, setPassword] = useState("");
  const [https, setHttps] = useState(saved?.https ?? true);
  const [busy, setBusy] = useState<"real" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<CertificateError | null>(null);

  const target = { host, port: port ? Number(port) : undefined };

  async function attempt(fingerprint?: string) {
    setBusy("real");
    setError(null);
    try {
      await connect({ ...target, username, password, https, fingerprint });
    } catch (err) {
      if (err instanceof CertificateError) setCert(err);
      else setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    attempt();
  }

  async function demo() {
    setBusy("demo");
    setError(null);
    try {
      await connect({ host: "demo", username: "admin", password: "", https: false, demo: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-background p-6">
      {/* Soft backdrop glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="size-12" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sign in to your router</h1>
            <p className="mt-1 text-muted-foreground">Connects through the RouterOS v7 REST API</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-xl shadow-black/5">
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="host">Router address</Label>
              <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.88.1" autoFocus spellCheck={false} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="port">Port</Label>
              <Input id="port" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} placeholder={https ? "443" : "80"} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <LockIcon className="size-3.5 text-muted-foreground" />
              <Label htmlFor="https">Use HTTPS (www-ssl)</Label>
            </div>
            <Switch id="https" checked={https} onCheckedChange={setHttps} />
          </div>
          {!https && (
            <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>Without HTTPS your password and settings are sent unencrypted. Anyone on the network can read them.</span>
            </div>
          )}

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">{error}</div>}

          <Button type="submit" className="w-full" size="lg" disabled={!!busy || !host || !username}>
            {busy === "real" && <Spinner className="text-primary-foreground" />}
            Connect
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" /> or <Separator className="flex-1" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={demo} disabled={!!busy}>
            {busy === "demo" ? <Spinner /> : <FlaskConicalIcon />}
            Explore with a simulated router
          </Button>
        </form>

        <CertificatePrompt
          cert={cert}
          host={host}
          previous={cert?.kind === "changed" ? pinnedFingerprint(target) : undefined}
          onCancel={() => setCert(null)}
          onTrust={(fp) => {
            setCert(null);
            attempt(fp);
          }}
        />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Enable the <code className="rounded bg-muted px-1">www-ssl</code> or <code className="rounded bg-muted px-1">www</code> service under IP → Services.
        </p>
      </div>
    </div>
  );
}

function CertificatePrompt({
  cert,
  host,
  previous,
  onCancel,
  onTrust,
}: {
  cert: CertificateError | null;
  host: string;
  previous?: string;
  onCancel: () => void;
  onTrust: (fingerprint: string) => void;
}) {
  const changed = cert?.kind === "changed";
  return (
    <AlertDialog open={!!cert} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {changed ? <ShieldAlertIcon className="size-5 text-destructive" /> : <LockIcon className="size-5 text-primary" />}
            {changed ? "Certificate changed!" : "Trust this router?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {changed ? (
                <p className="text-destructive">
                  {host} presented a different certificate than last time. This is expected if you replaced or renewed it. Otherwise
                  someone may be intercepting the connection. Do not continue unless you can confirm the new fingerprint.
                </p>
              ) : (
                <p>
                  First connection to {host}. RouterOS uses a self-signed certificate, so confirm its fingerprint once. It will be
                  remembered, and you will be warned if it ever changes.
                </p>
              )}
              <div>
                <div className="mb-1 text-xs font-medium text-foreground">{changed ? "New" : "SHA-256"} fingerprint</div>
                <code className="block rounded-md bg-muted p-2 text-[11px] leading-relaxed break-all text-foreground">
                  {cert && formatFingerprint(cert.fingerprint)}
                </code>
              </div>
              {changed && previous && (
                <div>
                  <div className="mb-1 text-xs font-medium text-foreground">Previously trusted</div>
                  <code className="block rounded-md bg-muted p-2 text-[11px] leading-relaxed break-all">{formatFingerprint(previous)}</code>
                </div>
              )}
              <p className="text-xs">
                To check, run <code className="rounded bg-muted px-1">/certificate print detail</code> on the router (or WinBox →
                System → Certificates) and compare the <code className="rounded bg-muted px-1">fingerprint</code> of the certificate
                used by the www-ssl service.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={changed ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            onClick={() => cert && onTrust(cert.fingerprint)}
          >
            {changed ? "Trust new certificate" : "Trust & connect"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
