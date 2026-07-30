/**
 * THE canonical user journey — one map, consumed everywhere a step list
 * appears (LoginOverlay, the connect card, HowItWorksStrip). Before this
 * existed the overlay said 3 steps, the connect card said "Step 1 of 2",
 * and the strip said 4 — three surfaces disagreeing about the same journey.
 *
 * The metaphor is fixed and must never fork:
 *   passkey / Internet Identity  =  YOUR VAULT   (where the gold lives)
 *   Ethereum wallet              =  YOUR WALLET  (where the tokens you're
 *                                                 spending live)
 * Say "vault" and "wallet"; never "identity", "principal", or "canister"
 * in default UI. Technical terms live behind disclosure toggles.
 */
export type JourneyStep = {
  /** 1-based position, referenced by "Step N of 4" chips. */
  n: 1 | 2 | 3 | 4;
  title: string;
  /** One line, plain language. */
  sub: string;
};

export const JOURNEY: readonly JourneyStep[] = [
  { n: 1, title: "Vault", sub: "Face ID or fingerprint — where your gold will live" },
  { n: 2, title: "Wallet", sub: "connect the wallet holding your UNI" },
  { n: 3, title: "Deposit", sub: "two taps in your wallet; Ethereum confirms in ~3 min" },
  { n: 4, title: "Gold", sub: "sGLDT lands in your vault — withdraw any time" },
] as const;

export const JOURNEY_TOTAL = JOURNEY.length;
