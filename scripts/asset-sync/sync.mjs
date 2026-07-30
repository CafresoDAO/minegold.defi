#!/usr/bin/env node
/**
 * Sync src/frontend/dist → the mainnet frontend asset canister (cqyto)
 * over the standard asset API.
 *
 * WHY NOT `dfx deploy frontend`: the installed module is not dfx's asset
 * canister (Caffeine pipeline origin) — dfx tries to reinstall the wasm and
 * fails ("failed to restore stable state: Cannot parse header"). The canister
 * answers the standard asset API (api_version 2), so we talk to that instead.
 *
 * Known gotchas (learned against the live canister):
 *  - store(bytes, {fileName}) — fileName must have NO leading slash
 *    (AssetManager prepends "/"; a leading slash creates broken "//key").
 *  - create_asset traps "asset already exists" — delete existing keys first.
 *
 * Usage:  node sync.mjs [--dry-run]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";
import { AssetManager } from "@dfinity/assets";
import { HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

const CANISTER_ID = "cqyto-tiaaa-aaaau-agppa-cai";
const HOST = "https://icp-api.io";
const DIST = join(import.meta.dirname, "..", "..", "src", "frontend", "dist");
const PEM = join(
  homedir(),
  ".config/dfx/identity/vm_default_identity_backup/identity.pem",
);
const DRY = process.argv.includes("--dry-run");

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const identity = Secp256k1KeyIdentity.fromPem(readFileSync(PEM, "utf8"));
const agent = await HttpAgent.create({ identity, host: HOST });
const manager = new AssetManager({ canisterId: CANISTER_ID, agent });

console.log(`principal: ${identity.getPrincipal().toText()}`);

const files = walk(DIST).map((abs) => ({
  abs,
  // Forward slashes, no leading slash (AssetManager prepends "/").
  key: relative(DIST, abs).split(sep).join("/"),
}));
console.log(`local files: ${files.length}`);

const existing = await manager.list();
const existingKeys = new Set(existing.map((a) => a.key));
console.log(`canister assets: ${existingKeys.size}`);

// Keys may exist WITH or WITHOUT a leading slash (slashless ones are
// unreachable over HTTP — they come from passing a `path` option to
// batch.store; never do that). Normalize for comparison and delete both
// forms of anything we're replacing, every slashless key (always broken),
// and stale hashed bundles from previous builds.
const uploadKeys = new Set(files.map((f) => `/${f.key}`));
const toDelete = existing
  .map((a) => a.key)
  .filter((k) => {
    const norm = k.startsWith("/") ? k : `/${k}`;
    return (
      !k.startsWith("/") ||
      uploadKeys.has(norm) ||
      (norm.startsWith("/assets/") && !uploadKeys.has(norm))
    );
  });
console.log(`deleting: ${toDelete.length} (replaced or stale bundles)`);

if (DRY) {
  for (const k of toDelete) console.log(`  - ${k}`);
  for (const f of files) console.log(`  + /${f.key}`);
  process.exit(0);
}

for (const key of toDelete) {
  await manager.delete(key);
}
console.log("deletes done");

const batch = manager.batch();
for (const f of files) {
  // Full relative path as fileName, NO `path` option: AssetManager prepends
  // exactly one "/" so the key comes out "/assets/foo.js". Passing a `path`
  // yields slashless keys the HTTP gateway can never match.
  await batch.store(readFileSync(f.abs), { fileName: f.key });
}
await batch.commit();
console.log(`uploaded ${files.length} files — done`);
