'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { propertiesApi, PropertyType, SelectOption } from './api';

export function useProperties(mindmapId: number) {
  return useQuery({
    queryKey: ['properties', mindmapId],
    queryFn: () => propertiesApi.list(mindmapId),
    enabled: Number.isFinite(mindmapId),
  });
}

export function useCreateProperty(mindmapId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      type: PropertyType;
      options?: SelectOption[];
    }) => propertiesApi.create(mindmapId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['properties', mindmapId] }),
  });
}

export function useUpdateProperty(mindmapId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      propId,
      ...body
    }: {
      propId: number;
      name?: string;
      options?: SelectOption[];
    }) => propertiesApi.update(mindmapId, propId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['properties', mindmapId] }),
  });
}

export function useDeleteProperty(mindmapId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propId: number) => propertiesApi.remove(mindmapId, propId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['properties', mindmapId] }),
  });
}

export function useSetNodeValues(mindmapId: number, nodeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<number, unknown>) =>
      propertiesApi.setNodeValues(mindmapId, nodeId, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['node', nodeId] });
      // Canvas chips read values from the tree payload — refresh it too.
      qc.invalidateQueries({ queryKey: ['nodes', mindmapId] });
    },
  });
}
