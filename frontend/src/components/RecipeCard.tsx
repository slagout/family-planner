import React, { useState } from 'react';
import { Recipe, RecipeWithIngredients } from '../types';
import client from '../api/client';

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<RecipeWithIngredients | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true);
      try {
        const res = await client.get<RecipeWithIngredients>(`/recipes/${recipe.id}`);
        setDetail(res.data);
      } finally {
        setLoadingDetail(false);
      }
    }
    setExpanded(!expanded);
  };

  const totalMins = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 cursor-pointer" onClick={handleExpand}>
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight">{recipe.name}</h3>
          <span className="text-gray-400 text-lg">{expanded ? '▲' : '▼'}</span>
        </div>
        {recipe.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{recipe.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-xs text-gray-500">👥 {recipe.servings} servings</span>
          {totalMins > 0 && (
            <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full">⏱ {totalMins} min</span>
          )}
          {recipe.tags?.map((tag) => (
            <span key={tag} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full capitalize">{tag}</span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          {loadingDetail ? (
            <p className="text-xs text-gray-400">Loading ingredients…</p>
          ) : detail ? (
            <ul className="text-xs text-gray-700 space-y-1">
              {detail.ingredients.map((ing) => (
                <li key={ing.id} className="flex justify-between">
                  <span>{ing.name}</span>
                  <span className="text-gray-500 font-mono">
                    {ing.quantity} {ing.unit || 'pcs'}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
