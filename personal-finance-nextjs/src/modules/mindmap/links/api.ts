import { api } from '@/modules/mindmap/lib/api';

export type LinkKind = 'supports' | 'prerequisite' | 'related';

export interface NodeLink {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
  kind: LinkKind;
  note: string | null;
  createdAt: string;
}

export interface LinkKindMeta {
  label: string;
  /** Cách đọc từ phía nhánh nguồn / nhánh đích. */
  outPhrase: string;
  inPhrase: string;
  color: string;
  dash?: string;
  arrow: boolean;
  description: string;
}

export const LINK_KINDS: Record<LinkKind, LinkKindMeta> = {
  supports: {
    label: 'Bổ trợ',
    outPhrase: 'Bổ trợ cho',
    inPhrase: 'Được bổ trợ bởi',
    color: '#2f9e44',
    dash: '6 4',
    arrow: true,
    description: 'Làm nhánh nguồn giúp nhánh đích dễ/nhanh hơn',
  },
  prerequisite: {
    label: 'Điều kiện trước',
    outPhrase: 'Phải xong trước',
    inPhrase: 'Cần xong trước',
    color: '#e8590c',
    arrow: true,
    description: 'Nhánh nguồn phải xong thì mới làm nhánh đích',
  },
  related: {
    label: 'Liên quan',
    outPhrase: 'Liên quan tới',
    inPhrase: 'Liên quan tới',
    color: '#868e96',
    dash: '2 4',
    arrow: false,
    description: 'Nối tự do, kèm ghi chú',
  },
};

export const linksApi = {
  list: (mindmapId: number) =>
    api.get<NodeLink[]>(`/mindmaps/${mindmapId}/links`),
  create: (
    mindmapId: number,
    body: {
      sourceNodeId: number;
      targetNodeId: number;
      kind: LinkKind;
      note?: string | null;
    },
  ) => api.post<NodeLink>(`/mindmaps/${mindmapId}/links`, body),
  update: (
    mindmapId: number,
    linkId: number,
    body: { kind?: LinkKind; note?: string | null },
  ) => api.patch<NodeLink>(`/mindmaps/${mindmapId}/links/${linkId}`, body),
  remove: (mindmapId: number, linkId: number) =>
    api.delete<{ success: boolean }>(`/mindmaps/${mindmapId}/links/${linkId}`),
};
