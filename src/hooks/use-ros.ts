import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ros, type RosRecord } from "@/lib/api";
import { errorMessage } from "@/lib/utils";

/** List a RouterOS menu, e.g. `useRosList("ip/address")`. */
export function useRosList<T = RosRecord>(path: string, opts: { refetchInterval?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["ros", path],
    queryFn: () => ros.list<T>(path),
    refetchInterval: opts.refetchInterval,
    enabled: opts.enabled,
  });
}

/** Read a singleton menu, e.g. `useRosItem("system/identity")`. */
export function useRosItem<T = Record<string, string>>(path: string, opts: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: ["ros", path],
    queryFn: () => ros.get<T>(path),
    refetchInterval: opts.refetchInterval,
  });
}

/** Create / update / remove rows of a menu and refresh it afterwards. */
export function useRosMutations(path: string, invalidate: string[] = []) {
  const qc = useQueryClient();
  const refresh = () => {
    for (const p of [path, ...invalidate]) qc.invalidateQueries({ queryKey: ["ros", p] });
  };
  const onError = (e: unknown) => toast.error(errorMessage(e));

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => ros.create(path, body),
    onSuccess: refresh,
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => ros.update(path, id, body),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => ros.remove(path, id),
    onSuccess: refresh,
    onError,
  });
  return { create, update, remove, refresh };
}

/** Run a command such as `system/identity/set`. */
export function useRosCommand(path: string, invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown> = {}) => ros.run(path, body),
    onSuccess: () => {
      for (const p of invalidate) qc.invalidateQueries({ queryKey: ["ros", p] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
