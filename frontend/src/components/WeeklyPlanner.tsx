import React, { useEffect } from 'react';
import { DayCard } from './DayCard';
import { useMenuPlan } from '../hooks/useMenuPlan';

export function WeeklyPlanner() {
  const { plan, loading, error, generate, loadCurrent } = useMenuPlan();

  useEffect(() => { loadCurrent(); }, [loadCurrent]);

  const krogerConfigured = true; // show button always; backend handles missing config gracefully

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Weekly Meal Planner</h1>
          {plan && (
            <p className="text-sm text-gray-500 mt-0.5">
              Week {plan.menu.weekNumber}, {plan.menu.year}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Generating…' : plan ? '↺ Regenerate' : '✨ Generate Plan'}
          </button>
          {krogerConfigured && (
            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="px-4 py-2 bg-white border border-primary-500 text-primary-600 hover:bg-primary-50 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              🛒 Generate + Kroger Cart
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* 7-day grid */}
      {plan ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
            {plan.menu.days.map((day) => (
              <DayCard key={day.day} dayData={day} />
            ))}
          </div>

          {/* Missing ingredients */}
          {plan.missingIngredients.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">🛒 Missing Ingredients</h2>
              <ul className="divide-y divide-gray-100">
                {plan.missingIngredients.map((item, i) => (
                  <li key={i} className="py-2 flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="text-gray-500 font-mono">
                      {item.quantity.toFixed(2).replace(/\.00$/, '')} {item.unit || 'pcs'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">
              ✅ Your pantry has everything you need for this week!
            </div>
          )}

          {/* Kroger result */}
          {plan.krogerCartId && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm">
              🛒 Kroger cart created! Cart ID: <strong>{plan.krogerCartId}</strong>
              {plan.krogerUnmatchedItems && plan.krogerUnmatchedItems.length > 0 && (
                <p className="mt-1 text-xs text-blue-500">
                  Could not match: {plan.krogerUnmatchedItems.join(', ')}
                </p>
              )}
            </div>
          )}
          {plan.krogerMessage && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-700 text-sm">
              ℹ️ {plan.krogerMessage}
            </div>
          )}
        </>
      ) : !loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-lg">No plan yet — click Generate Plan to get started!</p>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl animate-spin mb-4">⏳</div>
          <p>Building your meal plan…</p>
        </div>
      )}
    </div>
  );
}
