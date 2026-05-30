import React from 'react';
import { ChildrenManager } from './ChildrenManager';
import { ChoresManager } from './ChoresManager';

export function FamilyPlanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">👨‍👩‍👧‍👦 Family Management</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your children and assign chores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChildrenManager />
        <ChoresManager />
      </div>
    </div>
  );
}
