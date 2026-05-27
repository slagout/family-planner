import React, { useEffect, useState } from 'react';
import { choresAPI, childrenAPI, Chore, Child } from '../api/familyApi';
import { ParentalPinModal, getStoredPinToken } from './ParentalPinModal';

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
    assignedToGroup: false,
    groupChildIds: [] as string[],
    splitType: 'equal' as 'equal' | 'weighted',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<typeof formData | null>(null);

  useEffect(() => {
    loadChores();
    loadChildren();
  }, []);

  useEffect(() => {
    if (filterChildId) {
      loadChores(filterChildId);
    }
  }, [filterChildId]);

  const loadChores = async (childId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await choresAPI.list(childId);
      setChores(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load chores');
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
    if (!formData.title.trim()) { setError('Chore title is required'); return; }
    const points = parseInt(formData.rewardPoints, 10);
    if (isNaN(points) || points < 0) { setError('Reward points must be a valid non-negative number'); return; }
    if (formData.assignedToGroup && formData.groupChildIds.length < 2) {
      setError('Group chores require at least 2 children'); return;
    }

    // Require PIN for creating chores
    if (!getStoredPinToken()) {
      setPendingSubmit(formData);
      setShowPin(true);
      return;
    }

    await submitChore(formData, getStoredPinToken()!);
  };

  const submitChore = async (data: typeof formData, _token: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const newChore = await choresAPI.create({
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        frequency: data.frequency,
        rewardPoints: parseInt(data.rewardPoints, 10),
        childId: data.assignedToGroup ? undefined : (data.childId || undefined),
        dueDate: data.dueDate || undefined,
        assignedToGroup: data.assignedToGroup,
        splitType: data.splitType,
        groupChildIds: data.assignedToGroup ? data.groupChildIds : undefined,
      });
      setChores([newChore, ...chores]);
      setFormData({ title: '', description: '', frequency: 'weekly', rewardPoints: '10', childId: '', dueDate: '', assignedToGroup: false, groupChildIds: [], splitType: 'equal' });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add chore');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinUnlocked = async (_token: string) => {
    setShowPin(false);
    if (pendingSubmit) {
      await submitChore(pendingSubmit, _token);
      setPendingSubmit(null);
    }
  };

  const toggleGroupChild = (childId: string) => {
    setFormData(prev => ({
      ...prev,
      groupChildIds: prev.groupChildIds.includes(childId)
        ? prev.groupChildIds.filter(id => id !== childId)
        : [...prev.groupChildIds, childId],
    }));
  };

  const statusBadgeColor: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    in_progress: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-gray-50 text-gray-700',
  };

  const frequencyLabel: Record<string, string> = {
    daily: '📅 Daily', weekly: '📅 Weekly', monthly: '📅 Monthly', once: '🎯 Once',
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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleAddChore} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-4">
            {/* Title */}
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

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Frequency & Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as typeof formData.frequency })}
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

            {/* Group toggle */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.assignedToGroup}
                  onChange={(e) => setFormData({ ...formData, assignedToGroup: e.target.checked, childId: '', groupChildIds: [] })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-400 rounded-full peer peer-checked:bg-primary-500 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </label>
              <span className="text-sm font-medium text-gray-700">
                Assign to Multiple Children
              </span>
              {formData.assignedToGroup && (
                <span className="text-xs text-gray-500 ml-1" title="Points will be split equally when all assigned children complete this task.">
                  ℹ️ Points split equally on collaborative completion
                </span>
              )}
            </div>

            {/* Single child or group child selection */}
            {!formData.assignedToGroup ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Child</label>
                <select
                  value={formData.childId}
                  onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Unassigned --</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Children (min 2)
                </label>
                <div className="space-y-2">
                  {children.map((child) => (
                    <label key={child.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.groupChildIds.includes(child.id)}
                        onChange={() => toggleGroupChild(child.id)}
                        className="w-4 h-4 text-primary-500 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{child.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Points will be split equally when all assigned children complete this task.
                </p>
              </div>
            )}

            {/* Due Date */}
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
            <option key={child.id} value={child.id}>{child.name}</option>
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
                    {chore.assignedToGroup && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                        👥 Group ({chore.splitType} split)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPin && (
        <ParentalPinModal
          onUnlocked={handlePinUnlocked}
          onCancel={() => { setShowPin(false); setPendingSubmit(null); }}
        />
      )}
    </div>
  );
}

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
    loadChores();
    loadChildren();
  }, []);

  useEffect(() => {
    if (filterChildId) {
      loadChores(filterChildId);
    }
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
