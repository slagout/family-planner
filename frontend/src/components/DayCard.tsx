import React from 'react';
import { MealPlanDay } from '../types';

interface Props {
  dayData: MealPlanDay;
}

const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

export function DayCard({ dayData }: Props) {
  const { day, recipe } = dayData;
  const totalMins = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="text-xs font-bold uppercase tracking-wide text-primary-600">{DAY_FULL[day] || day}</div>
      <div className="font-semibold text-gray-800 text-sm leading-tight">{recipe.name}</div>
      {recipe.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{recipe.description}</p>
      )}
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {totalMins > 0 && (
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
            ⏱ {totalMins} min
          </span>
        )}
        {recipe.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full capitalize">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
