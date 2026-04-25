import { Badge } from "@/components/ui/badge";
import type { BridgeStatus } from "../hooks/useQueries";

type Status = BridgeStatus | string;

export function StatusBadge({ status }: { status: Status }) {
  const s = String(status).toLowerCase();

  if (s === "approved") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
        Approved
      </Badge>
    );
  }
  if (s === "rejected") {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
      Pending
    </Badge>
  );
}
