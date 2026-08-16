import React from "react";
import { Loader2, SearchX, UtensilsCrossed } from "lucide-react";

export function LoadingState({ label = "Finding the best recipes..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-ink-soft" data-testid="loading-state">
      <Loader2 className="animate-spin text-coral mb-4" size={40} />
      <p className="font-semibold">{label}</p>
    </div>
  );
}

export function SearchEmptyState({ query, onSuggest }) {
  return (
    <div className="text-center py-20 max-w-lg mx-auto animate-float-up" data-testid="search-empty-state">
      <div className="mx-auto mb-6 grid place-items-center w-16 h-16 rounded-2xl bg-coral/10">
        <SearchX className="text-coral" size={30} />
      </div>
      <h3 className="font-heading text-2xl font-black text-ink">
        We don't have enough recipes for {query ? `"${query}"` : "this dish"} yet.
      </h3>
      <p className="mt-3 text-ink-soft">
        Tell us you want it and we'll get creators cooking.
      </p>
      <button
        onClick={onSuggest}
        data-testid="suggest-dish-button"
        className="mt-6 rounded-full bg-coral hover:bg-coral-hover text-white font-bold px-6 h-12 transition-colors"
      >
        Suggest this dish
      </button>
    </div>
  );
}

export function RecipeEmptyState({ title = "Nothing here yet", subtitle }) {
  return (
    <div className="text-center py-20 max-w-lg mx-auto" data-testid="recipe-empty-state">
      <div className="mx-auto mb-6 grid place-items-center w-16 h-16 rounded-2xl bg-secondary">
        <UtensilsCrossed className="text-ink-soft" size={30} />
      </div>
      <h3 className="font-heading text-2xl font-black text-ink">{title}</h3>
      {subtitle && <p className="mt-3 text-ink-soft">{subtitle}</p>}
    </div>
  );
}
