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
    title: "minegold.defi — turn your tokens into gold, on-chain",
    description:
      "The on-chain gold refinery. Bridge UNI from Ethereum via DFINITY's chain-key minter — your keys, your account — and refine it into sGLDT, a 1:1 wrapper of Gold DAO's physically backed GLDT. A Banking.Brave protocol.",
  },
  {
    id: "portfolio",
    path: "/portfolio",
    shell: true,
    title: "Banking.Brave — on-chain financial protocols",
    description:
      "The Banking.Brave protocol family on the Internet Computer. minegold.defi refines tokens into gold today; Minegold.Brave opens for BAT the day DFINITY lists ckBAT.",
  },
  {
    id: "brave",
    path: "/brave",
    shell: true,
    title: "Minegold.Brave — your browser is the mine",
    description:
      "Brave pays you BAT for the ads you already see. Minegold.Brave will refine it into gold — gated on DFINITY listing ckBAT, checked live on this page.",
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
