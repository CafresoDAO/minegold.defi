import howItWorks from "./how-it-works.md?raw";
import rateMethodology from "./rate-methodology.md?raw";
import redeemAndRecovery from "./redeem-and-recovery.md?raw";
import risks from "./risks.md?raw";

/**
 * The docs registry — the single source of truth for which docs exist, their
 * URLs, and their per-page meta.
 *
 * These four files ship to users. Operator-facing documents (RUNBOOK.md, the
 * ckBAT proposal) live in the repo-root `docs/` directory and are
 * deliberately NOT imported here — nothing in this registry should be
 * something we'd mind a stranger reading.
 *
 * Adding a doc means: a .md file beside this one, an entry below, and a
 * matching route in routes.manifest.mjs (which generates its OG shell). The
 * manifest is the thing that makes the page shareable; forgetting it yields
 * a page that works but unfurls as the generic card.
 */
export type DocSlug =
  | "how-it-works"
  | "risks"
  | "rate-methodology"
  | "redeem-and-recovery";

export type DocEntry = {
  slug: DocSlug;
  /** Title used in the index, the page header, and <title>. */
  title: string;
  /** One line — shown on the index card. Plain, not promotional. */
  blurb: string;
  body: string;
};

export const DOCS: readonly DocEntry[] = [
  {
    slug: "how-it-works",
    title: "How it works",
    blurb:
      "The full path from a token on Ethereum to gold-backed sGLDT — including the parts run by DFINITY and Gold DAO rather than by us.",
    body: howItWorks,
  },
  {
    slug: "risks",
    title: "Risks & limitations",
    blurb:
      "Unaudited, single-operator, one rate leg we set ourselves. The honest list, and how to verify every item on it.",
    body: risks,
  },
  {
    slug: "rate-methodology",
    title: "How the rate is made",
    blurb:
      "The whole formula, both inputs, every guardrail with its actual number — and what would make it better.",
    body: rateMethodology,
  },
  {
    slug: "redeem-and-recovery",
    title: "Redeem & recovery",
    blurb:
      "Three ways out, two of which don't involve us at all. Plus what to do when a step goes wrong.",
    body: redeemAndRecovery,
  },
] as const;

export const docBySlug = (slug: string): DocEntry | undefined =>
  DOCS.find((d) => d.slug === slug);
