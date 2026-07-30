/**
 * The canonical money-path registry — every canister the product touches,
 * with WHO controls it. One list, consumed by ProofPanel's CanisterRow
 * stack today and the landing page's proof band later (I6). Adding a
 * canister here is a product decision, not a copy edit: each entry is a
 * public claim about custody.
 */

export const DASHBOARD = "https://dashboard.internetcomputer.org/canister";

/** "operator" = Anthony's single controller principal (below); "DFINITY" =
 *  NNS-controlled infrastructure; "Gold DAO / sVault" = third parties we
 *  link to but do not control. */
export type Party = "operator" | "DFINITY" | "Gold DAO / sVault";

export const PARTY_STYLE: Record<Party, string> = {
  operator: "bg-amber-500/10 border-amber-500/25 text-amber-300",
  DFINITY: "bg-blue-500/10 border-blue-500/25 text-blue-300",
  "Gold DAO / sVault": "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
};

/** Sole controller of the backend + frontend canisters — verified live via
 *  `dfx canister info` 2026-07-30. One person. Stated, not hidden. */
export const OPERATOR_CONTROLLER =
  "xip3r-mhzcr-csb7y-ilqf5-4tpge-dka64-jv2ow-zon7z-key3x-77kf3-mae";

export const SGLDT_LEDGER_ID = "i2s4q-syaaa-aaaan-qz4sq-cai";
export const CKUNI_LEDGER_ID = "ilzky-ayaaa-aaaar-qahha-cai";

export type CanisterInfo = {
  label: string;
  id: string;
  party: Party;
  note: string;
};

export const CANISTERS: CanisterInfo[] = [
  {
    label: "Refinery backend (the treasury)",
    id: "c626g-iyaaa-aaaau-agpoa-cai",
    party: "operator",
    note: "holds treasury funds; executes atomic swaps with auto-refund",
  },
  {
    label: "sGLDT ledger (the GLDT wrapper)",
    id: SGLDT_LEDGER_ID,
    party: "Gold DAO / sVault",
    note: "every payout is a block here — sVault's 1:1 GLDT wrapper",
  },
  {
    label: "ckUNI ledger",
    id: CKUNI_LEDGER_ID,
    party: "DFINITY",
    note: "your bridged UNI lives here, in YOUR account",
  },
  {
    label: "ckERC-20 minter",
    id: "sv3dd-oaaaa-aaaar-qacoa-cai",
    party: "DFINITY",
    note: "mints ckUNI after 12 Ethereum blocks — not our code",
  },
  {
    label: "Exchange Rate Canister (XRC)",
    id: "uf6dk-hyaaa-aaaaq-qaaaq-cai",
    party: "DFINITY",
    note: "the UNI/USD oracle — DFINITY infrastructure",
  },
];

/** Dashboard link for a ledger block reference. The public dashboard has no
 *  per-block URL for generic ICRC-1 ledgers, so the honest target is the
 *  ledger canister page itself — the block index in the label is what makes
 *  the row reconcilable. */
export const ledgerUrl = (token: "sGLDT" | "ckUNI"): string =>
  `${DASHBOARD}/${token === "sGLDT" ? SGLDT_LEDGER_ID : CKUNI_LEDGER_ID}`;
