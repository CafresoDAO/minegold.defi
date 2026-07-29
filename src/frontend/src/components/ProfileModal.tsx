import { CheckCircle2, Copy, Send, UserCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { safeBalance } from "../lib/format";

type ProfileUser = {
  principal: string;
  identityType: string;
};

type Props = {
  user: ProfileUser;
  ethAddress: string | null;
  ethBalance: string | null;
  uniBalance: string | null;
  sgldtBalance: string | null;
  ethUsd: string | null;
  uniUsd: string | null;
  sgldtUsd: string | null;
  onClose: () => void;
  onTransferSgldt: () => void;
};

/** Identity/balances modal — principal + ETH address with copy buttons, plus
 *  wallet balances and the sGLDT transfer entry point. */
export function ProfileModal({
  user,
  ethAddress,
  ethBalance,
  uniBalance,
  sgldtBalance,
  ethUsd,
  uniUsd,
  sgldtUsd,
  onClose,
  onTransferSgldt,
}: Props) {
  const [copiedPrincipal, setCopiedPrincipal] = useState(false);
  const [copiedEthAddress, setCopiedEthAddress] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      data-ocid="profile.modal"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-md relative">
        <button
          type="button"
          data-ocid="profile.close_button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400"
        >
          <XCircle size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-pink-400 rounded-xl flex items-center justify-center">
            <UserCircle2 size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Your Identity</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              {user.identityType}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Principal ID
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-zinc-300 break-all flex-1">
                {user.principal}
              </p>
              <button
                type="button"
                data-ocid="profile.copy.button"
                onClick={() => {
                  navigator.clipboard.writeText(user.principal);
                  setCopiedPrincipal(true);
                  setTimeout(() => setCopiedPrincipal(false), 2000);
                }}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors shrink-0"
                title="Copy to clipboard"
              >
                {copiedPrincipal ? (
                  <CheckCircle2 size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
          {ethAddress && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                ETH Wallet
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-zinc-300 break-all flex-1">
                  {ethAddress}
                </p>
                <button
                  type="button"
                  data-ocid="profile.copy_eth.button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(ethAddress);
                      setCopiedEthAddress(true);
                      setTimeout(() => setCopiedEthAddress(false), 2000);
                    } catch {
                      try {
                        const ta = document.createElement("textarea");
                        ta.value = ethAddress;
                        ta.style.position = "fixed";
                        ta.style.opacity = "0";
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        document.body.removeChild(ta);
                        setCopiedEthAddress(true);
                        setTimeout(() => setCopiedEthAddress(false), 2000);
                      } catch {
                        toast.error(
                          "Could not copy — please copy manually",
                        );
                      }
                    }
                  }}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors shrink-0"
                  title="Copy ETH address"
                >
                  {copiedEthAddress ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          )}
          {ethBalance !== null && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                ETH Balance
              </p>
              <p className="text-sm font-bold text-white">
                {safeBalance(ethBalance)}{" "}
                <span className="text-blue-400">ETH</span>
                {ethUsd && (
                  <span className="text-xs text-zinc-500 ml-2">
                    (~${ethUsd})
                  </span>
                )}
              </p>
            </div>
          )}
          {uniBalance !== null && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                UNI Balance
              </p>
              <p className="text-sm font-bold text-white">
                {safeBalance(uniBalance)}{" "}
                <span className="text-pink-400">UNI</span>
                {uniUsd && (
                  <span className="text-xs text-zinc-500 ml-2">
                    (~${uniUsd})
                  </span>
                )}
              </p>
            </div>
          )}
          {/* sGLDT Balance */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              sGLDT Balance
            </p>
            <p className="text-sm font-bold text-white">
              {sgldtBalance ?? "0.0000"}{" "}
              <span className="text-yellow-500">sGLDT</span>
              {sgldtUsd && (
                <span className="text-xs text-zinc-500 ml-2">
                  (~${sgldtUsd})
                </span>
              )}
            </p>
            <button
              type="button"
              data-ocid="profile.transfer_sgldt.button"
              onClick={onTransferSgldt}
              className="mt-2 flex items-center gap-1 text-[10px] font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
            >
              <Send size={10} /> Transfer sGLDT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
