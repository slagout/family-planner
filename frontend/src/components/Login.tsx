import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = [
    'w-full border rounded-lg px-3 py-2 text-sm',
    'border-neutral-300 bg-white text-neutral-900',
    'dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100',
    'focus:outline-none focus:ring-2 focus:ring-primary-500',
    'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
  ].join(' ');

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-neutral-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-700 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Welcome back</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Sign in to your Family Planner</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
            <input
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className={inputCls} placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Password</label>
            <input
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={inputCls} placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4">
          No account?{' '}
          <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
