// Mẫu mindmap: bộ thuộc tính tạo sẵn khi tạo mindmap mới.
// Quy ước: nhánh cấp 1 = lĩnh vực, nhánh cấp ≥2 = hành động.

type TemplateProperty =
  | {
      name: string;
      type: 'select';
      role: 'priority' | 'difficulty';
      options: { id: string; label: string; color: string; weight: number }[];
    }
  | { name: string; type: 'number'; role: 'time' | 'cost'; unit: 'hours' | 'money' };

export interface MindmapTemplate {
  label: string;
  properties: TemplateProperty[];
}

export const MINDMAP_TEMPLATES = {
  growth: {
    label: 'Phát triển bản thân',
    properties: [
      {
        name: 'Ưu tiên',
        type: 'select',
        role: 'priority',
        options: [
          { id: 'high', label: 'Cao', color: '#e03131', weight: 3 },
          { id: 'medium', label: 'Trung bình', color: '#f08c00', weight: 2 },
          { id: 'low', label: 'Thấp', color: '#868e96', weight: 1 },
        ],
      },
      {
        name: 'Độ khó',
        type: 'select',
        role: 'difficulty',
        options: [
          { id: 'easy', label: 'Dễ', color: '#2f9e44', weight: 1 },
          { id: 'medium', label: 'Vừa', color: '#1971c2', weight: 2 },
          { id: 'hard', label: 'Khó', color: '#9c36b5', weight: 3 },
        ],
      },
      { name: 'Thời gian', type: 'number', role: 'time', unit: 'hours' },
      { name: 'Chi phí', type: 'number', role: 'cost', unit: 'money' },
    ],
  },
} satisfies Record<string, MindmapTemplate>;

export type MindmapTemplateId = keyof typeof MINDMAP_TEMPLATES;
