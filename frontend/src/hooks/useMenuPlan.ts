import { useState, useCallback } from 'react';
import client from '../api/client';
import { MealPlanResponse } from '../types';

export function useMenuPlan() {
  const [plan, setPlan] = useState<MealPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (createCart = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.post<MealPlanResponse>('/menu/plan', { createCart });
      setPlan(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get<{ menu: MealPlanResponse['menu'] }>('/menu/current');
      setPlan({ menu: res.data.menu, missingIngredients: [] });
    } catch (e: any) {
      if (e.response?.status !== 404) {
        setError(e.response?.data?.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { plan, loading, error, generate, loadCurrent };
}
