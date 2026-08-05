import { useCallback, useEffect, useRef, useState } from "react";

export type MiningStepStatus = "pending" | "active" | "done" | "error";

export type MiningStep = {
  id: string;
  label: string;
  status: MiningStepStatus;
  detail?: string;
  startedAt: number;
  updatedAt: number;
};

/** Timelines older than this are dropped on hydration rather than shown. A
 *  day-old "still bridging…" is misinformation, not history. */
const TTL_MS = 24 * 60 * 60_000;

const storageKey = (principalSlug: string) => `minegold_steps_${principalSlug}`;

/**
 * The visible step tracker for a refine, persisted per-principal so it
 * survives tab reloads and mobile tab kills.
 *
 * It exists for support, not decoration: when someone reports a stuck
 * deposit, the timeline says exactly which step it died on and when,
 * instead of us asking "what was the last thing you saw?".
 *
 * Storage keys are scoped by principal so two accounts on a shared device
 * can't read each other's timeline. Hydration lives here alongside the
 * writes — it used to sit in a separate effect, which made it easy to miss
 * that stale timelines expire on read rather than on write.
 */
export function useMiningSteps(principalSlug: string) {
  const [steps, setSteps] = useState<MiningStep[]>([]);

  const persist = useCallback(
    (next: MiningStep[]) => {
      try {
        if (next.length === 0) localStorage.removeItem(storageKey(principalSlug));
        else localStorage.setItem(storageKey(principalSlug), JSON.stringify(next));
      } catch {
        /* localStorage unavailable */
      }
    },
    [principalSlug],
  );

  // Hydrate when the principal resolves. Guarded so a re-render can't
  // clobber live in-flight steps with what was on disk at mount.
  const hydratedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!principalSlug) return;
    if (hydratedForRef.current === principalSlug) return;
    hydratedForRef.current = principalSlug;
    try {
      const raw = localStorage.getItem(storageKey(principalSlug));
      if (!raw) return;
      const parsed = JSON.parse(raw) as MiningStep[];
      if (!Array.isArray(parsed)) return;
      const newest = parsed.reduce((n, s) => Math.max(n, s.updatedAt ?? 0), 0);
      if (newest && Date.now() - newest > TTL_MS) {
        localStorage.removeItem(storageKey(principalSlug));
      } else {
        setSteps(parsed);
      }
    } catch {
      /* localStorage unavailable or corrupt — start clean */
    }
  }, [principalSlug]);

  /** Upsert a step by id: updates in place if present, appends if new.
   *  `startedAt` is preserved across updates so elapsed time stays true. */
  const updateStep = useCallback(
    (id: string, label: string, status: MiningStepStatus, detail?: string) => {
      setSteps((prev) => {
        const now = Date.now();
        const existing = prev.find((s) => s.id === id);
        const next: MiningStep[] = existing
          ? prev.map((s) =>
              s.id === id ? { ...s, label, status, detail, updatedAt: now } : s,
            )
          : [...prev, { id, label, status, detail, startedAt: now, updatedAt: now }];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetSteps = useCallback(() => {
    setSteps([]);
    persist([]);
  }, [persist]);

  return { steps, updateStep, resetSteps };
}
