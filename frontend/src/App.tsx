import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { RecipeBrowser } from './components/RecipeBrowser';
import { PantryView } from './components/PantryView';
import { ShoppingList } from './components/ShoppingList';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <OfflineIndicator />
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={<RequireAuth><WeeklyPlanner /></RequireAuth>} />
        <Route path="/recipes" element={<RequireAuth><RecipeBrowser /></RequireAuth>} />
        <Route path="/pantry" element={<RequireAuth><PantryView /></RequireAuth>} />
        <Route path="/shopping" element={<RequireAuth><ShoppingList /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
