'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { mindmapsApi, nodesApi, UpdateNodeBody } from './api';
import { TreeNode } from './types';

export function usePrimaryMindmap() {
  return useQuery({
    queryKey: ['mindmap', 'primary'],
    queryFn: mindmapsApi.primary,
    staleTime: Infinity,
  });
}

export function useMindmap(id: number) {
  return useQuery({
    queryKey: ['mindmap', id],
    queryFn: () => mindmapsApi.get(id),
    enabled: Number.isFinite(id),
  });
}

// ---- nodes ----

export function useNodes(mindmapId: number) {
  return useQuery({
    queryKey: ['nodes', mindmapId],
    queryFn: () => nodesApi.list(mindmapId),
    enabled: Number.isFinite(mindmapId),
  });
}

export function useCreateNode(mindmapId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { parentId: number; title?: string }) =>
      nodesApi.create(mindmapId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nodes', mindmapId] }),
  });
}

export function useUpdateNode(mindmapId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, ...body }: UpdateNodeBody & { nodeId: number }) =>
      nodesApi.update(mindmapId, nodeId, body),
    // Optimistic: patch the cached tree immediately.
    onMutate: async ({ nodeId, ...body }) => {
      await qc.cancelQueries({ queryKey: ['nodes', mindmapId] });
      const previous = qc.getQueryData<TreeNode[]>(['nodes', mindmapId]);
      if (previous) {
        qc.setQueryData<TreeNode[]>(
          ['nodes', mindmapId],
          previous.map((n) =>
            n.id === nodeId ? ({ ...n, ...body } as TreeNode) : n,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['nodes', mindmapId], context.previous);
      }
    },
    onSettled: (_data, _err, { nodeId }) => {
      qc.invalidateQueries({ queryKey: ['nodes', mindmapId] });
      qc.invalidateQueries({ queryKey: ['node', nodeId] });
      qc.invalidateQueries({ queryKey: ['plan', mindmapId] });
    },
  });
}

export function useDeleteNode(mindmapId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: number) => nodesApi.remove(mindmapId, nodeId),
    onMutate: async (nodeId) => {
      await qc.cancelQueries({ queryKey: ['nodes', mindmapId] });
      const previous = qc.getQueryData<TreeNode[]>(['nodes', mindmapId]);
      if (previous) {
        // Drop the whole subtree locally for instant feedback.
        const toRemove = new Set<number>([nodeId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const n of previous) {
            if (
              n.parentId !== null &&
              toRemove.has(n.parentId) &&
              !toRemove.has(n.id)
            ) {
              toRemove.add(n.id);
              changed = true;
            }
          }
        }
        qc.setQueryData<TreeNode[]>(
          ['nodes', mindmapId],
          previous.filter((n) => !toRemove.has(n.id)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['nodes', mindmapId], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['nodes', mindmapId] });
      // Xóa nhánh → liên kết của nhánh bị xóa theo (cascade)
      qc.invalidateQueries({ queryKey: ['links', mindmapId] });
      qc.invalidateQueries({ queryKey: ['plan', mindmapId] });
    },
  });
}
