import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { correctQuery } from "../lib/fuzzy";

const EXAMPLES = ["Chicken Biryani", "Pasta Carbonara", "Momos", "Butter Chicken", "Chocolate Cake"];

export function SearchBar({ initial = "", showExamples = true, size = "lg", autoFocus = false }) {
  const [q, setQ] = useState(initial);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    const corrected = await correctQuery(term);
    if (corrected && corrected.toLowerCase() !== term.toLowerCase()) {
      navigate(`/search?q=${encodeURIComponent(corrected)}&raw=${encodeURIComponent(term)}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  const goExample = (ex) => navigate(`/search?q=${encodeURIComponent(ex)}`);

  const h = size === "lg" ? "h-16 sm:h-20" : "h-14";

  return (
    <div className="w-full">
      <form
        onSubmit={submit}
        data-testid="search-form"
        className={`flex items-center gap-2 rounded-full bg-white pl-5 pr-2 ${h} border transition-all duration-300 ${
          focused ? "border-coral shadow-lift ring-4 ring-coral/10 scale-[1.01]" : "border-border shadow-soft"
        }`}
      >
        <Search className="text-ink-soft shrink-0" size={22} />
        <input
          data-testid="search-input"
          value={q}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for a dish..."
          aria-label="Search for a dish"
          className="flex-1 bg-transparent outline-none text-base sm:text-lg font-medium text-ink placeholder:text-ink-soft/60 min-w-0"
        />
        <button
          type="submit"
          data-testid="search-submit"
          className="shrink-0 rounded-full bg-coral hover:bg-coral-hover text-white font-bold px-5 sm:px-7 h-11 sm:h-14 transition-colors duration-200"
        >
          Search
        </button>
      </form>

      {showExamples && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              data-testid={`example-chip-${ex.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => goExample(ex)}
              className="rounded-full bg-white border border-border px-3.5 py-1.5 text-sm font-semibold text-ink-soft hover:border-coral hover:text-coral transition-colors duration-200"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
