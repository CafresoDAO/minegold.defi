import { useCallback, useEffect, useState } from "react";

/**
 * Real-path routing (History API, no deps) — replaces the old hash router.
 * Hash URLs were invisible to every social unfurler and crawler; now each
 * top-level surface has a real, shareable path. The asset canister serves
 * the root index.html for any unknown path (verified SPA fallback), so deep
 * links and refreshes work without server config; /proof, /portfolio and
 * /brave additionally get static shells with route-specific OG meta at
 * build time (see routes.manifest.mjs + scripts/post-build.mjs).
 *
 *   /            refinery (default)
 *   /portfolio   Banking.Brave house page
 *   /brave       Minegold.Brave ckBAT truth-gate + waitlist
 *   /proof       Proof & transparency
 *   /history     activity (noindex)
 *   /admin       operator console (noindex)
 *   /receipt/:id on-chain receipt (noindex, generic OG)
 */

export type Route =
  | "refinery"
  | "portfolio"
  | "brave"
  | "history"
  | "admin"
  | "proof"
  | "receipt";

export interface RouteParams {
  id?: string;
}

const parse = (pathname: string): { route: Route; params: RouteParams } => {
  const segs = pathname.replace(/^\/+|\/+$/g, "").split("/");
  switch (segs[0]) {
    case "portfolio":
      return { route: "portfolio", params: {} };
    case "brave":
      return { route: "brave", params: {} };
    case "history":
      return { route: "history", params: {} };
    case "admin":
      return { route: "admin", params: {} };
    case "proof":
      return { route: "proof", params: {} };
    case "receipt":
      return { route: "receipt", params: { id: segs[1] || undefined } };
    default:
      return { route: "refinery", params: {} };
  }
};

const toPath = (r: Route, params?: RouteParams): string => {
  if (r === "refinery") return "/";
  if (r === "receipt" && params?.id) return `/receipt/${params.id}`;
  return `/${r}`;
};

// pushState is silent — popstate only fires on Back/Forward. A synthetic
// event lets the hook re-read location on programmatic navigation too.
const ROUTE_EVENT = "minegold:navigate";

export function usePathRoute(): [
  Route,
  (r: Route, params?: RouteParams) => void,
  RouteParams,
] {
  const [match, setMatch] = useState(() => parse(window.location.pathname));

  useEffect(() => {
    const onChange = () => setMatch(parse(window.location.pathname));
    window.addEventListener("popstate", onChange);
    window.addEventListener(ROUTE_EVENT, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(ROUTE_EVENT, onChange);
    };
  }, []);

  const navigate = useCallback((r: Route, params?: RouteParams) => {
    const href = toPath(r, params);
    if (href === window.location.pathname) return; // no duplicate history entries
    // Preserve the query string — ?noeco / ?shaft_demo style flags live there.
    window.history.pushState(null, "", href + window.location.search);
    window.scrollTo(0, 0); // pushState doesn't reset scroll; hash nav did
    window.dispatchEvent(new Event(ROUTE_EVENT));
  }, []);

  return [match.route, navigate, match.params];
}
