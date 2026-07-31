/**
 * Route manifest — the single source of truth for paths, per-route meta, and
 * which routes get static OG shells. Consumed by:
 *   - src/hooks/usePathRoute.ts        (route ids + path parsing)
 *   - scripts/post-build.mjs           (shell generation)
 *   - ../../scripts/asset-sync/sync.mjs (extensionless shell keys + types)
 *
 * SITE_ORIGIN is for OG/canonical URLs ONLY. It is deliberately a different
 * constant from II_DERIVATION_ORIGIN in src/auth.tsx: OG wants the pretty
 * human domain; identity derivation must stay on the raw canister origin
 * FOREVER. Do not unify them — that "cleanup" would strand every user's
 * balance (see the warning block in auth.tsx).
 */
export const SITE_ORIGIN = "https://banking.cafreso.com";

/** Where OG IMAGES are fetched from. Crawlers fetch og:image at unfurl time,
 *  so it must be an origin that resolves TODAY — the raw canister URL —
 *  even while og:url/canonical point at the (not-yet-live) custom domain.
 *  Flip this to SITE_ORIGIN once banking.cafreso.com DNS is verified. */
export const OG_ASSET_ORIGIN = "https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io";

/** Shared OG image (1200×630). Route-specific cards can override later. */
const OG_IMAGE = "/brand/og-card.png";
const OG_IMAGE_ALT =
  "minegold.defi — the on-chain gold refinery on the Internet Computer";

export const ROUTES = [
  {
    id: "refinery",
    path: "/",
    shell: false, // the root index.html IS this route's shell
    title: "minegold.defi — tokens in, gold out",
    description:
      "Deposit UNI from Ethereum via DFINITY's chain-key minter — your keys, your account — and receive sGLDT, a 1:1 wrapper of Gold DAO's physically backed GLDT. Withdraw any time. An application in the Banking.Brave ecosystem, powered by CafresoDAO.",
    // Social cards truncate hard; this is the same claim, shorter.
    ogDescription:
      "Deposit UNI, receive sGLDT — a 1:1 wrapper of physically backed GLDT — through chain-key custody you keep. Withdraw any time. Built on the Internet Computer.",
    keywords:
      "Banking Brave, CafresoDAO, defi, ICP, Internet Computer, cross-chain, ckERC-20, minegold, sGLDT, GLDT, gold, UNI, BAT",
  },
  {
    id: "portfolio",
    path: "/portfolio",
    shell: true,
    title: "Banking.Brave — powered by CafresoDAO",
    description:
      "On-chain financial applications on the Internet Computer. minegold.defi converts tokens into gold-backed sGLDT today; BAT intake opens the day DFINITY lists ckBAT.",
  },
  {
    id: "brave",
    path: "/brave",
    shell: true,
    title: "BAT intake — minegold.defi",
    description:
      "Brave pays its users BAT for the ads they already see. This intake will refine it into gold through the same refinery the UNI intake uses today — gated on DFINITY listing ckBAT, checked live against the minter on this page.",
  },
  {
    id: "proof",
    path: "/proof",
    shell: true,
    title: "Proof & transparency — minegold.defi",
    description:
      "Live treasury liquidity, the full rate formula with oracle provenance, every canister in the money path, and the limitations stated plainly. Verify it — don't trust it.",
  },
  {
    id: "docs",
    path: "/docs",
    shell: true,
    title: "Documentation — minegold.defi",
    description:
      "How the refinery works, the full rate methodology, every exit path, and the limitations stated as plainly as the strengths. No sign-in required for any of it.",
  },
  // Each doc gets its own shell so it unfurls as itself when shared. The
  // risks page in particular gets linked BY skeptics — it should arrive
  // carrying its own title, not the generic site card.
  {
    id: "docs-how-it-works",
    path: "/docs/how-it-works",
    shell: true,
    title: "How it works — minegold.defi",
    description:
      "The full path from a token on Ethereum to gold-backed sGLDT: DFINITY's chain-key minter, atomic settlement with auto-refund, and what sGLDT is actually backed by.",
  },
  {
    id: "docs-risks",
    path: "/docs/risks",
    shell: true,
    title: "Risks & limitations — minegold.defi",
    description:
      "Unaudited. One operator controls the treasury. One leg of the rate is operator-set. Payouts depend on treasury liquidity. The honest list, and how to verify every item on it yourself.",
  },
  {
    id: "docs-rate-methodology",
    path: "/docs/rate-methodology",
    shell: true,
    title: "How the rate is made — minegold.defi",
    description:
      "The whole formula: UNI/USD from DFINITY's Exchange Rate Canister divided by an operator-set sGLDT/USD reference, with every guardrail and its actual number.",
  },
  {
    id: "docs-redeem-and-recovery",
    path: "/docs/redeem-and-recovery",
    shell: true,
    title: "Redeem & recovery — minegold.defi",
    description:
      "Three ways out of sGLDT, two of which don't involve us at all. Plus what to do when a deposit stalls, a swap fails, or you lose access to your vault.",
  },
  {
    id: "history",
    path: "/history",
    shell: false,
    noindex: true,
    title: "Activity — minegold.defi",
    description: "Your refines, redeems, and transfers.",
  },
  {
    id: "admin",
    path: "/admin",
    shell: false,
    noindex: true,
    title: "Operator console — minegold.defi",
    description: "Operator console.",
  },
  {
    id: "receipt",
    path: "/receipt",
    param: "id",
    shell: false,
    noindex: true, // per-id OG would leak transaction data; generic card only
    title: "Receipt — minegold.defi",
    description: "An on-chain refinery receipt.",
  },
];

/** Per-route OG image/meta used by shell generation. */
export const routeMeta = (r) => ({
  ...r,
  ogImage: OG_IMAGE,
  ogImageAlt: OG_IMAGE_ALT,
});
