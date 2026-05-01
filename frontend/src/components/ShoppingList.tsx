import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { MealPlanResponse, MissingIngredient } from '../types';

interface ShoppingItem extends MissingIngredient {
  checked: boolean;
}

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualUnit, setManualUnit] = useState('');

  const loadFromPlan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get<{ menu: MealPlanResponse['menu'] }>('/menu/current');
      // Re-fetch the plan missing ingredients
      const planRes = await client.post<MealPlanResponse>('/menu/plan', {
        weekNumber: res.data.menu.weekNumber,
        year: res.data.menu.year,
        createCart: false,
      });
      setItems(planRes.data.missingIngredients.map((i) => ({ ...i, checked: false })));
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No meal plan for this week. Generate one from the Planner first.');
      } else {
        setError(err.response?.data?.error || 'Failed to load shopping list');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFromPlan(); }, [loadFromPlan]);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setItems((prev) => [
      ...prev,
      { name: manualName.trim(), quantity: parseFloat(manualQty) || 1, unit: manualUnit || undefined, checked: false },
    ]);
    setManualName(''); setManualQty(''); setManualUnit('');
  };

  const toggle = (idx: number) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it));

  const clearChecked = () => setItems((prev) => prev.filter((it) => !it.checked));

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Shopping List</h1>
        <div className="flex gap-2">
          <button onClick={loadFromPlan} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            ↺ Refresh
          </button>
          {checked.length > 0 && (
            <button onClick={clearChecked} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">
              Clear {checked.length} done
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* Unchecked items */}
          {unchecked.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
              {unchecked.map((item, i) => {
                const globalIdx = items.indexOf(item);
                return (
                  <label key={i} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                    <input type="checkbox" checked={false} onChange={() => toggle(globalIdx)} className="w-4 h-4 accent-primary-500" />
                    <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{item.quantity} {item.unit || 'pcs'}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Checked items (crossed out) */}
          {checked.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mb-4 opacity-60">
              {checked.map((item, i) => {
                const globalIdx = items.indexOf(item);
                return (
                  <label key={i} className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${i !== 0 ? 'border-t border-gray-200' : ''}`}>
                    <input type="checkbox" checked onChange={() => toggle(globalIdx)} className="w-4 h-4 accent-primary-500" />
                    <span className="flex-1 text-sm line-through text-gray-400">{item.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{item.quantity} {item.unit || 'pcs'}</span>
                  </label>
                );
              })}
            </div>
          )}

          {items.length === 0 && !error && (
            <p className="text-center text-gray-400 py-10 text-sm">Nothing needed — pantry is fully stocked! 🎉</p>
          )}

          {/* Manual add */}
          <form onSubmit={addManual} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Add item</label>
              <input value={manualName} onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Olive oil"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
              <input type="number" min="0" step="0.01" value={manualQty} onChange={(e) => setManualQty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <input value={manualUnit} onChange={(e) => setManualUnit(e.target.value)} placeholder="lbs"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button type="submit" className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm">+ Add</button>
          </form>
        </>
      )}
    </div>
  );
}
