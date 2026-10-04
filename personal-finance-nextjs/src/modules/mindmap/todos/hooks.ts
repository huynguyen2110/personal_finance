'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { todosApi } from './api';

/** Todos touch node badges: refresh every canvas + node-todo cache too. */
function useInvalidateTodoRelated() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['todos'] });
    qc.invalidateQueries({ queryKey: ['node-todos'] });
    qc.invalidateQueries({ queryKey: ['nodes'] });
  };
}

export function useTodos(dateKey: string) {
  return useQuery({
    queryKey: ['todos', dateKey],
    queryFn: () => todosApi.listByDate(dateKey),
  });
}

export function useNodeTodos(nodeId: number) {
  return useQuery({
    queryKey: ['node-todos', nodeId],
    queryFn: () => todosApi.listByNode(nodeId),
    enabled: Number.isFinite(nodeId),
  });
}

export function useNodeOptions(enabled: boolean) {
  return useQuery({
    queryKey: ['node-options'],
    queryFn: todosApi.nodeOptions,
    enabled,
  });
}

export function useCreateTodo() {
  const invalidate = useInvalidateTodoRelated();
  return useMutation({
    mutationFn: todosApi.create,
    onSuccess: invalidate,
  });
}

export function useUpdateTodo() {
  const invalidate = useInvalidateTodoRelated();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      title?: string;
      date?: string;
      completed?: boolean;
      nodeIds?: number[];
    }) => todosApi.update(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteTodo() {
  const invalidate = useInvalidateTodoRelated();
  return useMutation({
    mutationFn: todosApi.remove,
    onSuccess: invalidate,
  });
}
