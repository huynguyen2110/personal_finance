'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { AccountDTO, CategoryDTO } from '@/lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setCategories(await api<CategoryDTO[]>('/api/categories'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);
  return { categories, loading, reload };
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setAccounts(await api<AccountDTO[]>('/api/accounts'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);
  return { accounts, loading, reload };
}
