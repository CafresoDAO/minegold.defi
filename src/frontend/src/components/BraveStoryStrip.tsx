import { Pickaxe, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchCkBatStatus, type CkBatStatus } from "../lib/ckMinter";

type Props = {
  /** Jump to the Minegold.Brave status/waitlist page. */
  onOpenBraveSoon: () => void;
};

const DISMISS_KEY = "minegold_story_dismissed";

/**
 * The three-beat story, truth-gated.
 *
 * Beat 1 (BAT) is a claim about where the product is going, so it is gated by
 * a LIVE check against DFINITY's ckERC-20 minter (fetchCkBatStatus reads
 * supported_ckerc20_tokens on sv3dd-…): until the minter lists BAT, the strip
 * says exactly that — never "coming soon" theater. Beat 2 (the UNI refinery)
 * and beat 3 (ICP custody) are true today and traceable to the code below the
 * strip. Dismissible, remembered per browser.
 */
export function BraveStoryStrip({ onOpenBraveSoon }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [bat, setBat] = useState<CkBatStatus | null>(null);

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    fetchCkBatStatus().then((s) => {
      if (!cancelled) setBat(s);
    });
    return () => {
      cancelled = true;
    };
  }, [dismissed]);

  if (dismissed) return null;

  const batChip = bat === null
    ? "checking DFINITY's minter…"
    : bat.supported
      ? "BAT is live on the chain-key minter — the BAT refinery is opening"
      : bat.error
        ? "minter status check unavailable"
        : "not yet listed by DFINITY's minter — checked live just now";

  return (
    <section
      data-ocid="story.strip"
      className="relative mb-6 rounded-[2rem] border border-yellow-500/20 bg-gradient-to-br from-yellow-500/[0.06] via-zinc-900/60 to-zinc-900/60 p-5 sm:p-6"
    >
      <button
        type="button"
        aria-label="Dismiss"
        data-ocid="story.dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
          <Pickaxe size={18} className="text-yellow-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-white text-base sm:text-lg leading-snug">
            Your browser is the mine.
          </h3>
          <p className="mt-1 text-[12px] sm:text-[13px] text-zinc-400 leading-relaxed">
            Brave pays you <span className="text-orange-300 font-semibold">BAT</span> for
            the ads you already see. MineGold turns that payout into{" "}
            <span className="text-yellow-400 font-semibold">gold</span> — sGLDT, a
            1:1 wrapper of{" "}
            <a
              href="https://gldt.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              Gold DAO&apos;s GLDT
            </a>
            , each backed by 0.01&nbsp;g of vaulted physical gold — and the whole
            refinery runs as a canister on the Internet Computer: no server, no
            company holding your funds.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
            <button
              type="button"
              data-ocid="story.bat_status"
              onClick={onOpenBraveSoon}
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 font-semibold text-orange-300 hover:bg-orange-500/20 transition-colors"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${bat?.supported ? "bg-emerald-400" : "bg-zinc-500"}`}
              />
              BAT refinery: {batChip}
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              UNI refinery: live on mainnet — the same machine, running today
            </span>
            <span className="text-zinc-500">
              Intake: ERC-20 on Ethereum
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
