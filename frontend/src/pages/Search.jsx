import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowRight, X } from "lucide-react";
import { api } from "../lib/api";
import { SearchBar } from "../components/SearchBar";
import { TopThreeCard } from "../components/TopThreeCard";
import { YouTubeResults } from "../components/YouTubeResults";
import { LoadingState, SearchEmptyState } from "../components/states";
import { toast } from "sonner";

const FILTERS = {
  spice: { label: "Spice", options: [["Mild", "mild"], ["Medium", "medium"], ["Spicy", "spicy"]] },
  diet: {
    label: "Diet",
    options: [["Vegetarian", "Vegetarian"], ["Non-Veg", "Non-Vegetarian"], ["Vegan", "Vegan"], ["Egg", "Egg"]],
  },
  time: { label: "Time", options: [["Under 30", "u30"], ["Under 60", "u60"], ["60+ min", "o60"]] },
  difficulty: { label: "Difficulty", options: [["Easy", "Easy"], ["Medium", "Medium"], ["Advanced", "Advanced"]] },
  cuisine: {
    label: "Cuisine",
    options: [["Indian", "Indian"], ["South Indian", "South Indian"], ["Bengali", "Bengali"],
      ["Italian", "Italian"], ["Chinese", "Chinese"], ["Japanese", "Japanese"], ["Dessert", "Dessert"]],
  },
};

function FilterGroup({ title, options, value, onSelect }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([label, val]) => {
          const active = value === val;
          return (
            <button
              key={val}
              data-testid={`filter-${title.toLowerCase()}-${val}`}
              onClick={() => onSelect(active ? null : val)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold border transition-colors ${
                active ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-border hover:border-coral"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const raw = params.get("raw") || "";
  const corrected = raw && raw.toLowerCase() !== query.toLowerCase() ? query : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [ytVideos, setYtVideos] = useState([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [filters, setFilters] = useState({ spice: null, diet: null, time: null, difficulty: null, cuisine: null });

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const qp = new URLSearchParams({ q: query });
      if (filters.spice) qp.set("spice", filters.spice);
      if (filters.diet) qp.set("diet", filters.diet);
      if (filters.difficulty) qp.set("difficulty", filters.difficulty);
      if (filters.cuisine) qp.set("cuisine", filters.cuisine);
      if (filters.time === "u30") qp.set("max_time", "30");
      if (filters.time === "u60") qp.set("max_time", "60");
      if (filters.time === "o60") qp.set("min_time", "60");
      const { data } = await api.get(`/search?${qp.toString()}`);
      setData(data);
    } catch {
      toast.error("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    let active = true;
    (async () => {
      setYtLoading(true);
      setYtVideos([]);
      try {
        const { data } = await api.get(`/youtube?q=${encodeURIComponent(query)}`);
        if (active) setYtVideos(data.videos || []);
      } catch {
        if (active) setYtVideos([]);
      } finally {
        if (active) setYtLoading(false);
      }
    })();
    return () => { active = false; };
  }, [query]);

  const onSelect = (recipeId) => {
    api.post("/search/select", { search_id: data?.search_id, recipe_id: recipeId }).catch(() => {});
  };

  const suggest = async () => {
    try {
      await api.post("/suggest-dish", { query });
      toast.success("Thanks! We'll get creators cooking this.");
    } catch {
      toast.error("Could not submit suggestion");
    }
  };

  const activeCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => setFilters({ spice: null, diet: null, time: null, difficulty: null, cuisine: null });

  const results = data?.results || [];
  const count = data?.count ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <SearchBar initial={query} size="md" showExamples={false} />
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-ink capitalize">{query}</h1>
          {corrected && (
            <p data-testid="fuzzy-correction-note" className="text-sm text-ink-soft mt-1">
              Showing results for <span className="font-bold text-coral capitalize">{query}</span>
              {" "}· searched for "<span className="capitalize">{raw}</span>"
            </p>
          )}
          {count === 3 && <p className="text-ink-soft mt-1 font-medium">The 3 recipes worth trying</p>}
          {count === 2 && <p className="text-ink-soft mt-1 font-medium">We found 2 great matches.</p>}
          {count === 1 && <p className="text-ink-soft mt-1 font-medium">We found 1 great match.</p>}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          data-testid="toggle-filters"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 h-11 font-bold text-ink hover:border-coral transition-colors"
        >
          <SlidersHorizontal size={16} /> Filters
          {activeCount > 0 && <span className="grid place-items-center w-5 h-5 rounded-full bg-coral text-white text-xs">{activeCount}</span>}
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden mb-6"
        >
          <div className="rounded-3xl bg-white border border-border shadow-soft p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FilterGroup title="Spice" options={FILTERS.spice.options} value={filters.spice} onSelect={(v) => setFilters((f) => ({ ...f, spice: v }))} />
            <FilterGroup title="Diet" options={FILTERS.diet.options} value={filters.diet} onSelect={(v) => setFilters((f) => ({ ...f, diet: v }))} />
            <FilterGroup title="Time" options={FILTERS.time.options} value={filters.time} onSelect={(v) => setFilters((f) => ({ ...f, time: v }))} />
            <FilterGroup title="Difficulty" options={FILTERS.difficulty.options} value={filters.difficulty} onSelect={(v) => setFilters((f) => ({ ...f, difficulty: v }))} />
            <FilterGroup title="Cuisine" options={FILTERS.cuisine.options} value={filters.cuisine} onSelect={(v) => setFilters((f) => ({ ...f, cuisine: v }))} />
            {activeCount > 0 && (
              <div className="flex items-end">
                <button onClick={clearFilters} data-testid="clear-filters" className="inline-flex items-center gap-1.5 text-sm font-bold text-coral hover:underline">
                  <X size={15} /> Clear all
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {loading ? (
        <LoadingState />
      ) : count === 0 ? (
        <SearchEmptyState query={query} onSuggest={suggest} />
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {results.map((r, i) => (
              <TopThreeCard key={r.id} recipe={r} rank={r.rank} index={i} onSelect={onSelect} />
            ))}
          </div>

          <div className="mt-12 text-center border-t border-border pt-10">
            <p className="text-ink-soft font-medium">Didn't find what you're looking for?</p>
            <Link
              to="/categories"
              data-testid="explore-more"
              className="inline-flex items-center gap-2 mt-2 font-bold text-coral hover:gap-3 transition-all"
            >
              Explore more recipes <ArrowRight size={18} />
            </Link>
          </div>
        </>
      )}

      <YouTubeResults videos={ytVideos} loading={ytLoading} />
    </div>
  );
}
