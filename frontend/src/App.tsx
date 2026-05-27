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
import { FamilyPlanner } from './components/FamilyPlanner';
import { CalendarView } from './components/CalendarView';
import { RewardsStore, PendingRedemptions } from './components/RewardsStore';

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
        <Route path="/family" element={<RequireAuth><FamilyPlanner /></RequireAuth>} />
        <Route path="/recipes" element={<RequireAuth><RecipeBrowser /></RequireAuth>} />
        <Route path="/pantry" element={<RequireAuth><PantryView /></RequireAuth>} />
        <Route path="/shopping" element={<RequireAuth><ShoppingList /></RequireAuth>} />
        <Route path="/calendar/:childId" element={<RequireAuth><CalendarViewPage /></RequireAuth>} />
        <Route path="/rewards" element={<RequireAuth><RewardsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function CalendarViewPage() {
  const { user } = useAuth();
  // Use the authenticated user's ID or a child ID from the route param
  const childId = new URLSearchParams(window.location.search).get('childId') || user?.userId || '';
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <CalendarView childId={childId} />
    </div>
  );
}

function RewardsPage() {
  const { user } = useAuth();
  const isParent = user?.roles?.includes('parent') || user?.roles?.includes('admin');
  const childId = new URLSearchParams(window.location.search).get('childId') || user?.userId || '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {isParent ? <PendingRedemptions /> : <RewardsStore childId={childId} />}
    </div>
  );
}
