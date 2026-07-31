import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchIncidentNotice, type IncidentNotice } from "../lib/receiptShare";

/**
 * The operator-raised incident banner.
 *
 * Read straight from the canister on mount, so raising an incident does not
 * require a frontend rebuild and asset sync. That is the point: /status
 * publishes the rule "post before the fix", and if disclosing required a full
 * deploy, the honest path would be the slow path — and under pressure the
 * slow path quietly stops happening.
 *
 * It is deliberately NOT dismissible. A banner the reader can dismiss is one
 * they can dismiss before reading, and this only ever appears when something
 * is actually wrong.
 *
 * Renders nothing when there's no incident — including when the backend
 * doesn't have the endpoint yet (the client returns null rather than
 * throwing), so this is safe to ship before the backend upgrade.
 */
export function IncidentBanner({
  onNavigatePath,
}: {
  onNavigatePath?: (path: string) => void;
}) {
  const [notice, setNotice] = useState<IncidentNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const n = await fetchIncidentNotice();
      if (!cancelled) setNotice(n);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!notice) return null;

  const since = new Date(Number(notice.sinceNs / 1_000_000n));
  const target = notice.url ?? "/status";
  const internal = target.startsWith("/");

  return (
    <div
      data-ocid="incident.banner"
      role="status"
      className="w-full border-b px-4 py-3"
      style={{
        borderColor: "var(--trust-fault)",
        background: "color-mix(in srgb, var(--trust-fault) 12%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-start gap-2.5">
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: "var(--trust-fault)" }}
        />
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--bb-text)" }}>
          {notice.message}{" "}
          <span style={{ color: "var(--bb-text-dim)" }}>
            (reported {since.toLocaleString()})
          </span>{" "}
          {internal && onNavigatePath ? (
            <button
              type="button"
              data-ocid="incident.banner.link"
              onClick={() => onNavigatePath(target)}
              className="font-bold underline underline-offset-2"
              style={{ color: "var(--bb-text)" }}
            >
              Details ›
            </button>
          ) : (
            <a
              href={target}
              {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              className="font-bold underline underline-offset-2"
              style={{ color: "var(--bb-text)" }}
            >
              Details ›
            </a>
          )}
        </p>
      </div>
    </div>
  );
}
