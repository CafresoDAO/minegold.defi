import { ExternalLink } from "lucide-react";
import {
  DASHBOARD,
  PARTY_STYLE,
  type CanisterInfo,
} from "../../lib/canisters";

/** One canister in the money path: dashboard-linked id, label, WHO controls
 *  it, and what it does. Data comes from lib/canisters — the one registry. */
export function CanisterRow({ canister }: { canister: CanisterInfo }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
      <a
        href={`${DASHBOARD}/${canister.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2"
      >
        {canister.id.slice(0, 14)}… <ExternalLink size={10} />
      </a>
      <span className="text-zinc-300 font-semibold">{canister.label}</span>
      <span
        className={`rounded-md border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${PARTY_STYLE[canister.party]}`}
      >
        {canister.party}
      </span>
      <span className="text-zinc-500">— {canister.note}</span>
    </li>
  );
}
