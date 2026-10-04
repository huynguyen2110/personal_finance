import { api } from '@/modules/mindmap/lib/api';

export interface TodoNodeRef {
  id: number;
  title: string;
  mindmapId: number;
  mindmapTitle: string;
}

export interface Todo {
  id: number;
  title: string;
  date: string;
  completed: boolean;
  completedAt: string | null;
  /** Số phút đã bỏ ra. */
  durationMinutes: number | null;
  /** Mức hiệu quả tự chấm 1–5. */
  effectiveness: number | null;
  orderIndex: number;
  nodes: TodoNodeRef[];
}

export interface NodeOption {
  id: number;
  title: string;
  isRoot: boolean;
  mindmapId: number;
  mindmapTitle: string;
}

export interface UpdateTodoBody {
  title?: string;
  date?: string;
  completed?: boolean;
  nodeIds?: number[];
  durationMinutes?: number | null;
  effectiveness?: number | null;
}

export const todosApi = {
  listByDate: (date: string) => api.get<Todo[]>('/todos', { params: { date } }),
  listByNode: (nodeId: number) => api.get<Todo[]>(`/todos/by-node/${nodeId}`),
  nodeOptions: () => api.get<NodeOption[]>('/todos/node-options'),
  create: (body: { title: string; date: string; nodeIds?: number[] }) =>
    api.post<Todo>('/todos', body),
  update: (id: number, body: UpdateTodoBody) =>
    api.patch<Todo>(`/todos/${id}`, body),
  remove: (id: number) => api.delete<{ success: boolean }>(`/todos/${id}`),
};
