import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CategoryDTO, CategoryInput } from '../types';

const BASE_URL = '/api/categories';

export const CATEGORY_QUERY_KEYS = { LIST: ['categories'] as const };

export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.LIST,
    queryFn: () => apiClient<CategoryDTO[]>({ url: BASE_URL }),
  });
}

export const createCategory = (payload: CategoryInput) => apiClient({ method: 'post', url: BASE_URL, payload });
export const updateCategory = (id: number, payload: Partial<CategoryInput>) =>
  apiClient({ method: 'patch', url: `${BASE_URL}/${id}`, payload });
export const deleteCategory = (id: number) => apiClient({ method: 'delete', url: `${BASE_URL}/${id}` });
