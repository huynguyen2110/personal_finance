'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { mindmapsApi, nodesApi, UpdateNodeBody } from './api';
import { TreeNode } from './types';

export function useMindmaps() {
  return useQuery({ queryKey: ['mindmaps'], queryFn: mindmapsApi.list });
}

export function useMindmap(id: number) {
  return useQuery({
    queryKey: ['mindmap', id],
    queryFn: () => mindmapsApi.get(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateMindmap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mindmapsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mindmaps'] }),
  });
}

export function useUpdateMindmap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title?: string; description?: string }) =>
      mindmapsApi.update(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['mindmaps'] });
      qc.invalidateQueries({ queryKey: ['mindmap', id] });
    },
  });
}

export function useDeleteMindmap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mindmapsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mindmaps'] }),
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['nodes', mindmapId] });
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
    },
  });
}
