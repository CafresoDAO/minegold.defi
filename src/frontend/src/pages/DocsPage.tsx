import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import type { MouseEvent } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { DOCS, docBySlug } from "../content/docs";
import { renderMarkdown } from "../lib/markdown";

type Props = {
  /** undefined = the docs index; otherwise the doc to render. */
  slug?: string;
  /** Back to the application. */
  onBack: () => void;
  /** Follow an in-app path (e.g. "/proof", "/docs/risks") through the
   *  router rather than as a full page load. */
  onNavigatePath: (path: string) => void;
};

/**
 * /docs and /docs/:slug.
 *
 * The docs are the credibility surface: a stranger who doesn't trust us
 * should be able to read every limitation of this product without signing in
 * or being asked for anything. So this page is deliberately plain — no CTA
 * chrome, no upsell, no "get started" rail alongside the risks page.
 */
export function DocsPage({ slug, onBack, onNavigatePath }: Props) {
  const doc = slug ? docBySlug(slug) : undefined;

  /* The markdown renders REAL anchors (<a href="/proof">) so the content
     stays portable and correct if it's ever read outside this SPA. Here we
     intercept same-origin clicks and route them instead, which keeps the
     app's state alive. Modified clicks (new tab, download) fall through to
     the browser untouched — hijacking cmd-click is a real annoyance. */
  const interceptLinks = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href?.startsWith("/")) return; // external links keep their behaviour
    e.preventDefault();
    onNavigatePath(href);
  };

  return (
    <div
      data-ocid="docs.page"
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            data-ocid="docs.back"
            onClick={() => (doc ? onNavigatePath("/docs") : onBack())}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--bb-text-muted)" }}
          >
            <ArrowLeft size={14} /> {doc ? "All docs" : "minegold.defi"}
          </button>
          <ThemeToggle />
        </div>

        {doc ? (
          <article data-ocid="docs.article" onClick={interceptLinks}>
            {renderMarkdown(doc.body)}

            <nav
              className="mt-12 border-t pt-6"
              style={{ borderColor: "var(--bb-border)" }}
            >
              <p className="t-label mb-3" style={{ color: "var(--bb-text-dim)" }}>
                Other docs
              </p>
              <ul className="space-y-2">
                {DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
                  <li key={d.slug}>
                    <button
                      type="button"
                      onClick={() => onNavigatePath(`/docs/${d.slug}`)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-semibold"
                      style={{ color: "var(--bb-brand)" }}
                    >
                      {d.title} <ArrowRight size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </article>
        ) : slug ? (
          /* Unknown slug — a real 404 rather than a blank page, since the
             asset canister SPA-fallbacks every unknown path to this app. */
          <div data-ocid="docs.notfound">
            <h1 className="t-display" style={{ fontSize: "1.75rem" }}>
              No such document
            </h1>
            <p className="mt-3 text-[15px]" style={{ color: "var(--bb-text-muted)" }}>
              <code className="font-mono">/docs/{slug}</code> doesn&apos;t exist.
              Everything we publish is listed below.
            </p>
            <div className="mt-8">
              <DocIndex onNavigatePath={onNavigatePath} />
            </div>
          </div>
        ) : (
          <>
            <p className="t-label mb-3" style={{ color: "var(--bb-text-dim)" }}>
              Documentation
            </p>
            <h1 className="t-display" style={{ fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)" }}>
              How this works, and what it can&apos;t do.
            </h1>
            <p
              className="mt-3 max-w-xl text-[15px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              No sign-in required for any of it. The limitations page is as
              detailed as the how-it-works page, on purpose — a product that
              only documents its strengths is telling you something by
              omission.
            </p>
            <div className="mt-8">
              <DocIndex onNavigatePath={onNavigatePath} />
            </div>
            <p
              className="mt-8 text-[13px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              Every number these pages cite is published live on{" "}
              <button
                type="button"
                onClick={() => onNavigatePath("/proof")}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--bb-brand)" }}
              >
                /proof
              </button>
              , and changes to the product are logged on{" "}
              <button
                type="button"
                onClick={() => onNavigatePath("/status")}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--bb-brand)" }}
              >
                /status
              </button>
              .
            </p>
          </>
        )}

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

function DocIndex({ onNavigatePath }: { onNavigatePath: (p: string) => void }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {DOCS.map((d) => (
        <li key={d.slug}>
          <button
            type="button"
            data-ocid={`docs.index.${d.slug}`}
            onClick={() => onNavigatePath(`/docs/${d.slug}`)}
            className="h-full w-full rounded-3xl border p-5 text-left transition-colors"
            style={{
              borderColor: "var(--bb-border)",
              background: "var(--bb-surface)",
            }}
          >
            <span
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold"
              style={{ color: "var(--bb-text)" }}
            >
              <FileText size={14} style={{ color: "var(--bb-brand)" }} />
              {d.title}
            </span>
            <span
              className="block text-[12px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              {d.blurb}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
