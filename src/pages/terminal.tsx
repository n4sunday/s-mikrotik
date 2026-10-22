import { useEffect, useRef, useState } from "react";
import { TerminalSquareIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Spinner } from "@/components/common";
import { execute } from "@/lib/api";
import { useRosItem } from "@/hooks/use-ros";
import { cn, errorMessage } from "@/lib/utils";

interface Line {
  cmd: string;
  out: string;
  error?: boolean;
}

const EXAMPLES = ["/ip address print", "/interface print stats", "/ip firewall nat export", "/system resource print", "/log print where topics~\"error\""];

export function TerminalPage() {
  const identity = useRosItem("system/identity");
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines, busy]);

  async function run(cmd: string) {
    if (!cmd.trim()) return;
    setHistory((h) => [cmd, ...h.filter((c) => c !== cmd)].slice(0, 100));
    setCursor(-1);
    setInput("");
    if (cmd.trim() === "clear") return setLines([]);
    setBusy(true);
    try {
      const out = await execute(cmd);
      setLines((l) => [...l, { cmd, out }]);
    } catch (e) {
      setLines((l) => [...l, { cmd, out: errorMessage(e), error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      const next = Math.min(cursor + 1, history.length - 1);
      setCursor(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = cursor - 1;
      setCursor(next);
      setInput(next >= 0 ? history[next] : "");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  }

  const prompt = `[admin@${identity.data?.name ?? "router"}] >`;

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col p-6">
      <PageHeader
        title="Terminal"
        description="Runs RouterOS commands through /execute. Commands that never finish (like ping without count) time out after 15s."
        actions={
          <Button variant="outline" size="sm" onClick={() => setLines([])}>
            <Trash2Icon /> Clear
          </Button>
        }
      />
      <div
        ref={scroller}
        onClick={() => inputRef.current?.focus()}
        className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-[#0d0e10] p-4 font-mono text-[12.5px] leading-relaxed text-[#d7dae0]"
      >
        {lines.length === 0 && (
          <div className="mb-4 text-[#7d8590]">
            <div className="mb-2 flex items-center gap-2">
              <TerminalSquareIcon className="size-4" /> RouterOS terminal. Try:
            </div>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="block text-[#5aa0ff] hover:underline" onClick={() => run(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
        {lines.map((l, i) => (
          <div key={i} className="mb-3">
            <div>
              <span className="text-[#39c88b]">{prompt}</span> {l.cmd}
            </div>
            <pre className={cn("whitespace-pre-wrap", l.error && "text-[#f2555a]")}>{l.out || (l.error ? "" : "(no output)")}</pre>
          </div>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
        >
          <span className="shrink-0 text-[#39c88b]">{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={busy}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
          {busy && <Spinner className="text-[#7d8590]" />}
        </form>
      </div>
    </div>
  );
}
