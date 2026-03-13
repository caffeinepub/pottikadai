import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
const INIT_TIMEOUT_MS = 8000; // 8 second timeout for backend init

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms),
    ),
  ]);
}

export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const isAuthenticated = !!identity;

      const actorOptions = isAuthenticated
        ? { agentOptions: { identity } }
        : undefined;

      const actor = await createActorWithConfig(actorOptions);

      // Initialize access control -- non-blocking: if it times out or fails, continue anyway
      try {
        const adminToken = getSecretParameter("caffeineAdminToken") || "";
        await withTimeout(
          actor._initializeAccessControlWithSecret(adminToken),
          INIT_TIMEOUT_MS,
        );
      } catch {
        // Silently continue -- the app can still function
      }

      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
    retry: false, // Don't retry on failure -- avoids extended loading
  });

  // When the actor changes, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    // Consider loading done once we have data OR once it errored out
    isFetching: actorQuery.isFetching && !actorQuery.data,
  };
}
