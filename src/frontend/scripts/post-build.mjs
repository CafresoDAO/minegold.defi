#!/usr/bin/env node
/**
 * Cross-platform post-build copy step.
 *
 * Replaces the Unix-only `cp env.json dist/ && cp -r public/.well-known ...`
 * scripts so `pnpm build` works identically on Windows cmd, PowerShell, and
 * any Unix shell. Uses only Node's built-in `fs` — no extra dependency.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("[post-build] done");
