import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, formatError } from "../lib/api";
import { LoadingState } from "../components/states";
import { Search, Minus, Plus, ShoppingCart, Users, Clock, Copy, Utensils, ArrowRight } from "lucide-react";

const FRACTIONS = { 0.25: "1/4", 0.33: "1/3", 0.34: "1/3", 0.5: "1/2", 0.66: "2/3", 0.67: "2/3", 0.75: "3/4", 0.2: "1/5", 0.13: "1/8", 0.12: "1/8" };

function prettyQty(q) {
  if (!q) return q;
  const m = String(q).match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return q;
  const num = parseFloat(m[1]);
  const whole = Math.floor(num);
  const frac = Number((num - whole).toFixed(2));
  const f = FRACTIONS[frac];
  if (!f) return q;
  return (whole > 0 ? `${whole} ${f}` : f) + m[2];
}

export default function PlanMeal() {
  const [dish, setDish] = useState("");
  const [pax, setPax] = useState(2);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const setPaxSafe = (n) => setPax(Math.max(1, Math.min(50, n)));

  const generate = async (e) => {
    e?.preventDefault();
    const q = dish.trim();
    if (!q) {
      toast.error("Enter a recipe you'd like to cook");
      return;
    }
    setLoading(true);
    setNotFound(false);
    setPlan(null);
    try {
      const { data } = await api.get("/meal-plan", { params: { q, pax } });
      if (data.found) setPlan(data);
      else setNotFound(true);
    } catch (err) {
      toast.error(formatError(err?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const copyList = async () => {
    if (!plan) return;
    const lines = [
      `${plan.recipe.title} — shopping list for ${plan.pax} ${plan.pax === 1 ? "person" : "people"}`,
      "",
      ...plan.shopping_list.map((i) => `• ${[prettyQty(i.quantity), i.unit].filter(Boolean).join(" ")} ${i.name}`.trim()),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Shopping list copied");
    } catch {
      toast.error("Couldn't copy the list");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-widest uppercase text-coral">Plan your Meal</p>
        <h1 className="mt-2 font-heading text-4xl sm:text-5xl font-black text-ink">Build your shopping list</h1>
      </div>

      <form onSubmit={generate} className="mt-8 rounded-3xl bg-white border border-border shadow-soft p-5 sm:p-6" data-testid="meal-plan-form">
        <label className="block text-sm font-bold text-ink mb-2">What do you want to cook?</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" size={20} />
          <input
            data-testid="meal-plan-dish-input"
            value={dish}
            onChange={(e) => setDish(e.target.value)}
            placeholder="e.g. Butter Chicken, Carbonara, Chicken Biryani"
            className="w-full h-14 rounded-2xl border border-border bg-cream/60 pl-12 pr-4 text-ink placeholder:text-ink-soft/70 focus:outline-none focus:border-coral transition-colors"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <label className="block text-sm font-bold text-ink mb-2">How many people?</label>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-cream/60 p-1">
              <button type="button" data-testid="pax-decrement" onClick={() => setPaxSafe(pax - 1)}
                className="grid place-items-center w-11 h-11 rounded-xl bg-white border border-border hover:border-coral text-ink transition-colors">
                <Minus size={18} />
              </button>
              <div className="flex items-center gap-2 px-4 min-w-[64px] justify-center">
                <Users size={18} className="text-coral" />
                <span data-testid="pax-value" className="font-heading text-2xl font-black text-ink">{pax}</span>
              </div>
              <button type="button" data-testid="pax-increment" onClick={() => setPaxSafe(pax + 1)}
                className="grid place-items-center w-11 h-11 rounded-xl bg-white border border-border hover:border-coral text-ink transition-colors">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <button type="submit" data-testid="meal-plan-generate"
            className="inline-flex items-center gap-2 h-14 px-7 rounded-2xl bg-coral hover:bg-coral-hover text-white font-bold transition-colors">
            <ShoppingCart size={20} /> Generate list
          </button>
        </div>
      </form>

      {loading && <LoadingState label="Building your shopping list..." />}

      {notFound && !loading && (
        <div className="mt-8 text-center py-16 rounded-3xl bg-white border border-border" data-testid="meal-plan-not-found">
          <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-coral/10">
            <Utensils className="text-coral" size={26} />
          </div>
          <h3 className="font-heading text-2xl font-black text-ink">We couldn't find "{dish}" in our recipes yet.</h3>
          <p className="mt-2 text-ink-soft">Try a different dish name, or explore our cuisines.</p>
          <Link to="/categories" className="inline-flex items-center gap-2 mt-5 font-bold text-coral hover:gap-3 transition-all">
            Browse cuisines <ArrowRight size={17} />
          </Link>
        </div>
      )}

      {plan && !loading && (
        <div className="mt-8 animate-float-up" data-testid="meal-plan-result">
          <div className="rounded-3xl bg-white border border-border shadow-soft overflow-hidden">
            <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-border">
              {plan.recipe.thumbnail && (
                <img src={plan.recipe.thumbnail} alt={plan.recipe.title}
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h2 className="font-heading text-2xl font-black text-ink truncate" data-testid="meal-plan-recipe-title">{plan.recipe.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                  {plan.recipe.cuisine && <span>{plan.recipe.cuisine}</span>}
                  {(plan.recipe.cook_time != null) && (
                    <span className="inline-flex items-center gap-1"><Clock size={14} /> {plan.recipe.cook_time} min</span>
                  )}
                  <span className="inline-flex items-center gap-1"><Users size={14} /> Serves {plan.pax}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 sm:px-6 pt-5">
              <h3 className="font-heading text-xl font-black text-ink flex items-center gap-2">
                <ShoppingCart size={20} className="text-coral" /> Shopping list
              </h3>
              <button onClick={copyList} data-testid="meal-plan-copy"
                className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-coral transition-colors">
                <Copy size={16} /> Copy
              </button>
            </div>
            <p className="px-5 sm:px-6 text-sm text-ink-soft">
              Scaled from {plan.base_servings} {plan.base_servings === 1 ? "serving" : "servings"} to {plan.pax} {plan.pax === 1 ? "person" : "people"}.
            </p>

            <ul className="p-5 sm:p-6 pt-4 divide-y divide-border" data-testid="meal-plan-ingredients">
              {plan.shopping_list.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-3" data-testid={`ingredient-row-${i}`}>
                  <span className="text-ink font-semibold">{item.name}</span>
                  <span className="text-ink-soft font-bold whitespace-nowrap">
                    {[prettyQty(item.quantity), item.unit].filter(Boolean).join(" ") || "to taste"}
                  </span>
                </li>
              ))}
            </ul>

            {plan.recipe.slug && (
              <div className="px-5 sm:px-6 pb-6">
                <Link to={`/recipe/${plan.recipe.slug}`} data-testid="meal-plan-view-recipe"
                  className="inline-flex items-center gap-2 font-bold text-coral hover:gap-3 transition-all">
                  View full recipe <ArrowRight size={17} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
