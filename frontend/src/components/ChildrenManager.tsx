import React, { useEffect, useState } from 'react';
import { childrenAPI, Child } from '../api/familyApi';
import { ParentalPinModal, getStoredPinToken } from './ParentalPinModal';

export function ChildrenManager() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    allergies: '',
    dietaryRestrictions: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<typeof formData | null>(null);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await childrenAPI.list();
      setChildren(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load children');
      console.error('Load children error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Child name is required');
      return;
    }

    const token = getStoredPinToken();
    if (!token) {
      setPendingSubmit(formData);
      setShowPin(true);
      return;
    }

    await submitChild(formData, token);
  };

  const submitChild = async (data: typeof formData, token: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const newChild = await childrenAPI.create(
        {
          name: data.name.trim(),
          dateOfBirth: data.dateOfBirth || undefined,
          allergies: data.allergies ? data.allergies.split(',').map((a) => a.trim()) : undefined,
          dietaryRestrictions: data.dietaryRestrictions
            ? data.dietaryRestrictions.split(',').map((d) => d.trim())
            : undefined,
        },
        token,
      );
      setChildren((prev) => [...prev, newChild]);
      setFormData({ name: '', dateOfBirth: '', allergies: '', dietaryRestrictions: '' });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add child');
      console.error('Add child error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinUnlocked = async (token: string) => {
    setShowPin(false);
    if (pendingSubmit) {
      await submitChild(pendingSubmit, token);
      setPendingSubmit(null);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-400 rounded-lg bg-white dark:bg-white text-gray-900 dark:text-gray-900 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-800 mb-1';

  return (
    <div className="bg-white dark:bg-gray-200 rounded-xl shadow-sm border border-gray-100 dark:border-gray-300 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-900">👶 Children</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? '✕ Cancel' : '➕ Add Child'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAddChild}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-100 rounded-lg border border-gray-200 dark:border-gray-300"
        >
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Child's name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Allergies (comma-separated)</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g., peanuts, dairy"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Dietary Restrictions (comma-separated)</label>
              <input
                type="text"
                value={formData.dietaryRestrictions}
                onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                placeholder="e.g., vegetarian, gluten-free"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Creating…' : 'Add Child'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-600">Loading children…</div>
      ) : children.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-600">
          No children yet. Click "Add Child" to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="p-4 border border-gray-200 dark:border-gray-300 bg-white dark:bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-900">{child.name}</h3>
              {child.age !== null && (
                <p className="text-sm text-gray-500 dark:text-gray-600">Age: {child.age}</p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-700 mt-2">⭐ {child.currentStars} stars</p>
              <p className="text-sm text-gray-600 dark:text-gray-700">📋 {child.assignedChores} chores</p>
            </div>
          ))}
        </div>
      )}

      {showPin && (
        <ParentalPinModal
          onUnlocked={handlePinUnlocked}
          onCancel={() => {
            setShowPin(false);
            setPendingSubmit(null);
          }}
        />
      )}
    </div>
  );
}
