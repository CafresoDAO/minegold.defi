import { HttpAgent } from "@icp-sdk/core/agent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useInternetIdentity } from "../auth";
import { createActor } from "../backend";

const BACKEND_HOST = "https://icp-api.io";
const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
const ACTOR_QUERY_KEY = "actor";

const noopUpload = async () => new Uint8Array();
const noopDownload = async () => {
  throw new Error("blob download not supported");
};

export function useBackendActor() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principalText = identity?.getPrincipal().toString() ?? "anon";

  const actorQuery = useQuery({
    queryKey: [ACTOR_QUERY_KEY, principalText],
    queryFn: async () => {
      const agent = await HttpAgent.create({
        identity: identity as never,
        host: BACKEND_HOST,
      });
      return createActor(
        BACKEND_CANISTER_ID,
        noopUpload as never,
        noopDownload as never,
        { agent },
      );
    },
    // Don't build an actor before II has finished initializing — otherwise we
    // cache an anonymous actor that sticks around after login.
    enabled: !isInitializing,
    staleTime: Number.POSITIVE_INFINITY,
  });

  // When the actor changes (login/logout), invalidate every dependent query so
  // they refetch with the correct identity.
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (q) => !q.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (q) => !q.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
