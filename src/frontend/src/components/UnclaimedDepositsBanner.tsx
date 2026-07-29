import { Coins } from "lucide-react";
import { GoldCTA } from "./ui/GoldCTA";

type Props = {
  count: number;
  claiming: boolean;
  onClaim: () => void;
};

/** Safety-net banner for confirmed deposits the frontend missed claiming
 *  (e.g. user closed the tab after the tx confirmed). */
export function UnclaimedDepositsBanner({ count, claiming, onClaim }: Props) {
  return (
    <div className="mb-6 rounded-3xl border border-yellow-500/40 bg-yellow-500/10 backdrop-blur p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="shrink-0 w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
        <Coins className="w-6 h-6 text-yellow-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-black text-yellow-300 mb-1">
          {count === 1
            ? "1 unclaimed deposit ready to mint sGLDT"
            : `${count} unclaimed deposits ready to mint sGLDT`}
        </p>
        <p className="text-xs text-yellow-200/70">
          Your UNI deposit is confirmed on Ethereum. Claim your sGLDT now — this takes ~5 seconds.
        </p>
      </div>
      <GoldCTA
        data-ocid="deposits.claim.button"
        loading={claiming}
        onClick={onClaim}
        size="md"
        fullWidth={false}
        trailingIcon={null}
        className="w-full sm:w-auto"
      >
        {claiming ? "Claiming…" : "Claim sGLDT"}
      </GoldCTA>
    </div>
  );
}
