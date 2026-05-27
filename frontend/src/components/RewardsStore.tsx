import React, { useEffect, useState } from 'react';
import { rewardsAPI, redemptionsAPI, type Reward, type RedemptionRequest } from '../api/familyApi';
import { useAuth } from '../hooks/useAuth';
import { ParentalPinModal, getStoredPinToken } from './ParentalPinModal';

// ------ Child View: Rewards Store ------

export function RewardsStore({ childId }: { childId: string }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<Reward | null>(null);

  useEffect(() => {
    load();
  }, [childId]);

  const load = async () => {
    setLoading(true);
    try {
      const [rw, rd] = await Promise.all([
        rewardsAPI.list(),
        redemptionsAPI.list(childId),
      ]);
      setRewards(rw);
      setRedemptions(rd);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    setRedeeming(null);
    setError(null);
    try {
      await redemptionsAPI.request(childId, reward.id);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit redemption request');
    }
  };

  const pendingIds = new Set(
    redemptions.filter(r => r.status === 'pending' || r.status === 'approved').map(r => r.rewardId)
  );

  if (loading) return <div className="py-8 text-center text-gray-500">Loading rewards…</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">🎁 Rewards Store</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {rewards.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No rewards available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rewards.map((reward) => {
            const alreadyPending = pendingIds.has(reward.id);
            return (
              <div key={reward.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex flex-col gap-2">
                <h3 className="font-semibold text-gray-800 dark:text-white">{reward.title}</h3>
                {reward.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{reward.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className="text-purple-600 font-bold">⭐ {reward.pointCost} pts</span>
                  <button
                    onClick={() => setRedeeming(reward)}
                    disabled={alreadyPending}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                  >
                    {alreadyPending ? '⏳ Pending' : 'Redeem'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* My Redemptions */}
      {redemptions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">My Requests</h3>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                <span className="text-gray-700 dark:text-gray-300">{r.rewardId}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {redeeming && (
        <ConfirmRedeemModal
          reward={redeeming}
          onConfirm={() => handleRedeem(redeeming)}
          onCancel={() => setRedeeming(null)}
        />
      )}
    </div>
  );
}

// ------ Parent View: Pending Redemptions ------

export function PendingRedemptions() {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinToken, setPinToken] = useState<string | null>(getStoredPinToken);
  const [showPin, setShowPin] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'cancel' | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await redemptionsAPI.listPending();
      setRedemptions(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load redemptions');
    } finally {
      setLoading(false);
    }
  };

  const initiateAction = (id: string, type: 'approve' | 'cancel') => {
    if (type === 'approve' && !getStoredPinToken()) {
      setActionId(id);
      setActionType(type);
      setShowPin(true);
      return;
    }
    executeAction(id, type, getStoredPinToken() || '');
  };

  const executeAction = async (id: string, type: 'approve' | 'cancel', token: string) => {
    try {
      if (type === 'approve') {
        await redemptionsAPI.approve(id, token);
      } else {
        await redemptionsAPI.cancel(id);
      }
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${type} redemption`);
    }
  };

  const handlePinUnlocked = (token: string) => {
    setPinToken(token);
    setShowPin(false);
    if (actionId && actionType) {
      executeAction(actionId, actionType, token);
      setActionId(null);
      setActionType(null);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">📋 Redemption Requests</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {redemptions.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No pending redemption requests.</p>
      ) : (
        <div className="space-y-3">
          {redemptions.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-xl">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">Reward: {r.rewardId}</p>
                <p className="text-sm text-gray-500">⭐ {r.pointsSpent} pts · {new Date(r.requestedAt).toLocaleDateString()}</p>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <>
                    <button
                      onClick={() => initiateAction(r.id, 'approve')}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => initiateAction(r.id, 'cancel')}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                    >
                      ✕ Cancel
                    </button>
                  </>
                )}
                {r.status === 'approved' && (
                  <button
                    onClick={async () => { await redemptionsAPI.fulfill(r.id); await load(); }}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                  >
                    ✅ Mark Fulfilled
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showPin && (
        <ParentalPinModal
          onUnlocked={handlePinUnlocked}
          onCancel={() => { setShowPin(false); setActionId(null); setActionType(null); }}
        />
      )}
    </div>
  );
}

// ------ Helpers ------

function StatusBadge({ status }: { status: RedemptionRequest['status'] }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-blue-50 text-blue-700 border-blue-200',
    fulfilled: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full border inline-block mt-1 ${map[status] ?? ''}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ConfirmRedeemModal({ reward, onConfirm, onCancel }: {
  reward: Reward;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Redeem Reward?</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-1 font-medium">{reward.title}</p>
        <p className="text-sm text-gray-500 mb-6">
          This will request <strong>⭐ {reward.pointCost} points</strong> from a parent.
          Points will be deducted when your parent approves.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors min-h-[44px]"
          >
            ✓ Request
          </button>
        </div>
      </div>
    </div>
  );
}
