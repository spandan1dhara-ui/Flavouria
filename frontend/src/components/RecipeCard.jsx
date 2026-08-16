import React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { SpiceBadge, TimeBadge } from "./badges";
import { SaveButton } from "./SaveButton";

export function RecipeCard({ recipe, showSave = true }) {
  const r = recipe;
  return (
    <Link
      to={`/recipe/${r.slug}`}
      data-testid={`recipe-card-${r.slug}`}
      className="group block rounded-3xl bg-white border border-border shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={r.thumbnail}
          alt={r.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {showSave && (
          <div className="absolute top-3 right-3">
            <SaveButton recipeId={r.id} initialSaved={r.is_saved} />
          </div>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-sm font-bold text-amber-700">
          <Star size={14} className="fill-gold text-gold" /> {r.rating_avg}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-heading text-lg font-black text-ink leading-tight line-clamp-1">
          {r.title}
        </h3>
        <div className="flex flex-wrap gap-2">
          <SpiceBadge level={r.spice_level} />
          <TimeBadge minutes={r.cook_time} />
        </div>
        <p className="text-xs text-ink-soft mt-1">
          {r.creator?.display_name} · {Number(r.rating_count || 0).toLocaleString()} ratings
        </p>
      </div>
    </Link>
  );
}
