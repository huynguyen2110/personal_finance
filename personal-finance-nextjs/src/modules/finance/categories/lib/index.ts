import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CategoryDTO, CategoryGroupDTO, CategoryGroupInput, CategoryInput } from '../types';

const BASE_URL = '/api/categories';
const GROUPS_URL = '/api/category-groups';

export const CATEGORY_QUERY_KEYS = { LIST: ['categories'] as const, GROUPS: ['category-groups'] as const };

export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.LIST,
    queryFn: () => apiClient<CategoryDTO[]>({ url: BASE_URL }),
  });
}

export const createCategory = (payload: CategoryInput) => apiClient<CategoryDTO>({ method: 'post', url: BASE_URL, payload });
export const updateCategory = (id: number, payload: Partial<CategoryInput>) =>
  apiClient({ method: 'patch', url: `${BASE_URL}/${id}`, payload });
export const deleteCategory = (id: number) => apiClient({ method: 'delete', url: `${BASE_URL}/${id}` });

// Nhóm chi tiêu / thu nhập (tầng trên danh mục cha)
export function useCategoryGroups() {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.GROUPS,
    queryFn: () => apiClient<CategoryGroupDTO[]>({ url: GROUPS_URL }),
  });
}

export const createCategoryGroup = (payload: CategoryGroupInput) =>
  apiClient<CategoryGroupDTO>({ method: 'post', url: GROUPS_URL, payload });
export const updateCategoryGroup = (id: number, payload: CategoryGroupInput) =>
  apiClient<CategoryGroupDTO>({ method: 'patch', url: `${GROUPS_URL}/${id}`, payload });
export const deleteCategoryGroup = (id: number) => apiClient({ method: 'delete', url: `${GROUPS_URL}/${id}` });
