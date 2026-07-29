import { CheckCircle2, Copy } from "lucide-react";

type Props = {
  depositAddress: string;
  copied: boolean;
  onCopyAddress: () => void;
  onCancel: () => void;
};

/** Legacy fallback phase — manual deposit flow; should not show in the
 *  normal flow. */
export function PhaseAwaitingDeposit({
  depositAddress,
  copied,
  onCopyAddress,
  onCancel,
}: Props) {
  return (
    <div
      data-ocid="refinery.awaiting_deposit_state"
      className="space-y-4"
    >
      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
        <p className="font-bold text-yellow-400 text-sm">
          Waiting for your deposit on Ethereum...
        </p>
      </div>
      <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-4">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">
          Send UNI to this address
        </p>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-xs text-yellow-300 font-mono break-all leading-relaxed"
            data-ocid="refinery.deposit_address"
          >
            {depositAddress}
          </code>
          <button
            type="button"
            data-ocid="refinery.copy_deposit_address.button"
            onClick={onCopyAddress}
            aria-label="Copy deposit address"
            className="shrink-0 w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-colors"
          >
            {copied ? (
              <CheckCircle2 size={15} className="text-emerald-400" />
            ) : (
              <Copy size={15} className="text-zinc-400" />
            )}
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          data-ocid="refinery.cancel.button"
          onClick={onCancel}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold h-14 rounded-2xl transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
