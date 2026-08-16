import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { RecipeCard } from "../components/RecipeCard";
import { LoadingState, RecipeEmptyState } from "../components/states";
import { Link } from "react-router-dom";

export default function Saved() {
  const [recipes, setRecipes] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get("/saved").then(({ data }) => setRecipes(data.recipes)).catch(() => setRecipes([]));
  }, []);

  if (recipes === null) return <LoadingState label="Loading your saved recipes..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-heading text-4xl font-black text-ink">Saved recipes</h1>
      <p className="text-ink-soft mt-2">Your personal collection to cook later.</p>

      {recipes.length === 0 ? (
        <div className="mt-8">
          <RecipeEmptyState title="Nothing saved yet" subtitle="Tap the heart on any recipe to keep it here." />
          <div className="text-center">
            <Link to="/" className="font-bold text-coral hover:underline">Start searching →</Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
        </div>
      )}
    </div>
  );
}
