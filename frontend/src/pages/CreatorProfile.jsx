import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star, Utensils, Award } from "lucide-react";
import { api } from "../lib/api";
import { RecipeCard } from "../components/RecipeCard";
import { LoadingState, RecipeEmptyState } from "../components/states";

export default function CreatorProfile() {
  const { slug } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/creators/${slug}`).then(({ data }) => setData(data)).catch(() => setData(false));
  }, [slug]);

  if (data === null) return <LoadingState label="Loading creator..." />;
  if (!data) return <div className="py-16"><RecipeEmptyState title="Creator not found" /></div>;

  const { creator, recipes } = data;
  const stats = [
    { icon: Utensils, label: "Recipes", value: creator.recipe_count },
    { icon: Star, label: "Avg rating", value: creator.rating_avg },
    { icon: Award, label: "Total ratings", value: Number(creator.rating_count || 0).toLocaleString() },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-3xl bg-white border border-border shadow-soft p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <img src={creator.avatar} alt={creator.display_name} className="w-24 h-24 rounded-2xl object-cover border border-border" />
        <div className="flex-1">
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-ink">{creator.display_name}</h1>
          <p className="mt-2 text-ink-soft max-w-2xl">{creator.bio}</p>
        </div>
        <div className="flex gap-3">
          {stats.map((s) => (
            <div key={s.label} className="text-center rounded-2xl bg-secondary px-4 py-3 min-w-[84px]">
              <s.icon size={16} className="mx-auto text-coral mb-1" />
              <p className="font-heading font-black text-ink">{s.value}</p>
              <p className="text-xs text-ink-soft font-bold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <h2 className="font-heading text-2xl font-black text-ink mt-10 mb-4">Recipes</h2>
      {recipes.length === 0 ? (
        <RecipeEmptyState title="No published recipes yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => <RecipeCard key={r.id} recipe={r} showSave={false} />)}
        </div>
      )}
    </div>
  );
}
