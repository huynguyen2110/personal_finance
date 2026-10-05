import { api } from '@/modules/mindmap/lib/api';
import { Mindmap, NodeDetail, NodeStatus, TreeNode } from './types';

export const mindmapsApi = {
  /** Bản đồ Phát triển bản thân của người dùng; lần đầu backend tự tạo theo mẫu. */
  primary: () => api.get<Mindmap>('/mindmaps/primary'),
  get: (id: number) => api.get<Mindmap>(`/mindmaps/${id}`),
};

export interface UpdateNodeBody {
  title?: string;
  parentId?: number;
  orderIndex?: number;
  collapsed?: boolean;
  color?: string | null;
  status?: NodeStatus | null;
  pageContent?: object;
}

export const nodesApi = {
  list: (mindmapId: number) =>
    api.get<TreeNode[]>(`/mindmaps/${mindmapId}/nodes`),
  create: (mindmapId: number, body: { parentId: number; title?: string }) =>
    api.post<TreeNode>(`/mindmaps/${mindmapId}/nodes`, body),
  detail: (mindmapId: number, nodeId: number) =>
    api.get<NodeDetail>(`/mindmaps/${mindmapId}/nodes/${nodeId}`),
  update: (mindmapId: number, nodeId: number, body: UpdateNodeBody) =>
    api.patch<TreeNode>(`/mindmaps/${mindmapId}/nodes/${nodeId}`, body),
  remove: (mindmapId: number, nodeId: number) =>
    api.delete<{ success: boolean; deletedCount: number }>(
      `/mindmaps/${mindmapId}/nodes/${nodeId}`,
    ),
};
