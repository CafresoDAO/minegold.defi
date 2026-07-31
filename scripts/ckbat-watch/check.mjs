#!/usr/bin/env node
/**
 * Does DFINITY's ckERC-20 minter list BAT yet?
 *
 * BAT intake is gated on exactly one external fact, decided by NNS vote — a
 * process we participate in but don't control. Rather than rely on somebody
 * noticing a proposal pass, this asks the minter directly.
 *
 * Run by .github/workflows/ckbat-watch.yml on a schedule, and by the operator
 * by hand:
 *
 *   npm install --prefix scripts/ckbat-watch
 *   node scripts/ckbat-watch/check.mjs
 *
 * WHY THIS ISN'T SHARED WITH THE FRONTEND: src/frontend/src/lib/ckMinter.ts
 * does the same query for the /brave page. Importing it here would mean
 * installing the frontend's whole dependency tree in CI to run one query
 * call. The duplicated part is a five-field IDL fragment and one contract
 * address; both are pinned below with the same constants, and both are
 * checked against the same live canister, so a divergence shows up as this
 * job disagreeing with the page rather than as silence.
 *
 * Exit codes: 0 = ran successfully (check `supported` in the output),
 *             1 = the check itself failed (network, decode). A failed check
 *                 is NOT "not supported" and must never be reported as such.
 */
import { Actor, HttpAgent } from "@dfinity/agent";
import { appendFileSync } from "node:fs";

/** Mainnet ckETH/ckERC-20 minter. */
const CK_MINTER_CANISTER_ID = "sv3dd-oaaaa-aaaar-qacoa-cai";
/** BAT's ERC-20 contract on Ethereum mainnet. Matching on the ADDRESS rather
 *  than the symbol is deliberate: the address is the identity of the asset,
 *  and a symbol collision would otherwise open a false-positive issue. */
const BAT_ERC20_ADDRESS = "0x0D8775F648430679A709E98d2b0Cb6250d2887EF";

const minterIDL = ({ IDL }) => {
  const CkErc20 = IDL.Record({
    ckerc20_token_symbol: IDL.Text,
    erc20_contract_address: IDL.Text,
    ledger_canister_id: IDL.Principal,
  });
  const MinterInfo = IDL.Record({
    supported_ckerc20_tokens: IDL.Opt(IDL.Vec(CkErc20)),
  });
  return IDL.Service({
    get_minter_info: IDL.Func([], [MinterInfo], ["query"]),
  });
};

const main = async () => {
  const agent = await HttpAgent.create({ host: "https://icp-api.io" });
  const actor = Actor.createActor(minterIDL, {
    agent,
    canisterId: CK_MINTER_CANISTER_ID,
  });

  const info = await actor.get_minter_info();
  const raw = info?.supported_ckerc20_tokens ?? [];
  const list = Array.isArray(raw) && raw.length > 0 ? raw[0] : [];

  const tokens = (list ?? []).map((t) => ({
    symbol: String(t.ckerc20_token_symbol ?? ""),
    erc20Address: String(t.erc20_contract_address ?? ""),
    ledgerCanisterId: t.ledger_canister_id?.toString?.() ?? "",
  }));

  const wanted = BAT_ERC20_ADDRESS.toLowerCase();
  const bat = tokens.find((t) => t.erc20Address.toLowerCase() === wanted) ?? null;

  const result = {
    checkedAt: new Date().toISOString(),
    supported: bat !== null,
    token: bat,
    tokenCount: tokens.length,
    symbols: tokens.map((t) => t.symbol).sort(),
  };

  console.log(JSON.stringify(result, null, 2));

  // Surface to the workflow. GITHUB_OUTPUT is absent on a local run.
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `supported=${result.supported}\n` +
        `ledger=${bat?.ledgerCanisterId ?? ""}\n` +
        `symbol=${bat?.symbol ?? ""}\n` +
        `token_count=${result.tokenCount}\n`,
    );
  }
};

main().catch((e) => {
  // Loud and non-zero. A silent failure here would look exactly like "BAT
  // still isn't listed", which is the one wrong conclusion to draw.
  console.error("ckbat-watch: check FAILED (this is not the same as 'not supported')");
  console.error(e);
  process.exit(1);
});
