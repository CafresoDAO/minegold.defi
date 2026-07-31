import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { MouseEvent } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { CHANGELOG_MD, INCIDENTS_MD, withoutTitle } from "../content/status";
import { renderMarkdown } from "../lib/markdown";

type Props = {
  onBack: () => void;
  onNavigatePath: (path: string) => void;
};

type Tab = "incidents" | "changelog";

/** Whether INCIDENTS.md currently records any actual incident.
 *
 *  Derived from the document rather than tracked separately, so the banner
 *  and the log can never disagree — the failure mode where a page says "all
 *  clear" above an open incident entry is exactly the one worth designing
 *  out. The sentinel heading is written by the operator when the log is
 *  empty and replaced by the first real entry. */
const hasOpenIncidents = (md: string): boolean =>
  !/^##\s+No incidents recorded\s*$/m.test(md);

/**
 * /status — the changelog and the incident log, on one page.
 *
 * Incidents lead. A status page that opens on a feature changelog and makes
 * you scroll for the outages has chosen which of the two it would rather you
 * read.
 */
export function StatusPage({ onBack, onNavigatePath }: Props) {
  const [tab, setTab] = useState<Tab>("incidents");
  const open = hasOpenIncidents(INCIDENTS_MD);

  const interceptLinks = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href?.startsWith("/")) return;
    e.preventDefault();
    onNavigatePath(href);
  };

  return (
    <div
      data-ocid="status.page"
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            data-ocid="status.back"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--bb-text-muted)" }}
          >
            <ArrowLeft size={14} /> minegold.defi
          </button>
          <ThemeToggle />
        </div>

        <p className="t-label mb-3" style={{ color: "var(--bb-text-dim)" }}>
          Status
        </p>
        <h1
          className="t-display"
          style={{ fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)" }}
        >
          What changed, and what broke.
        </h1>

        {/* Current state, stated before either log. */}
        <div
          data-ocid="status.banner"
          className="mt-6 flex items-start gap-3 rounded-3xl border p-5"
          style={{
            borderColor: open ? "var(--trust-fault)" : "var(--bb-border)",
            background: "var(--bb-surface)",
          }}
        >
          {open ? (
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--trust-fault)" }}
            />
          ) : (
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--trust-verified)" }}
            />
          )}
          <div>
            <p className="text-sm font-bold">
              {open
                ? "There is an open incident — details below"
                : "No incidents recorded"}
            </p>
            <p
              className="mt-1 text-[12px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              Incidents are logged when they are <em>detected</em>, not when
              they are resolved — the entry starts as &ldquo;investigating&rdquo;
              and is updated in place. Entries are never deleted. Live
              treasury and coverage numbers are on{" "}
              <button
                type="button"
                onClick={() => onNavigatePath("/proof")}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--bb-brand)" }}
              >
                /proof
              </button>
              .
            </p>
          </div>
        </div>

        <div
          className="mt-8 flex gap-1 border-b"
          style={{ borderColor: "var(--bb-border)" }}
          role="tablist"
        >
          {(
            [
              ["incidents", "Incidents"],
              ["changelog", "Changelog"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-ocid={`status.tab.${id}`}
              onClick={() => setTab(id)}
              className="-mb-px min-h-[44px] border-b-2 px-4 text-sm font-bold transition-colors"
              style={{
                borderColor: tab === id ? "var(--bb-brand)" : "transparent",
                color: tab === id ? "var(--bb-text)" : "var(--bb-text-dim)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          data-ocid={`status.body.${tab}`}
          className="mt-2"
          onClick={interceptLinks}
        >
          {renderMarkdown(
            withoutTitle(tab === "incidents" ? INCIDENTS_MD : CHANGELOG_MD),
          )}
        </div>

        <footer
          className="mt-12 border-t pt-5 text-center text-[11px]"
          style={{ borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" }}
        >
          minegold.defi · part of the Banking.Brave ecosystem, powered by
          CafresoDAO
        </footer>
      </div>
    </div>
  );
}
