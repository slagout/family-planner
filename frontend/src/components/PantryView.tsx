import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { PantryItem } from '../types';

export function PantryView() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', quantity: '', unit: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState('');
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get<PantryItem[]>('/pantry');
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/pantry', {
        name: form.name,
        quantity: parseFloat(form.quantity),
        unit: form.unit || undefined,
      });
      setForm({ name: '', quantity: '', unit: '' });
      setShowForm(false);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add item');
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const item = items.find((i) => i.id === id)!;
      await client.put(`/pantry/${id}`, { quantity: parseFloat(editQty), unit: item.unit });
      setEditId(null);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this pantry item?')) return;
    await client.delete(`/pantry/${id}`);
    fetchItems();
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Pantry</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium"
        >
          + Add Item
        </button>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Item name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Chicken breast" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
            <input required type="number" min="0" step="0.01" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="lbs" />
          </div>
          <button type="submit" className="px-4 py-1.5 bg-primary-500 text-white rounded-lg text-sm">Save</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
        </form>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter pantry…"
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">
          {items.length === 0 ? 'Your pantry is empty — add some items!' : 'No items match your search.'}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.map((item, idx) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx !== 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="flex-1 text-sm font-medium text-gray-800">{item.name}</span>
              {editId === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-gray-500">{item.unit || 'pcs'}</span>
                  <button onClick={() => handleUpdate(item.id)} className="text-xs text-green-600 hover:underline">Save</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                </div>
              ) : (
                <span className="text-sm text-gray-600 font-mono w-24 text-right">
                  {item.quantity} {item.unit || 'pcs'}
                </span>
              )}
              <button
                onClick={() => { setEditId(item.id); setEditQty(String(item.quantity)); }}
                className="text-xs text-blue-500 hover:underline"
              >Edit</button>
              <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:underline">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
