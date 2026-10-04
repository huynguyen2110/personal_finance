import { api } from '@/modules/mindmap/lib/api';
import { Mindmap, NodeDetail, NodeStatus, TreeNode } from './types';

/** Mẫu tạo sẵn thuộc tính khi tạo mindmap (khớp backend utils/templates.ts). */
export type MindmapTemplateId = 'growth';

export const mindmapsApi = {
  list: () => api.get<Mindmap[]>('/mindmaps'),
  create: (body: {
    title: string;
    description?: string;
    template?: MindmapTemplateId;
  }) =>
    api.post<Mindmap>('/mindmaps', body),
  get: (id: number) => api.get<Mindmap>(`/mindmaps/${id}`),
  update: (id: number, body: { title?: string; description?: string }) =>
    api.patch<Mindmap>(`/mindmaps/${id}`, body),
  remove: (id: number) => api.delete<{ success: boolean }>(`/mindmaps/${id}`),
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
