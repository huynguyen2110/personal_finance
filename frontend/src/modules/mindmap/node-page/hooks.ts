'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { nodesApi } from '@/modules/mindmap/mindmaps/api';

export function useNodeDetail(mindmapId: number, nodeId: number) {
  return useQuery({
    queryKey: ['node', nodeId],
    queryFn: () => nodesApi.detail(mindmapId, nodeId),
    enabled: Number.isFinite(mindmapId) && Number.isFinite(nodeId),
  });
}

export type SaveStatus = 'idle' | 'saving' | 'saved';

/** Debounced (1s) TipTap autosave; refreshes the canvas hasPage flag. */
export function useSaveNodePage(mindmapId: number, nodeId: number) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutation = useMutation({
    mutationFn: (pageContent: object) =>
      nodesApi.update(mindmapId, nodeId, { pageContent }),
    onSuccess: () => {
      setStatus('saved');
      qc.invalidateQueries({ queryKey: ['nodes', mindmapId] });
    },
    onError: () => setStatus('idle'),
  });

  const save = useMemo(() => {
    return (content: object) => {
      setStatus('saving');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => mutation.mutate(content), 1000);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmapId, nodeId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { save, status };
}
