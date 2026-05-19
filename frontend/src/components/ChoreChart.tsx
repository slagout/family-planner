import React, { useState, useEffect } from 'react';
import client from '../api/client';

interface Child {
  id: string;
  name: string;
  is_active: boolean;
  total_points?: number;
  completion_count?: number;
}

interface Chore {
  id: string;
  title: string;
  description?: string;
  child_id?: string;
  child_name?: string;
  frequency: string;
  reward_points: number;
  due_date?: string;
  status: string;
}

interface Reward {
  id: string;
  title: string;
  description?: string;
  point_cost: number;
  is_active: boolean;
}

const FREQ_LABELS: Record<string, string> = {
  daily: '📅 Daily', weekly: '📆 Weekly', monthly: '🗓 Monthly', once: '1️⃣ Once',
};

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  completed:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled:   'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
};

/** Shared input/select/textarea class — light + dark */
const fc = [
  'w-full border rounded-lg px-3 py-2 text-sm',
  'border-neutral-300 bg-white text-neutral-900',
  'dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100',
  'focus:ring-2 focus:ring-green-400 focus:outline-none',
  'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
].join(' ');

/** Shared label class */
const lc = 'block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1';

/** Shared modal wrapper */
const modalOuter = 'fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4';
const modalInner = [
  'bg-white dark:bg-neutral-800',
  'rounded-2xl shadow-2xl w-full',
  'ring-1 ring-neutral-200 dark:ring-neutral-700',
].join(' ');
const modalHeader = [
  'flex items-center justify-between px-5 py-4',
  'border-b border-neutral-200 dark:border-neutral-700',
  'sticky top-0 bg-white dark:bg-neutral-800 z-10',
].join(' ');
const modalTitle = 'text-lg font-semibold text-neutral-900 dark:text-neutral-100';
const modalClose = 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-2xl leading-none';

export function ChoreChart() {
  const [children, setChildren] = useState<Child[]>([]);
  const [chores, setChores]     = useState<Chore[]>([]);
  const [rewards, setRewards]   = useState<Reward[]>([]);
  const [filterChild, setFilterChild] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [tab, setTab] = useState<'chores' | 'rewards' | 'children'>('chores');

  const [choreForm, setChoreForm]   = useState<Partial<Chore>>({});
  const [rewardForm, setRewardForm] = useState<Partial<Reward & { point_cost: number }>>({});
  const [childForm, setChildForm]   = useState<Partial<Child>>({});
  const [showChoreForm, setShowChoreForm]   = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showChildForm, setShowChildForm]   = useState(false);
  const [completeModal, setCompleteModal] = useState<{ choreId: string; childId: string } | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [{ data: ch }, { data: cr }, { data: rw }] = await Promise.all([
        client.get<Child[]>('/chores/children'),
        client.get<Chore[]>('/chores'),
        client.get<Reward[]>('/chores/rewards'),
      ]);
      const enriched = await Promise.all(
        ch.map(async child => {
          try {
            const { data: pts } = await client.get<{ total_points: number; completion_count: number }>(`/chores/children/${child.id}/points`);
            return { ...child, ...pts };
          } catch { return child; }
        })
      );
      setChildren(enriched);
      setChores(cr);
      setRewards(rw);
    } catch (e) { console.error(e); }
  }

  async function saveChore(e: React.FormEvent) {
    e.preventDefault();
    try {
      await client.post('/chores', choreForm);
      setShowChoreForm(false); setChoreForm({}); loadAll();
    } catch (err) { console.error(err); }
  }

  async function deleteChore(id: string) {
    if (!confirm('Cancel this chore?')) return;
    await client.delete(`/chores/${id}`);
    loadAll();
  }

  async function handleComplete() {
    if (!completeModal) return;
    try {
      await client.post(`/chores/${completeModal.choreId}/complete`, { child_id: completeModal.childId });
      setCompleteModal(null); loadAll();
    } catch (err) { console.error(err); }
  }

  async function saveReward(e: React.FormEvent) {
    e.preventDefault();
    try {
      await client.post('/chores/rewards', rewardForm);
      setShowRewardForm(false); setRewardForm({}); loadAll();
    } catch (err) { console.error(err); }
  }

  async function saveChild(e: React.FormEvent) {
    e.preventDefault();
    try {
      await client.post('/chores/children', childForm);
      setShowChildForm(false); setChildForm({}); loadAll();
    } catch (err) { console.error(err); }
  }

  const filteredChores = chores.filter(c => {
    if (filterChild  && c.child_id !== filterChild)  return false;
    if (filterStatus && c.status   !== filterStatus) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">🌟 Chore Chart</h1>

      {/* Children points summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {children.map(child => (
          <div key={child.id}
            className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-orange-100 dark:border-orange-800/40 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">⭐</div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{child.name}</div>
            <div className="text-xl font-bold text-orange-500">{child.total_points ?? 0}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">points</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 mb-6">
        {(['chores', 'rewards', 'children'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-white dark:bg-neutral-700 shadow text-green-700 dark:text-green-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}>
            {t === 'chores' ? '📋 Chores' : t === 'rewards' ? '🎁 Rewards' : '👧 Children'}
          </button>
        ))}
      </div>

      {/* ── Chores tab ── */}
      {tab === 'chores' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={filterChild} onChange={e => setFilterChild(e.target.value)}
              className={fc + ' w-auto'}>
              <option value="">All children</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className={fc + ' w-auto'}>
              <option value="">All statuses</option>
              {['pending','in_progress','completed','cancelled'].map(s => (
                <option key={s} value={s}>{s.replace('_',' ')}</option>
              ))}
            </select>
            <button onClick={() => setShowChoreForm(true)}
              className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">+ Add Chore</button>
          </div>

          <div className="space-y-2">
            {filteredChores.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
                <p className="text-4xl mb-2">📋</p><p>No chores found</p>
              </div>
            ) : filteredChores.map(chore => (
              <div key={chore.id}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{chore.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[chore.status]}`}>
                        {chore.status.replace('_',' ')}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{FREQ_LABELS[chore.frequency]}</span>
                      {chore.reward_points > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⭐ {chore.reward_points} pts</span>
                      )}
                    </div>
                    {chore.child_name && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">👤 {chore.child_name}</p>}
                    {chore.description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{chore.description}</p>}
                    {chore.due_date && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        Due: {new Date(chore.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {chore.status === 'pending' && (
                      <button
                        onClick={() => setCompleteModal({ choreId: chore.id, childId: chore.child_id || '' })}
                        className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/60">
                        ✓ Done
                      </button>
                    )}
                    <button onClick={() => deleteChore(chore.id)}
                      className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rewards tab ── */}
      {tab === 'rewards' && (
        <div>
          <button onClick={() => setShowRewardForm(true)}
            className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">+ Add Reward</button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map(r => (
              <div key={r.id}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">🎁 {r.title}</p>
                    {r.description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{r.description}</p>}
                  </div>
                  <span className="text-lg font-bold text-amber-500 dark:text-amber-400">⭐{r.point_cost}</span>
                </div>
              </div>
            ))}
            {rewards.length === 0 && (
              <div className="col-span-2 text-center py-12 text-neutral-400 dark:text-neutral-500">
                <p className="text-4xl mb-2">🎁</p><p>No rewards yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Children tab ── */}
      {tab === 'children' && (
        <div>
          <button onClick={() => setShowChildForm(true)}
            className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">+ Add Child</button>
          <div className="space-y-3">
            {children.map(c => (
              <div key={c.id}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center text-xl">👧</div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{c.name}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{c.completion_count ?? 0} chores completed · {c.total_points ?? 0} points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Complete chore modal ── */}
      {completeModal && (
        <div className={modalOuter}>
          <div className={`${modalInner} max-w-sm`}>
            <div className={modalHeader}>
              <h3 className={modalTitle}>Mark chore complete</h3>
              <button onClick={() => setCompleteModal(null)} className={modalClose}>&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={lc}>Which child completed this?</label>
                <select
                  value={completeModal.childId}
                  onChange={e => setCompleteModal(m => m ? { ...m, childId: e.target.value } : m)}
                  className={fc}>
                  <option value="">Select child…</option>
                  {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCompleteModal(null)}
                  className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  Cancel
                </button>
                <button onClick={handleComplete} disabled={!completeModal.childId}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  Confirm ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Chore modal ── */}
      {showChoreForm && (
        <div className={modalOuter}>
          <div className={`${modalInner} max-w-md max-h-[90vh] overflow-y-auto`}>
            <div className={modalHeader}>
              <h2 className={modalTitle}>Add Chore</h2>
              <button onClick={() => setShowChoreForm(false)} className={modalClose}>&times;</button>
            </div>
            <form onSubmit={saveChore} className="p-5 space-y-4">
              <div>
                <label className={lc}>Title *</label>
                <input required value={choreForm.title||''} onChange={e=>setChoreForm(f=>({...f,title:e.target.value}))}
                  className={fc} placeholder="Clean your room" />
              </div>
              <div>
                <label className={lc}>Assign to</label>
                <select value={choreForm.child_id||''} onChange={e=>setChoreForm(f=>({...f,child_id:e.target.value}))} className={fc}>
                  <option value="">Any child</option>
                  {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Frequency</label>
                  <select value={choreForm.frequency||'once'} onChange={e=>setChoreForm(f=>({...f,frequency:e.target.value}))} className={fc}>
                    {['once','daily','weekly','monthly'].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lc}>Points</label>
                  <input type="number" min={0} value={choreForm.reward_points||0}
                    onChange={e=>setChoreForm(f=>({...f,reward_points:+e.target.value}))} className={fc} />
                </div>
              </div>
              <div>
                <label className={lc}>Due Date</label>
                <input type="date" value={(choreForm.due_date as string)||''}
                  onChange={e=>setChoreForm(f=>({...f,due_date:e.target.value}))} className={fc} />
              </div>
              <div>
                <label className={lc}>Description</label>
                <textarea value={choreForm.description||''}
                  onChange={e=>setChoreForm(f=>({...f,description:e.target.value}))} className={fc} rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowChoreForm(false)}
                  className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                  Add Chore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Reward modal ── */}
      {showRewardForm && (
        <div className={modalOuter}>
          <div className={`${modalInner} max-w-sm`}>
            <div className={modalHeader}>
              <h2 className={modalTitle}>Add Reward</h2>
              <button onClick={() => setShowRewardForm(false)} className={modalClose}>&times;</button>
            </div>
            <form onSubmit={saveReward} className="p-5 space-y-4">
              <div>
                <label className={lc}>Title *</label>
                <input required value={rewardForm.title||''}
                  onChange={e=>setRewardForm(f=>({...f,title:e.target.value}))} className={fc} placeholder="Movie night" />
              </div>
              <div>
                <label className={lc}>Points Cost *</label>
                <input required type="number" min={1} value={rewardForm.point_cost||''}
                  onChange={e=>setRewardForm(f=>({...f,point_cost:+e.target.value}))} className={fc} />
              </div>
              <div>
                <label className={lc}>Description</label>
                <textarea value={rewardForm.description||''}
                  onChange={e=>setRewardForm(f=>({...f,description:e.target.value}))} className={fc} rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRewardForm(false)}
                  className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                  Add Reward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Child modal ── */}
      {showChildForm && (
        <div className={modalOuter}>
          <div className={`${modalInner} max-w-sm`}>
            <div className={modalHeader}>
              <h2 className={modalTitle}>Add Child</h2>
              <button onClick={() => setShowChildForm(false)} className={modalClose}>&times;</button>
            </div>
            <form onSubmit={saveChild} className="p-5 space-y-4">
              <div>
                <label className={lc}>Name *</label>
                <input required value={childForm.name||''}
                  onChange={e=>setChildForm(f=>({...f,name:e.target.value}))} className={fc} placeholder="Emma" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowChildForm(false)}
                  className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                  Add Child
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChoreChart;
