import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Last line of defence against a render throw or a failed lazy chunk.
 *  Without it React unmounts the whole tree and the user gets a blank page
 *  with no way forward — for a money app, "reload" must always be on screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unrecoverable render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
      >
        <div
          className="max-w-md rounded-3xl border p-6 text-center"
          style={{ borderColor: "var(--bb-border)", background: "var(--bb-surface)" }}
        >
          <p className="t-display" style={{ fontSize: "1.5rem" }}>
            Something broke on this page.
          </p>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "var(--bb-text-muted)" }}
          >
            Your funds are unaffected — they live on public ledgers, not in this
            page. Reloading usually fixes it. If it keeps happening, the status
            page lists any open incident.
          </p>
          <p
            className="mt-3 break-words font-mono text-[12px]"
            style={{ color: "var(--bb-text-dim)" }}
          >
            {this.state.error.message}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center rounded-2xl px-5 text-sm font-bold"
              style={{ background: "var(--royal-700)", color: "#ffffff" }}
            >
              Reload
            </button>
            <a
              href="/status"
              className="inline-flex min-h-[44px] items-center text-sm font-bold underline underline-offset-4"
              style={{ color: "var(--bb-brand)" }}
            >
              Status page
            </a>
          </div>
        </div>
      </div>
    );
  }
}
