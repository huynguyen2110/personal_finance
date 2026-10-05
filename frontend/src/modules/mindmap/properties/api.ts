import { api } from '@/modules/mindmap/lib/api';

export type PropertyType = 'text' | 'number' | 'boolean' | 'date' | 'select';

/** Ý nghĩa của thuộc tính trong view Kế hoạch. */
export type PropertyRole = 'priority' | 'difficulty' | 'time' | 'cost';
export type PropertyUnit = 'money' | 'hours';

export const ROLE_LABELS: Record<PropertyRole, string> = {
  priority: 'Ưu tiên',
  difficulty: 'Độ khó',
  time: 'Thời gian',
  cost: 'Chi phí',
};
/** Kiểu dữ liệu mà mỗi role chấp nhận (khớp backend). */
export const ROLE_TYPE: Record<PropertyRole, PropertyType> = {
  priority: 'select',
  difficulty: 'select',
  time: 'number',
  cost: 'number',
};
export const UNIT_LABELS: Record<PropertyUnit, string> = {
  money: 'Tiền (₫)',
  hours: 'Giờ',
};

export interface SelectOption {
  id: string;
  label: string;
  color: string;
  /** Mức 0–10 để chấm điểm kế hoạch; trống = theo thứ tự. */
  weight?: number;
}

export interface PropertyDefinition {
  id: number;
  mindmapId: number;
  name: string;
  type: PropertyType;
  options: SelectOption[] | null;
  role: PropertyRole | null;
  unit: PropertyUnit | null;
  orderIndex: number;
}

export interface CreatePropertyBody {
  name: string;
  type: PropertyType;
  options?: SelectOption[];
  role?: PropertyRole | null;
  unit?: PropertyUnit | null;
}

export interface UpdatePropertyBody {
  name?: string;
  options?: SelectOption[];
  orderIndex?: number;
  role?: PropertyRole | null;
  unit?: PropertyUnit | null;
}

export interface PropertyValue {
  propertyDefinitionId: number;
  value: unknown;
}

export const propertiesApi = {
  list: (mindmapId: number) =>
    api.get<PropertyDefinition[]>(`/mindmaps/${mindmapId}/properties`),
  create: (mindmapId: number, body: CreatePropertyBody) => api.post<PropertyDefinition>(`/mindmaps/${mindmapId}/properties`, body),
  update: (
    mindmapId: number,
    propId: number,
    body: UpdatePropertyBody,
  ) =>
    api.patch<PropertyDefinition>(
      `/mindmaps/${mindmapId}/properties/${propId}`,
      body,
    ),
  remove: (mindmapId: number, propId: number) =>
    api.delete<{ success: boolean }>(
      `/mindmaps/${mindmapId}/properties/${propId}`,
    ),
  setNodeValues: (
    mindmapId: number,
    nodeId: number,
    values: Record<number, unknown>,
  ) =>
    api.put<PropertyValue[]>(
      `/mindmaps/${mindmapId}/nodes/${nodeId}/properties`,
      { values },
    ),
};
