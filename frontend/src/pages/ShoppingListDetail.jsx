import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { api, formatError } from "../lib/api";
import { LoadingState, RecipeEmptyState } from "../components/states";
import { CookMode } from "../components/CookMode";
import { ShoppingCart, Users, Clock, ChefHat, Loader2, ArrowLeft, Copy } from "lucide-react";

const FRACTIONS = { 0.25: "1/4", 0.33: "1/3", 0.34: "1/3", 0.5: "1/2", 0.66: "2/3", 0.67: "2/3", 0.75: "3/4", 0.2: "1/5", 0.13: "1/8", 0.12: "1/8" };
const MASS_VOL = ["g", "gram", "grams", "ml", "kg", "l", "litre", "liter"];
function prettyQty(q) {
  if (!q) return q;
  const m = String(q).match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return q;
  const num = parseFloat(m[1]);
  const whole = Math.floor(num);
  const f = FRACTIONS[Number((num - whole).toFixed(2))];
  if (!f) return q;
  return (whole > 0 ? `${whole} ${f}` : f) + m[2];
}
// Round scaled amounts to something practical for a shopping list.
function formatShoppingQty(q, unit) {
  if (!q) return "";
  const num = parseFloat(q);
  if (isNaN(num)) return q;
  const u = (unit || "").toLowerCase();
  if (!unit) return String(Math.ceil(num)); // countable item -> whole number
  if (MASS_VOL.includes(u)) {
    // mL / g: show clean numbers, never fractions
    return num >= 10 ? String(Math.round(num)) : String(Math.round(num * 10) / 10);
  }
  return prettyQty(String(num)); // count units (cloves, pinch) keep friendly fractions
}

export default function ShoppingListDetail() {
  const { id } = useParams();
  const [list, setList] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [guide, setGuide] = useState(null);
  const [cookOpen, setCookOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/shopping-lists/${id}`)
      .then(({ data }) => { setList(data.list); setGuide(data.list.cooking_guide || null); })
      .catch(() => setNotFound(true));
  }, [id]);

  const startCooking = async () => {
    if (guide) { setCookOpen(true); return; }
    setCooking(true);
    try {
      const { data } = await api.post(`/shopping-lists/${id}/cooking-guide`);
      setGuide(data.cooking_guide);
      setCookOpen(true);
    } catch (err) {
      toast.error(formatError(err?.response?.data?.detail));
    } finally {
      setCooking(false);
    }
  };

  const copyList = async () => {
    if (!list) return;
    const lines = [
      `${list.name} — shopping list`, "",
      ...list.shopping_list.map((i) => `• ${[formatShoppingQty(i.quantity, i.unit), i.unit].filter(Boolean).join(" ")} ${i.name}`.trim()),
    ];
    try { await navigator.clipboard.writeText(lines.join("\n")); toast.success("Copied"); }
    catch { toast.error("Couldn't copy"); }
  };

  if (notFound) return <div className="max-w-3xl mx-auto px-4 py-16"><RecipeEmptyState title="List not found" subtitle="This shopping list doesn't exist or isn't yours." /></div>;
  if (!list) return <LoadingState label="Loading your list..." />;

  const ingredientStrings = list.shopping_list.map((i) => [formatShoppingQty(i.quantity, i.unit), i.unit, i.name].filter(Boolean).join(" "));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/profile#shopping-lists" data-testid="back-to-profile" className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-coral transition-colors">
        <ArrowLeft size={16} /> Back to profile
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-coral">Shopping list</p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-black text-ink" data-testid="list-name">{list.name}</h1>
        </div>
        <button data-testid="start-cooking-button" onClick={startCooking} disabled={cooking}
          className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-leaf hover:brightness-95 text-white font-black transition disabled:opacity-60">
          {cooking ? <Loader2 className="animate-spin" size={20} /> : <ChefHat size={20} />} Start Cooking
        </button>
      </div>

      {/* Recipes */}
      <div className="mt-6 flex flex-wrap gap-2" data-testid="list-recipes">
        {list.recipes.map((r) => (
          <div key={r.recipe_id} className="inline-flex items-center gap-2 rounded-full bg-white border border-border pl-1.5 pr-3.5 py-1.5">
            {r.thumbnail && <img src={r.thumbnail} alt="" className="w-7 h-7 rounded-full object-cover" />}
            <span className="text-sm font-bold text-ink">{r.title}</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-soft"><Users size={12} /> {r.pax}</span>
          </div>
        ))}
      </div>

      {/* Consolidated shopping list */}
      <div className="mt-6 rounded-3xl bg-white border border-border shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5">
          <h2 className="font-heading text-xl font-black text-ink flex items-center gap-2">
            <ShoppingCart size={20} className="text-coral" /> Everything you need
          </h2>
          <button onClick={copyList} data-testid="copy-list-button" className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-coral transition-colors">
            <Copy size={16} /> Copy
          </button>
        </div>
        <ul className="p-5 sm:p-6 pt-4 divide-y divide-border" data-testid="consolidated-ingredients">
          {list.shopping_list.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-3" data-testid={`consolidated-row-${i}`}>
              <span className="text-ink font-semibold">{item.name}</span>
              <span className="text-ink-soft font-bold whitespace-nowrap">{[formatShoppingQty(item.quantity, item.unit), item.unit].filter(Boolean).join(" ") || "to taste"}</span>
            </li>
          ))}
        </ul>
      </div>

      <CookMode open={cookOpen} onClose={() => setCookOpen(false)}
        title={guide?.total_time ? `${list.name} · ${guide.total_time}` : list.name}
        ingredients={ingredientStrings} method={guide?.steps || []} />
    </div>
  );
}
