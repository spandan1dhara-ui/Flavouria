import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatError } from "../lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
  Search, Minus, Plus, Users, Clock, Plus as PlusIcon, Trash2, ShoppingCart,
  ListChecks, Loader2, Check, ChefHat,
} from "lucide-react";

function PaxStepper({ value, onChange, testidPrefix }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-cream/60 p-1">
      <button type="button" data-testid={`${testidPrefix}-decrement`} onClick={() => onChange(Math.max(1, value - 1))}
        className="grid place-items-center w-9 h-9 rounded-xl bg-white border border-border hover:border-coral text-ink transition-colors">
        <Minus size={16} />
      </button>
      <div className="flex items-center gap-1.5 px-3 min-w-[52px] justify-center">
        <Users size={15} className="text-coral" />
        <span data-testid={`${testidPrefix}-value`} className="font-heading text-lg font-black text-ink">{value}</span>
      </div>
      <button type="button" data-testid={`${testidPrefix}-increment`} onClick={() => onChange(Math.min(50, value + 1))}
        className="grid place-items-center w-9 h-9 rounded-xl bg-white border border-border hover:border-coral text-ink transition-colors">
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function PlanMeal() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // recipe card being configured
  const [selectedPax, setSelectedPax] = useState(2);
  const [items, setItems] = useState([]); // staged {recipe, pax}
  const [viewOpen, setViewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const doSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSelected(null);
    try {
      const { data } = await api.get("/recipes/lookup", { params: { q } });
      setResults(data.results || []);
    } catch (err) {
      toast.error(formatError(err?.response?.data?.detail));
    } finally {
      setSearching(false);
    }
  };

  const pick = (recipe) => {
    setSelected(recipe);
    setSelectedPax(recipe.servings || 2);
  };

  const addToList = () => {
    if (!selected) return;
    if (items.some((it) => it.recipe.id === selected.id)) {
      toast.info(`${selected.title} is already in your list`);
      return;
    }
    setItems((prev) => [...prev, { recipe: selected, pax: selectedPax }]);
    toast.success(`Added ${selected.title}`);
    setSelected(null);
    setQuery("");
    setResults(null);
  };

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.recipe.id !== id));
  const setItemPax = (id, pax) => setItems((prev) => prev.map((it) => (it.recipe.id === id ? { ...it, pax } : it)));

  const generate = async () => {
    if (items.length === 0) return;
    setGenerating(true);
    try {
      const { data } = await api.post("/shopping-lists", {
        items: items.map((it) => ({ recipe_id: it.recipe.id, pax: it.pax })),
      });
      toast.success("Shopping list saved to your profile");
      setItems([]);
      setViewOpen(false);
      navigate(`/shopping-lists/${data.list.id}`);
    } catch (err) {
      toast.error(formatError(err?.response?.data?.detail));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-28">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-widest uppercase text-coral">Plan your Meal</p>
          <h1 className="mt-2 font-heading text-4xl sm:text-5xl font-black text-ink">Build your shopping list</h1>
          <p className="mt-3 text-lg text-ink-soft">Search recipes, set how many people each serves, and add them to one consolidated list.</p>
        </div>
        <button data-testid="view-list-button" onClick={() => setViewOpen(true)}
          className="relative inline-flex items-center gap-2 h-12 px-5 rounded-full border border-border bg-white font-bold text-ink hover:border-coral transition-colors">
          <ListChecks size={18} /> View List
          {items.length > 0 && (
            <span data-testid="list-count-badge" className="grid place-items-center min-w-6 h-6 px-1.5 rounded-full bg-coral text-white text-xs font-black">{items.length}</span>
          )}
        </button>
      </div>

      {/* Search */}
      <form onSubmit={doSearch} className="mt-8 rounded-3xl bg-white border border-border shadow-soft p-5 sm:p-6" data-testid="recipe-search-form">
        <label className="block text-sm font-bold text-ink mb-2">Search for a recipe</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" size={20} />
            <input data-testid="recipe-search-input" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Plain Rice, Mutton Kosha, Bhendi"
              className="w-full h-14 rounded-2xl border border-border bg-cream/60 pl-12 pr-4 text-ink placeholder:text-ink-soft/70 focus:outline-none focus:border-coral transition-colors" />
          </div>
          <button type="submit" data-testid="recipe-search-button"
            className="inline-flex items-center gap-2 h-14 px-6 rounded-2xl bg-ink hover:bg-ink/90 text-white font-bold transition-colors">
            {searching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="mt-5" data-testid="recipe-search-results">
            {results.length === 0 ? (
              <p className="text-ink-soft py-4">No recipes found for "{query}". Try another dish.</p>
            ) : (
              <div className="grid gap-2">
                {results.map((r) => {
                  const active = selected?.id === r.id;
                  return (
                    <button key={r.id} type="button" data-testid={`result-${r.id}`} onClick={() => pick(r)}
                      className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors ${active ? "border-coral bg-coral/5" : "border-border bg-white hover:border-coral/60"}`}>
                      {r.thumbnail && <img src={r.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink truncate">{r.title}</p>
                        <div className="flex items-center gap-3 text-sm text-ink-soft">
                          {r.cuisine && <span>{r.cuisine}</span>}
                          {r.cook_time != null && <span className="inline-flex items-center gap-1"><Clock size={13} /> {r.cook_time}m</span>}
                        </div>
                      </div>
                      {active && <Check className="text-coral flex-shrink-0" size={20} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Selected recipe -> quantity + Add */}
        {selected && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-cream/70 border border-border p-4" data-testid="selected-recipe-panel">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Selected</p>
              <p className="font-heading text-lg font-black text-ink truncate">{selected.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <PaxStepper value={selectedPax} onChange={setSelectedPax} testidPrefix="selected-pax" />
              <button type="button" data-testid="add-to-list-button" onClick={addToList}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-coral hover:bg-coral-hover text-white font-bold transition-colors">
                <PlusIcon size={18} /> Add to List
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Sticky generate bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur" data-testid="generate-bar">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <button onClick={() => setViewOpen(true)} className="inline-flex items-center gap-2 font-bold text-ink">
              <ShoppingCart size={18} className="text-coral" />
              {items.length} {items.length === 1 ? "recipe" : "recipes"} in your list
            </button>
            <button data-testid="generate-my-list-button" onClick={generate} disabled={generating}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-hover text-white font-black transition-colors disabled:opacity-60">
              {generating ? <Loader2 className="animate-spin" size={20} /> : <ChefHat size={20} />} Generate My List
            </button>
          </div>
        </div>
      )}

      {/* View List popup */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg" data-testid="view-list-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">Your recipes ({items.length})</DialogTitle>
          </DialogHeader>
          {items.length === 0 ? (
            <p className="text-ink-soft py-6 text-center">No recipes yet. Search and add some!</p>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.recipe.id} data-testid={`list-item-${it.recipe.id}`} className="flex items-center gap-3 rounded-2xl border border-border p-2.5">
                  {it.recipe.thumbnail && <img src={it.recipe.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                  <p className="flex-1 min-w-0 font-bold text-ink truncate">{it.recipe.title}</p>
                  <PaxStepper value={it.pax} onChange={(p) => setItemPax(it.recipe.id, p)} testidPrefix={`item-pax-${it.recipe.id}`} />
                  <button data-testid={`remove-${it.recipe.id}`} onClick={() => removeItem(it.recipe.id)}
                    className="grid place-items-center w-9 h-9 rounded-xl text-ink-soft hover:text-coral hover:bg-coral/10 transition-colors" aria-label="Remove">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button data-testid="dialog-generate-button" onClick={generate} disabled={generating || items.length === 0}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-hover text-white font-black transition-colors disabled:opacity-60 w-full sm:w-auto">
              {generating ? <Loader2 className="animate-spin" size={20} /> : <ChefHat size={20} />} Generate My List
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
