import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Navbar }           from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Login }            from './components/Login';
import { Register }         from './components/Register';
import { WeeklyPlanner }    from './components/WeeklyPlanner';
import { RecipeBrowser }    from './components/RecipeBrowser';
import { ShoppingList }     from './components/ShoppingList';
import { InventoryView }    from './components/InventoryView';
import { ChoreChart }       from './components/ChoreChart';
import { KrogerConnect }    from './components/KrogerConnect';
import { FamilyCalendar }   from './components/FamilyCalendar';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <OfflineIndicator />
      {user && <Navbar />}
      <Routes>
        {/* Auth */}
        <Route path="/login"    element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

        {/* Main app */}
        <Route path="/"          element={<RequireAuth><WeeklyPlanner /></RequireAuth>} />
        <Route path="/calendar"  element={<RequireAuth><FamilyCalendar /></RequireAuth>} />
        <Route path="/recipes"   element={<RequireAuth><RecipeBrowser /></RequireAuth>} />
        <Route path="/shopping"  element={<RequireAuth><ShoppingList /></RequireAuth>} />

        {/* Inventory — 4 tabs: Pantry, Freezer, Refrigerator, Bulk Cooking */}
        <Route path="/inventory" element={<RequireAuth><InventoryView /></RequireAuth>} />
        <Route path="/pantry"    element={<Navigate to="/inventory" replace />} />

        {/* Chores & Rewards */}
        <Route path="/chores"    element={<RequireAuth><ChoreChart /></RequireAuth>} />

        {/* Kroger account */}
        <Route path="/kroger"    element={<RequireAuth><KrogerConnect /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
