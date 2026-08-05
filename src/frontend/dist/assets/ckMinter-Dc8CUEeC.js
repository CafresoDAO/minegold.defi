import { N as HttpAgent, O as Actor } from "./index-Dfb_LJyK.js";
const CK_MINTER_CANISTER_ID = "sv3dd-oaaaa-aaaar-qacoa-cai";
const BAT_ERC20_ADDRESS = "0x0D8775F648430679A709E98d2b0Cb6250d2887EF";
const minterIDL = ({ IDL }) => {
  const CkErc20 = IDL.Record({
    ckerc20_token_symbol: IDL.Text,
    erc20_contract_address: IDL.Text,
    ledger_canister_id: IDL.Principal
  });
  const MinterInfo = IDL.Record({
    supported_ckerc20_tokens: IDL.Opt(IDL.Vec(CkErc20))
  });
  return IDL.Service({
    get_minter_info: IDL.Func([], [MinterInfo], ["query"])
  });
};
async function fetchCkBatStatus() {
  const empty = {
    supported: false,
    token: null,
    allTokens: [],
    error: null
  };
  try {
    const agent = await HttpAgent.create({ host: "https://icp-api.io" });
    const actor = Actor.createActor(minterIDL, {
      agent,
      canisterId: CK_MINTER_CANISTER_ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    });
    const info = await actor.get_minter_info();
    const raw = (info == null ? void 0 : info.supported_ckerc20_tokens) ?? [];
    const list = Array.isArray(raw) && raw.length > 0 ? raw[0] : [];
    const allTokens = (list ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t) => {
        var _a, _b;
        return {
          symbol: String(t.ckerc20_token_symbol ?? ""),
          erc20Address: String(t.erc20_contract_address ?? ""),
          ledgerCanisterId: ((_b = (_a = t.ledger_canister_id) == null ? void 0 : _a.toString) == null ? void 0 : _b.call(_a)) ?? ""
        };
      }
    );
    const wanted = BAT_ERC20_ADDRESS.toLowerCase();
    const token = allTokens.find(
      (t) => t.erc20Address.toLowerCase() === wanted || t.symbol.toLowerCase() === "ckbat"
    ) ?? null;
    return { supported: token !== null, token, allTokens, error: null };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Could not reach the ckERC-20 minter"
    };
  }
}
export {
  BAT_ERC20_ADDRESS as B,
  CK_MINTER_CANISTER_ID as C,
  fetchCkBatStatus as f
};
