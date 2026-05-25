import React, { useEffect, useState } from 'react';
import { childrenAPI, Child } from '../api/familyApi';

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

    setIsSubmitting(true);
    setError(null);
    try {
      const newChild = await childrenAPI.create({
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth || undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map((a) => a.trim()) : undefined,
        dietaryRestrictions: formData.dietaryRestrictions
          ? formData.dietaryRestrictions.split(',').map((d) => d.trim())
          : undefined,
      });

      setChildren([...children, newChild]);
      setFormData({
        name: '',
        dateOfBirth: '',
        allergies: '',
        dietaryRestrictions: '',
      });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add child');
      console.error('Add child error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">👶 Children</h2>
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
        <form onSubmit={handleAddChild} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Child's name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (comma-separated)</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g., peanuts, dairy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dietary Restrictions (comma-separated)
              </label>
              <input
                type="text"
                value={formData.dietaryRestrictions}
                onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                placeholder="e.g., vegetarian, gluten-free"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
        <div className="text-center py-8 text-gray-500">Loading children…</div>
      ) : children.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No children yet. Click "Add Child" to get started!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <div key={child.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-800">{child.name}</h3>
              {child.age !== null && <p className="text-sm text-gray-500">Age: {child.age}</p>}
              <p className="text-sm text-gray-600 mt-2">⭐ {child.currentStars} stars</p>
              <p className="text-sm text-gray-600">📋 {child.assignedChores} chores</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
