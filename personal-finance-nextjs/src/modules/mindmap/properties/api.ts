import { api } from '@/modules/mindmap/lib/api';

export type PropertyType = 'text' | 'number' | 'boolean' | 'date' | 'select';

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface PropertyDefinition {
  id: number;
  mindmapId: number;
  name: string;
  type: PropertyType;
  options: SelectOption[] | null;
  orderIndex: number;
}

export interface PropertyValue {
  propertyDefinitionId: number;
  value: unknown;
}

export const propertiesApi = {
  list: (mindmapId: number) =>
    api.get<PropertyDefinition[]>(`/mindmaps/${mindmapId}/properties`),
  create: (
    mindmapId: number,
    body: { name: string; type: PropertyType; options?: SelectOption[] },
  ) => api.post<PropertyDefinition>(`/mindmaps/${mindmapId}/properties`, body),
  update: (
    mindmapId: number,
    propId: number,
    body: { name?: string; options?: SelectOption[]; orderIndex?: number },
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
