import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { Recipe, RecipeListResponse } from '../types';
import { RecipeCard } from './RecipeCard';

const TAGS = ['All', 'quick', 'vegetarian', 'breakfast', 'lunch', 'dinner', 'italian', 'mexican', 'asian', 'healthy'];

export function RecipeBrowser() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tag, setTag] = useState('All');
  const [loading, setLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 12 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (tag !== 'All') params.tag = tag;
      const res = await client.get<RecipeListResponse>('/recipes', { params });
      setRecipes(res.data.recipes);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, tag]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tag]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Recipe Browser</h1>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes…"
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              tag === t
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        {loading ? 'Loading…' : `${total} recipe${total !== 1 ? 's' : ''} found`}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex gap-2 justify-center">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            Page {page} of {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
