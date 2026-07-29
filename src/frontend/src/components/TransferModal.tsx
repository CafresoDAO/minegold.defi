import { Send, XCircle } from "lucide-react";
import { GoldCTA } from "./ui/GoldCTA";

export type TransferToken = "eth" | "uni" | "sgldt";

type Props = {
  token: TransferToken;
  to: string;
  amount: string;
  loading: boolean;
  onToChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const TOKEN_LABEL: Record<TransferToken, string> = {
  eth: "ETH",
  uni: "UNI",
  sgldt: "sGLDT",
};

/** Send-tokens modal for ETH / UNI (Ethereum address) or sGLDT (ICP principal). */
export function TransferModal({
  token,
  to,
  amount,
  loading,
  onToChange,
  onAmountChange,
  onClose,
  onSubmit,
}: Props) {
  const label = TOKEN_LABEL[token];
  return (
    <div
      data-ocid="wallet.transfer.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-md relative">
        <button
          type="button"
          data-ocid="wallet.transfer.close_button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400"
        >
          <XCircle size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              token === "eth"
                ? "bg-blue-500/20"
                : token === "uni"
                  ? "bg-pink-500/20"
                  : "bg-yellow-500/20"
            }`}
          >
            <Send
              size={20}
              className={
                token === "eth"
                  ? "text-blue-400"
                  : token === "uni"
                    ? "text-pink-400"
                    : "text-yellow-500"
              }
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Transfer {label}
            </h2>
            <p className="text-xs text-zinc-500">
              {token === "sgldt"
                ? "ICP Principal required"
                : "Ethereum address required"}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="transfer-address"
              className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block"
            >
              {token === "sgldt"
                ? "Recipient ICP Principal"
                : "Recipient ETH Address"}
            </label>
            <input
              id="transfer-address"
              type="text"
              data-ocid="wallet.transfer.address_input"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              placeholder={
                token === "sgldt" ? "aaaaa-bbbbb-ccccc..." : "0x..."
              }
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-500/60 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="transfer-amount"
              className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block"
            >
              Amount ({label})
            </label>
            <input
              id="transfer-amount"
              type="number"
              data-ocid="wallet.transfer.amount_input"
              value={amount}
              min="0"
              step="0.0001"
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.0000"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-500/60 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-colors"
            />
          </div>
          <GoldCTA
            data-ocid="wallet.transfer.submit_button"
            onClick={onSubmit}
            disabled={!to || !amount || Number.parseFloat(amount) <= 0}
            loading={loading}
            size="md"
            leadingIcon={<Send />}
            trailingIcon={null}
          >
            {loading ? "Submitting…" : "Confirm Transfer"}
          </GoldCTA>
        </div>
      </div>
    </div>
  );
}
