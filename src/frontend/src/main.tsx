import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./auth";
// Theme module auto-applies the stored theme class on import so the page
// renders with the correct colors on first paint.
import "./hooks/useTheme";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Legacy hash URLs (#/proof etc.) predate real paths. Rewrite in place BEFORE
// React mounts so the router only ever sees a path. replaceState (not push)
// so Back doesn't bounce through the old URL. Restricted to known route ids —
// a bare "#" or an in-page anchor is left alone. Keep this indefinitely; it's
// four lines and it keeps every link ever shared alive.
{
  const m = window.location.hash.match(
    /^#\/(portfolio|brave|history|admin|proof|receipt(?:\/[^/?#]+)?)?$/,
  );
  if (m) {
    window.history.replaceState(
      null,
      "",
      `/${m[1] ?? ""}${window.location.search}`,
    );
  } else if (window.location.hash === "#/" || window.location.hash === "#") {
    window.history.replaceState(null, "", `/${window.location.search}`);
  }
}

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
