import { useMemo } from "react";
import { mergeLedger, type LedgerEntry } from "../lib/ledger";
import {
  useMyRedeems,
  useMyRefines,
  useMyTransactions,
} from "./useQueries";

/**
 * The unified activity stream — three backend queries merged into one
 * newest-first LedgerEntry list (see lib/ledger for the shape and the
 * dedup rule). Loading is true only while NOTHING has arrived; a partial
 * ledger renders immediately and back-fills as the other streams land.
 */
export function useLedger(identity: unknown): {
  entries: LedgerEntry[];
  isLoading: boolean;
  refetch: () => void;
  isFetching: boolean;
} {
  const refines = useMyRefines(identity);
  const redeems = useMyRedeems(identity);
  const txs = useMyTransactions();

  const entries = useMemo(
    () => mergeLedger(refines.data, redeems.data, txs.data),
    [refines.data, redeems.data, txs.data],
  );

  return {
    entries,
    isLoading: refines.isLoading && redeems.isLoading && txs.isLoading,
    isFetching: refines.isFetching || redeems.isFetching || txs.isFetching,
    refetch: () => {
      void refines.refetch();
      void redeems.refetch();
      void txs.refetch();
    },
  };
}
