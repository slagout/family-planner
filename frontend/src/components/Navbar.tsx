import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      )}
    </button>
  );
}

const NAV_ITEMS = [
  { to: '/',          label: 'Planner' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/chores',    label: 'Chores' },
  { to: '/recipes',   label: 'Recipes' },
  { to: '/shopping',  label: 'Shopping' },
  { to: '/kroger',    label: 'Kroger' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLink = (to: string, label: string) => (
    <Link
      key={to}
      to={to}
      onClick={() => setOpen(false)}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-white dark:bg-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl shrink-0">
            🍽️ Family Planner
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label }) => navLink(to, label))}
            </div>
          )}

          {/* Right side: theme toggle + user */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <span className="text-sm text-neutral-600 dark:text-neutral-400 max-w-[140px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700">
                Login
              </Link>
            )}
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="lg:hidden flex items-center gap-1">
            <ThemeToggle />
            {user && (
              <button className="p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
                <span className="text-2xl">{open ? '✕' : '☰'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && user && (
        <div className="lg:hidden border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex flex-col gap-1 bg-white dark:bg-neutral-900">
          {NAV_ITEMS.map(({ to, label }) => navLink(to, label))}
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 mb-2 truncate">{user.displayName || user.email}</p>
            <button
              onClick={handleLogout}
              className="text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md w-full"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
