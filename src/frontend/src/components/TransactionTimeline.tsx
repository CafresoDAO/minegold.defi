import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle, ChevronDown, ChevronRight } from "lucide-react";

export type TimelineStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
  startedAt: number;
  updatedAt: number;
};

type Props = {
  steps: TimelineStep[];
  defaultOpen?: boolean;
  onClear?: () => void;
};

function timeAgo(ms: number, now: number): string {
  const delta = Math.max(0, now - ms);
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function duration(step: TimelineStep): string {
  const delta = Math.max(0, step.updatedAt - step.startedAt);
  if (delta < 1000) return "<1s";
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${min}m` : `${min}m${s}s`;
}

export function TransactionTimeline({ steps, defaultOpen = false, onClear }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [now, setNow] = useState(() => Date.now());

  // Refresh the "time ago" labels on a 10s cadence while the panel is open.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, [open]);

  if (steps.length === 0) return null;

  const activeIdx = steps.findIndex((s) => s.status === "active");
  const errorIdx = steps.findIndex((s) => s.status === "error");
  const summary =
    errorIdx >= 0
      ? `Stuck at: ${steps[errorIdx].label}`
      : activeIdx >= 0
        ? `Current: ${steps[activeIdx].label}`
        : steps.every((s) => s.status === "done")
          ? "Completed"
          : "In progress";
  const doneCount = steps.filter((s) => s.status === "done").length;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors"
        aria-expanded={open}
        data-ocid="timeline.toggle"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown size={14} className="text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-zinc-400 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="t-label text-zinc-300">
              Transaction timeline
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {summary} · {doneCount}/{steps.length} complete
            </div>
          </div>
        </div>
        {onClear && (steps.every((s) => s.status === "done") || errorIdx >= 0) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded"
            data-ocid="timeline.clear"
          >
            Clear
          </button>
        )}
      </button>
      {open && (
        <ol className="relative border-t border-zinc-800 px-4 py-3 space-y-3">
          {steps.map((s, i) => {
            const Icon =
              s.status === "done"
                ? CheckCircle2
                : s.status === "error"
                  ? XCircle
                  : s.status === "active"
                    ? Loader2
                    : Clock;
            const iconColor =
              s.status === "done"
                ? "text-emerald-400"
                : s.status === "error"
                  ? "text-red-400"
                  : s.status === "active"
                    ? "text-yellow-400"
                    : "text-zinc-500";
            const isLast = i === steps.length - 1;
            return (
              <li key={s.id} className="flex gap-3 relative">
                <div className="shrink-0 flex flex-col items-center">
                  <Icon
                    size={16}
                    className={`${iconColor} ${s.status === "active" ? "animate-spin" : ""}`}
                  />
                  {!isLast && <span className="w-px flex-1 bg-zinc-800 mt-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-200 break-words">
                      {s.label}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0 pt-0.5">
                      {timeAgo(s.updatedAt, now)}
                    </span>
                  </div>
                  {s.detail && (
                    <p className="text-[11px] text-zinc-400 font-mono break-all mt-0.5">
                      {s.detail}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    took {duration(s)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
