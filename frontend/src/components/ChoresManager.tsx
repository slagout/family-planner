import React, { useEffect, useState } from 'react';
import { choresAPI, childrenAPI, Chore, Child } from '../api/familyApi';

export function ChoresManager() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterChildId, setFilterChildId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'weekly' as const,
    rewardPoints: '10',
    childId: '',
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  // Reload chores whenever the child filter changes (empty string = all chores).
  useEffect(() => {
    loadChores(filterChildId || undefined);
  }, [filterChildId]);

  const loadChores = async (childId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await choresAPI.list(childId);
      setChores(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load chores');
      console.error('Load chores error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async () => {
    try {
      const data = await childrenAPI.list();
      setChildren(data);
    } catch (err) {
      console.error('Load children error:', err);
    }
  };

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Chore title is required');
      return;
    }

    const points = parseInt(formData.rewardPoints, 10);
    if (isNaN(points) || points < 0) {
      setError('Reward points must be a valid non-negative number');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const newChore = await choresAPI.create({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        frequency: formData.frequency,
        rewardPoints: points,
        childId: formData.childId || undefined,
        dueDate: formData.dueDate || undefined,
      });

      setChores([newChore, ...chores]);
      setFormData({
        title: '',
        description: '',
        frequency: 'weekly',
        rewardPoints: '10',
        childId: '',
        dueDate: '',
      });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add chore');
      console.error('Add chore error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadgeColor: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    in_progress: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-gray-50 text-gray-700',
  };

  const frequencyLabel: Record<string, string> = {
    daily: '📅 Daily',
    weekly: '📅 Weekly',
    monthly: '📅 Monthly',
    once: '🎯 Once',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">✓ Chores</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? '✕ Cancel' : '➕ Add Chore'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddChore} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Clean your room"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details about the chore"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'once',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="once">Once</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reward Points</label>
                <input
                  type="number"
                  value={formData.rewardPoints}
                  onChange={(e) => setFormData({ ...formData, rewardPoints: e.target.value })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Child</label>
              <select
                value={formData.childId}
                onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Unassigned --</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Creating…' : 'Add Chore'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Child</label>
        <select
          value={filterChildId}
          onChange={(e) => setFilterChildId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">-- All Chores --</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading chores…</div>
      ) : chores.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No chores yet. Click "Add Chore" to get started!</div>
      ) : (
        <div className="space-y-3">
          {chores.map((chore) => (
            <div key={chore.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{chore.title}</h3>
                  {chore.description && <p className="text-sm text-gray-600 mt-1">{chore.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeColor[chore.status]}`}>
                      {chore.status}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {frequencyLabel[chore.frequency]}
                    </span>
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                      ⭐ {chore.rewardPoints} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
