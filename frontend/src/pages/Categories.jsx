import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { LoadingState } from "../components/states";
import { SearchBar } from "../components/SearchBar";
import { Utensils, ArrowRight } from "lucide-react";

const CUISINE_COLORS = ["bg-coral/10 text-coral-hover", "bg-gold/15 text-amber-700", "bg-leaf/10 text-leaf", "bg-ink/5 text-ink"];

export default function Categories() {
  const [cats, setCats] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get("/categories").then(({ data }) => setCats(data.categories)).catch(() => setCats([]));
  }, []);

  if (!cats) return <LoadingState label="Loading categories..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-widest uppercase text-coral">Discover</p>
        <h1 className="mt-2 font-heading text-4xl sm:text-5xl font-black text-ink">Browse by cuisine</h1>
      </div>

      <div className="mt-8 max-w-2xl">
        <SearchBar size="md" showExamples={false} />
        <p className="mt-4 text-lg text-ink-soft">
          Pick a cuisine to explore — or search directly for the exact dish you're craving.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c, i) => (
          <div key={c.cuisine} className="rounded-3xl bg-white border border-border shadow-soft p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className={`grid place-items-center w-12 h-12 rounded-2xl ${CUISINE_COLORS[i % CUISINE_COLORS.length]}`}>
                <Utensils size={22} />
              </div>
              <span className="text-sm font-bold text-ink-soft">{c.count} recipes</span>
            </div>
            <h3 className="mt-4 font-heading text-2xl font-black text-ink">{c.cuisine}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(c.regions || []).slice(0, 6).map((rg) => (
                <Link
                  key={rg}
                  to={`/search?q=${encodeURIComponent(rg)}`}
                  data-testid={`region-${rg.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-ink-soft hover:text-coral transition-colors"
                >
                  {rg}
                </Link>
              ))}
            </div>
            <Link
              to={`/search?q=${encodeURIComponent(c.cuisine)}`}
              data-testid={`cuisine-${c.cuisine.toLowerCase().replace(/\s+/g, "-")}`}
              className="inline-flex items-center gap-2 mt-5 font-bold text-coral hover:gap-3 transition-all"
            >
              Explore {c.cuisine} <ArrowRight size={17} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
