'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { LinkKind, linksApi } from './api';

export function useLinks(mindmapId: number) {
  return useQuery({
    queryKey: ['links', mindmapId],
    queryFn: () => linksApi.list(mindmapId),
    enabled: Number.isFinite(mindmapId),
  });
}

function useInvalidateLinks(mindmapId: number) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['links', mindmapId] });
    qc.invalidateQueries({ queryKey: ['plan', mindmapId] });
  };
}

export function useCreateLink(mindmapId: number) {
  const invalidate = useInvalidateLinks(mindmapId);
  return useMutation({
    mutationFn: (body: {
      sourceNodeId: number;
      targetNodeId: number;
      kind: LinkKind;
      note?: string | null;
    }) => linksApi.create(mindmapId, body),
    onSuccess: invalidate,
  });
}

export function useUpdateLink(mindmapId: number) {
  const invalidate = useInvalidateLinks(mindmapId);
  return useMutation({
    mutationFn: ({
      linkId,
      ...body
    }: {
      linkId: number;
      kind?: LinkKind;
      note?: string | null;
    }) => linksApi.update(mindmapId, linkId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteLink(mindmapId: number) {
  const invalidate = useInvalidateLinks(mindmapId);
  return useMutation({
    mutationFn: (linkId: number) => linksApi.remove(mindmapId, linkId),
    onSuccess: invalidate,
  });
}
