// Anonymous client for DFINITY's ckETH/ckERC-20 minter.
//
// Minegold.Brave is gated on one external fact: whether the minter has listed
// BAT yet. Rather than hard-code "coming soon" and rely on someone noticing an
// NNS proposal, the page asks the minter directly on every load — so the moment
// ckBAT ships, the UI flips to live on its own.
//
// Query call, no identity, no backend canister involved.
import { Actor, HttpAgent } from "@dfinity/agent";

/** Mainnet ckETH/ckERC-20 minter. */
export const CK_MINTER_CANISTER_ID = "sv3dd-oaaaa-aaaar-qacoa-cai";

/** BAT's ERC-20 contract on Ethereum mainnet — the address to match against
 *  the minter's allowlist (symbols could in principle differ). */
export const BAT_ERC20_ADDRESS = "0x0D8775F648430679A709E98d2b0Cb6250d2887EF";

export interface CkErc20Token {
  symbol: string;
  erc20Address: string;
  ledgerCanisterId: string;
}

export interface CkBatStatus {
  /** True once the minter lists BAT — the page goes live off this. */
  supported: boolean;
  /** The ckBAT entry, when supported. */
  token: CkErc20Token | null;
  /** Everything the minter currently bridges (shown as evidence). */
  allTokens: CkErc20Token[];
  /** Set when the lookup itself failed; UI falls back to a static message. */
  error: string | null;
}

// Partial IDL — Candid record subtyping lets us decode only the fields we read
// and ignore the rest of get_minter_info's (large) response.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const minterIDL = ({ IDL }: any) => {
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

/** Ask the minter what it bridges today. Never throws. */
export async function fetchCkBatStatus(): Promise<CkBatStatus> {
  const empty: CkBatStatus = {
    supported: false,
    token: null,
    allTokens: [],
    error: null,
  };
  try {
    const agent = await HttpAgent.create({ host: "https://icp-api.io" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = Actor.createActor(minterIDL, {
      agent,
      canisterId: CK_MINTER_CANISTER_ID,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const info = await actor.get_minter_info();
    const raw = info?.supported_ckerc20_tokens ?? [];
    // IDL.Opt decodes to [] | [value]
    const list = Array.isArray(raw) && raw.length > 0 ? raw[0] : [];

    const allTokens: CkErc20Token[] = (list ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any): CkErc20Token => ({
        symbol: String(t.ckerc20_token_symbol ?? ""),
        erc20Address: String(t.erc20_contract_address ?? ""),
        ledgerCanisterId: t.ledger_canister_id?.toString?.() ?? "",
      }),
    );

    const wanted = BAT_ERC20_ADDRESS.toLowerCase();
    const token =
      allTokens.find(
        (t) =>
          t.erc20Address.toLowerCase() === wanted ||
          t.symbol.toLowerCase() === "ckbat",
      ) ?? null;

    return { supported: token !== null, token, allTokens, error: null };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Could not reach the ckERC-20 minter",
    };
  }
}
