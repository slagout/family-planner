import React, { useState } from 'react';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlanResponse {
  menuId: number;
  week: number;
  year: number;
  plan: { day: number; recipeId: number }[];
  missing: { name: string; quantity: number; unit: string }[];
  krogerCart?: { cartId: string; itemsAdded: any[] };
}

const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// ---------------------------------------------------------------------------
// Component: WeeklyPlanner
// ---------------------------------------------------------------------------
export const WeeklyPlanner: React.FC = () => {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (createCart: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post<PlanResponse>('/api/menu/plan', null, {
        params: { createCart },
      });
      setPlan(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="Weekly Menu Planner">
      <h2>Weekly Menu Planner</h2>

      {plan ? (
        <>
          <h3>
            Week {plan.week}, {plan.year}
          </h3>
          <ul>
            {plan.plan.map((p) => (
              <li key={p.day}>
                <strong>{DAY_LABELS[p.day - 1]}:</strong> Recipe #{p.recipeId}
              </li>
            ))}
          </ul>

          {plan.missing.length > 0 && (
            <>
              <h4>Missing Ingredients</h4>
              <ul>
                {plan.missing.map((item, idx) => (
                  <li key={idx}>
                    {item.name} &ndash; {item.quantity} {item.unit}
                  </li>
                ))}
              </ul>
            </>
          )}

          {plan.krogerCart && (
            <p>
              Kroger cart created! Cart ID:{' '}
              <strong>{plan.krogerCart.cartId}</strong> &mdash;{' '}
              {plan.krogerCart.itemsAdded.length} item(s) added.
            </p>
          )}
        </>
      ) : (
        <p>No plan generated yet.</p>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => generate(false)} disabled={loading}>
          Generate Plan
        </button>
        <button onClick={() => generate(true)} disabled={loading}>
          Generate + Create Kroger Cart
        </button>
      </div>

      {loading && <p>Working…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </section>
  );
};
