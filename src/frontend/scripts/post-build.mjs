#!/usr/bin/env node
/**
 * Cross-platform post-build copy step.
 *
 * Replaces the Unix-only `cp env.json dist/ && cp -r public/.well-known ...`
 * scripts so `pnpm build` works identically on Windows cmd, PowerShell, and
 * any Unix shell. Uses only Node's built-in `fs` — no extra dependency.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OG_ASSET_ORIGIN,
  ROUTES,
  SITE_ORIGIN,
  routeMeta,
} from "../routes.manifest.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");
const dist = resolve(frontendRoot, "dist");

if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

// 1. Copy env.json (required by the canister build)
const envJson = resolve(frontendRoot, "env.json");
if (existsSync(envJson)) {
  copyFileSync(envJson, resolve(dist, "env.json"));
  console.log("[post-build] copied env.json");
} else {
  console.warn("[post-build] env.json missing at", envJson);
}

// 2. Copy public/.well-known directory (if present) — needed for IC
//    certified-asset serving.
const wellKnownSrc = resolve(frontendRoot, "public", ".well-known");
if (existsSync(wellKnownSrc)) {
  cpSync(wellKnownSrc, resolve(dist, ".well-known"), { recursive: true });
  console.log("[post-build] copied public/.well-known");
}

// 3. Copy public/.ic-assets.json5 (if present) — declares canister asset
//    response-header policies (cache-control, headers, etc.).
const icAssets = resolve(frontendRoot, "public", ".ic-assets.json5");
if (existsSync(icAssets)) {
  copyFileSync(icAssets, resolve(dist, ".ic-assets.json5"));
  console.log("[post-build] copied .ic-assets.json5");
}

// 4. Per-route OG shells. The asset canister already SPA-fallbacks every
//    unknown path to the root index.html (verified live), so these shells
//    exist for ONE reason: route-specific <meta> for social unfurlers, which
//    never execute JS. Each shell is the freshly built index.html with the
//    sentinel-delimited meta block swapped — hashed bundle names therefore
//    stay in sync automatically and can never version-skew.
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const metaBlock = (r) => {
  const m = routeMeta(r);
  const url = `${SITE_ORIGIN}${m.path}`;
  const img = `${OG_ASSET_ORIGIN}${m.ogImage}`;
  // Social cards truncate more aggressively than search results, so a route
  // may carry a shorter `ogDescription`; otherwise both use `description`.
  const ogDesc = m.ogDescription ?? m.description;
  return `<!--meta:start-->
    <!-- GENERATED from routes.manifest.mjs by scripts/post-build.mjs.
         Edits here are overwritten on every build — change the manifest. -->
    <title>${esc(m.title)}</title>
    <meta name="description" content="${esc(m.description)}" />${
      m.keywords ? `\n    <meta name="keywords" content="${esc(m.keywords)}" />` : ""
    }
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="minegold.defi" />
    <meta property="og:title" content="${esc(m.title)}" />
    <meta property="og:description" content="${esc(ogDesc)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(img)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(m.ogImageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(m.title)}" />
    <meta name="twitter:description" content="${esc(ogDesc)}" />
    <meta name="twitter:image" content="${esc(img)}" />
    ${m.noindex ? '<meta name="robots" content="noindex,nofollow" />' : ""}
    <!--meta:end-->`;
};

const rawIndexHtml = readFileSync(resolve(dist, "index.html"), "utf8");
const SENTINELS = /<!--meta:start-->[\s\S]*?<!--meta:end-->/;
if (!SENTINELS.test(rawIndexHtml)) {
  // A silently-unmodified shell is worse than none: it looks deployed while
  // carrying the wrong route's meta. Fail the build.
  throw new Error(
    "[post-build] meta sentinels missing from dist/index.html — cannot generate route shells",
  );
}

// The ROOT route's meta is generated from the manifest too. Without this the
// manifest is the source of truth for every route EXCEPT the most important
// one, whose meta lives hand-written in index.html — and that block silently
// goes stale. (It did: it still described the product as "A Banking.Brave
// protocol" for a while after the two were separated.) Now `/` is generated
// like everything else, and index.html's block is only what dev-mode serves.
const rootRoute = ROUTES.find((r) => r.path === "/");
if (!rootRoute) {
  throw new Error("[post-build] no route with path '/' in the manifest");
}
const indexHtml = rawIndexHtml.replace(SENTINELS, metaBlock(rootRoute));
writeFileSync(resolve(dist, "index.html"), indexHtml);
console.log("[post-build] meta: / (root)");

for (const r of ROUTES.filter((x) => x.shell)) {
  const seg = r.path.replace(/^\//, "");
  const outDir = resolve(dist, seg);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "index.html"),
    indexHtml.replace(SENTINELS, metaBlock(r)),
  );
  console.log(`[post-build] shell: /${seg}`);
}

console.log("[post-build] done");
