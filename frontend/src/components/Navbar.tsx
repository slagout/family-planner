import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl">
            🍽️ Family Planner
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden sm:flex items-center gap-1">
              {navLink('/', 'Planner')}
              {navLink('/recipes', 'Recipes')}
              {navLink('/pantry', 'Pantry')}
              {navLink('/shopping', 'Shopping')}
            </div>
          )}

          {/* User / auth */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.displayName || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600">
                Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          {user && (
            <button className="sm:hidden p-2" onClick={() => setOpen(!open)}>
              <span className="text-2xl">{open ? '✕' : '☰'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {open && user && (
        <div className="sm:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-1">
          {navLink('/', 'Planner')}
          {navLink('/recipes', 'Recipes')}
          {navLink('/pantry', 'Pantry')}
          {navLink('/shopping', 'Shopping')}
          <button
            onClick={handleLogout}
            className="mt-2 text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
