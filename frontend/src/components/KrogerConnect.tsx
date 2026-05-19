import React, { useEffect, useState } from 'react';

type Status = 'loading' | 'linked' | 'unlinked' | 'error';

export function KrogerConnect() {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Handle redirect back from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === 'true') {
      setStatus('linked');
      window.history.replaceState({}, '', '/kroger');
      return;
    }
    if (params.get('error')) {
      setMessage(params.get('error') || 'Authorization failed');
      setStatus('error');
      window.history.replaceState({}, '', '/kroger');
      return;
    }

    // Check current link status
    const token = localStorage.getItem('fp_token');
    fetch('/api/kroger/status', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setStatus(data.linked ? 'linked' : 'unlinked'))
      .catch(() => setStatus('unlinked'));
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/kroger/authorize';
  };

  const handleDisconnect = async () => {
    setStatus('loading');
    const token = localStorage.getItem('fp_token');
    try {
      await fetch('/api/kroger/disconnect', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setStatus('unlinked');
    } catch {
      setMessage('Failed to disconnect. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="section-header flex items-center gap-3">
        <span className="text-3xl">🛒</span> Kroger Account
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 mb-8">
        Link your Kroger account to look up product nutrition, check prices,
        and add items directly to your Kroger cart.
      </p>

      {status === 'loading' && (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      )}

      {status === 'linked' && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center text-success-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">Kroger account linked</p>
              <p className="text-sm text-success-600">Product lookup and cart features are active</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="btn w-full border border-danger-300 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950 bg-transparent"
          >
            Disconnect Kroger Account
          </button>
        </div>
      )}

      {status === 'unlinked' && (
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">Not connected</p>
              <p className="text-sm text-neutral-500">Sign in with Kroger to enable grocery features</p>
            </div>
          </div>
          <button onClick={handleConnect} className="btn btn-primary w-full">
            Connect Kroger Account
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="card border border-danger-200">
          <p className="text-danger-600 font-medium mb-4">⚠️ {message || 'Something went wrong'}</p>
          <button onClick={() => setStatus('unlinked')} className="btn btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {/* Feature overview */}
      <div className="mt-8 grid gap-3">
        {[
          { icon: '🔍', title: 'Barcode Lookup', desc: 'Scan any UPC to auto-fill nutrition and pricing' },
          { icon: '🛒', title: 'Cart Integration', desc: 'Add ingredients directly to your Kroger cart' },
          { icon: '💰', title: 'Price Tracking', desc: 'See current store prices on inventory items' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-medium text-neutral-800 dark:text-neutral-100">{title}</p>
              <p className="text-sm text-neutral-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
