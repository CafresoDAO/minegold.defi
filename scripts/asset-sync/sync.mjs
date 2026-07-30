#!/usr/bin/env node
/**
 * Sync src/frontend/dist → the mainnet frontend asset canister (cqyto)
 * over the standard asset API.
 *
 * WHY NOT `dfx deploy frontend`: the installed module is not dfx's asset
 * canister (Caffeine pipeline origin) — dfx tries to reinstall the wasm and
 * fails ("failed to restore stable state: Cannot parse header"). The canister
 * answers the standard asset API (api_version 2), so we talk to that instead.
 * Corollary: `.ic-assets.json5` is a dfx-CLIENT feature and is 100% inert on
 * this deploy path — content types and headers must be set HERE.
 *
 * Known gotchas (learned against the live canister):
 *  - store(bytes, {fileName}) — fileName must have NO leading slash and NO
 *    `path` option (a `path` yields slashless keys the gateway can't serve).
 *  - create_asset traps "asset already exists" — delete before re-store.
 *  - @dfinity/assets falls back to application/octet-stream for extensionless
 *    files (this shipped /.well-known/ii-alternative-origins as octet-stream
 *    once). contentTypeFor() below THROWS instead of guessing.
 *  - This @dfinity/assets version has no set_asset_properties: a wrong
 *    content type can only be fixed by delete + recreate.
 *
 * Usage:  node sync.mjs [--dry-run] [--only <substring>]
 *   --only  restricts the sync to keys containing <substring> — e.g.
 *           `--only .well-known` deploys ONLY the identity files without
 *           touching index.html or the bundles. Use for surgical deploys.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";
import { AssetManager } from "@dfinity/assets";
import { HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import mime from "mime/lite.js";
import { ROUTES } from "../../src/frontend/routes.manifest.mjs";

const CANISTER_ID = "cqyto-tiaaa-aaaau-agppa-cai";
const HOST = "https://icp-api.io";
const DIST = join(import.meta.dirname, "..", "..", "src", "frontend", "dist");
const PEM = join(
  homedir(),
  ".config/dfx/identity/vm_default_identity_backup/identity.pem",
);
const DRY = process.argv.includes("--dry-run");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;
if (onlyIdx !== -1 && !ONLY) {
  throw new Error("--only requires a substring argument");
}

/** Extensionless assets the mime table cannot classify. Anything else
 *  unclassifiable FAILS the deploy — a loud error beats silently shipping
 *  application/octet-stream (which downloads instead of rendering, and which
 *  Internet Identity tooling may reject). */
const EXPLICIT_CONTENT_TYPE = {
  ".well-known/ii-alternative-origins": "application/json",
  ".well-known/ic-domains": "text/plain",
  "favicon.ico": "image/x-icon", // mime/lite has no .ico entry
};
// Route shells are ALSO published at their extensionless key ("/proof") —
// the canonical shareable URL. Directory-index aliasing is unverified on
// this canister module and unsettable from this @dfinity/assets version,
// so both keys are explicit. Content types derived from the manifest so
// they can't drift.
for (const r of ROUTES.filter((x) => x.shell)) {
  EXPLICIT_CONTENT_TYPE[r.path.replace(/^\//, "")] = "text/html";
}

const contentTypeFor = (key) => {
  const explicit = EXPLICIT_CONTENT_TYPE[key];
  if (explicit) return explicit;
  const guessed = mime.getType(key);
  if (guessed) return guessed;
  throw new Error(
    `sync.mjs: no content type for "${key}". Add it to EXPLICIT_CONTENT_TYPE ` +
      `rather than letting it deploy as application/octet-stream.`,
  );
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const identity = Secp256k1KeyIdentity.fromPem(readFileSync(PEM, "utf8"));
const agent = await HttpAgent.create({ identity, host: HOST });
const manager = new AssetManager({ canisterId: CANISTER_ID, agent });

console.log(`principal: ${identity.getPrincipal().toText()}`);

let files = walk(DIST).map((abs) => ({
  abs,
  // Forward slashes, no leading slash (AssetManager prepends "/").
  key: relative(DIST, abs).split(sep).join("/"),
}));
// Extensionless twins for the OG shells: /proof serves proof/index.html's
// bytes under the bare key.
for (const r of ROUTES.filter((x) => x.shell)) {
  const seg = r.path.replace(/^\//, "");
  const abs = join(DIST, seg, "index.html");
  if (files.some((f) => f.key === `${seg}/index.html`)) {
    files.push({ abs, key: seg });
  }
}
if (ONLY) {
  files = files.filter((f) => f.key.includes(ONLY));
  console.log(`--only "${ONLY}": ${files.length} file(s) selected`);
  if (files.length === 0) throw new Error(`--only "${ONLY}" matched nothing`);
}
// Validate every content type UP FRONT so a bad key aborts before any
// delete touches the live canister.
for (const f of files) contentTypeFor(f.key);
console.log(`local files: ${files.length}`);

const existing = await manager.list();
const existingKeys = new Set(existing.map((a) => a.key));
console.log(`canister assets: ${existingKeys.size}`);

const uploadKeys = new Set(files.map((f) => `/${f.key}`));
// Replaced keys are deleted IMMEDIATELY BEFORE their re-store (interleaved,
// below) to keep the unavailable window per-asset instead of site-wide.
// Separately deletable up front (harmless while the site runs): slashless
// keys (never servable) and stale hashed bundles from previous builds.
// Under --only, stale-bundle cleanup is skipped — surgical means surgical.
const preDelete = existing
  .map((a) => a.key)
  .filter((k) => {
    if (!k.startsWith("/")) return true; // broken key, always remove
    if (ONLY) return false;
    return k.startsWith("/assets/") && !uploadKeys.has(k);
  });
console.log(`pre-deleting: ${preDelete.length} (broken keys + stale bundles)`);

if (DRY) {
  for (const k of preDelete) console.log(`  - ${k}`);
  for (const f of files) {
    const replacing = existingKeys.has(`/${f.key}`) ? " (replace)" : "";
    console.log(`  + /${f.key} [${contentTypeFor(f.key)}]${replacing}`);
  }
  process.exit(0);
}

for (const key of preDelete) {
  await manager.delete(key);
}

// Interleaved delete+store per key: each asset is missing only for the
// instant between its own delete and the batch commit — and we order
// index.html LAST so the entry point keeps referencing bundles that are
// already uploaded.
files.sort((a, b) =>
  a.key === "index.html" ? 1 : b.key === "index.html" ? -1 : 0,
);
const batch = manager.batch();
for (const f of files) {
  if (existingKeys.has(`/${f.key}`)) {
    await manager.delete(`/${f.key}`);
  }
  await batch.store(readFileSync(f.abs), {
    fileName: f.key,
    contentType: contentTypeFor(f.key),
  });
}
await batch.commit();
console.log(`uploaded ${files.length} files — done`);
