'use client';

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { todosApi, UpdateTodoBody } from './api';

/** Todos touch node badges: refresh every canvas + node-todo cache too. */
function useInvalidateTodoRelated() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['todos'] });
    qc.invalidateQueries({ queryKey: ['node-todos'] });
    qc.invalidateQueries({ queryKey: ['nodes'] });
    qc.invalidateQueries({ queryKey: ['weekly-stats'] });
    qc.invalidateQueries({ queryKey: ['plan'] });
    qc.invalidateQueries({ queryKey: ['todo-streak'] });
  };
}

export function useTodos(dateKey: string) {
  return useQuery({
    queryKey: ['todos', dateKey],
    queryFn: () => todosApi.listByDate(dateKey),
  });
}

/** Todo của nhiều ngày (chế độ xem theo tuần); dùng chung cache với useTodos. */
export function useTodosOfDays(dateKeys: string[]) {
  return useQueries({
    queries: dateKeys.map((dateKey) => ({
      queryKey: ['todos', dateKey],
      queryFn: () => todosApi.listByDate(dateKey),
    })),
    combine: (results) => ({
      byDate: dateKeys.map((dateKey, i) => ({
        dateKey,
        todos: results[i].data ?? [],
      })),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}

export function useStreak() {
  return useQuery({ queryKey: ['todo-streak'], queryFn: todosApi.streak });
}

export function useNodeTodos(nodeId: number) {
  return useQuery({
    queryKey: ['node-todos', nodeId],
    queryFn: () => todosApi.listByNode(nodeId),
    enabled: Number.isFinite(nodeId),
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
    mutationFn: ({ id, ...body }: UpdateTodoBody & { id: number }) =>
      todosApi.update(id, body),
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
