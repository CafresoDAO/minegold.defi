import { useCallback, useEffect, useState } from "react";

/**
 * Hand-rolled hash routing (no new deps). Before this, navigation was a
 * localStorage view-switch plus three booleans — nothing was linkable,
 * shareable, or back-button-safe. Now every top-level surface has a URL:
 *
 *   #/           the refinery (the product — default landing)
 *   #/portfolio  the Banking.Brave protocol portfolio (demoted from default)
 *   #/brave      Minegold.Brave status + waitlist (ckBAT truth-gate page)
 *   #/history    transaction history
 *   #/admin      operator console (lazy-loaded)
 *   #/proof      the refinery with the Proof & transparency panel open
 */

export type Route =
  | "refinery"
  | "portfolio"
  | "brave"
  | "history"
  | "admin"
  | "proof";

const parse = (hash: string): Route => {
  switch (hash.replace(/^#\/?/, "").split("?")[0]) {
    case "portfolio":
      return "portfolio";
    case "brave":
      return "brave";
    case "history":
      return "history";
    case "admin":
      return "admin";
    case "proof":
      return "proof";
    default:
      return "refinery";
  }
};

const toHash = (r: Route): string => (r === "refinery" ? "#/" : `#/${r}`);

export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((r: Route) => {
    // Setting location.hash pushes a history entry → back button works.
    window.location.hash = toHash(r);
  }, []);

  return [route, navigate];
}
