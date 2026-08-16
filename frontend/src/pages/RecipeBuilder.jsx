import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Star } from "lucide-react";
import { api, formatError } from "../lib/api";
import { LoadingState } from "../components/states";
import { SpiceBadge, TimeBadge, CuisineBadge, DietBadge } from "../components/badges";
import { toast } from "sonner";

const STEPS = ["Basics", "Classify", "Timing", "Ingredients", "Method", "Video", "Preview"];
const CUISINES = ["Indian", "South Indian", "Bengali", "Italian", "Chinese", "Japanese", "Tibetan", "Mexican", "Dessert"];
const CATEGORIES = ["Biryani", "Curry", "Pasta", "Pizza", "Dumplings", "Breakfast", "Snack", "Rice", "Noodles", "Dessert"];
const DIETS = ["Vegetarian", "Non-Vegetarian", "Vegan", "Egg"];
const SPICES = ["mild", "medium", "spicy"];
const DIFFS = ["Easy", "Medium", "Advanced"];

const empty = {
  title: "", description: "", thumbnail: "", cuisine: "Indian", region: "", category: "Curry",
  diet: "Vegetarian", spice_level: "medium", difficulty: "Medium", prep_time: 15, cook_time: 30,
  servings: 4, tags: "", youtube_url: "",
  ingredients: [{ quantity: "", unit: "", name: "" }],
  instructions: [""],
};

function Field({ label, children }) {
  return <label className="block text-sm font-bold text-ink">{label}<div className="mt-1.5">{children}</div></label>;
}
const inputCls = "w-full h-12 rounded-xl border border-border px-4 outline-none focus:border-coral focus:ring-4 focus:ring-coral/10 font-medium bg-white";
const selectCls = inputCls;

export default function RecipeBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/recipes/id/${id}`).then(({ data }) => {
      setForm({
        ...empty, ...data,
        tags: (data.tags || []).join(", "),
        youtube_url: data.youtube_id ? `https://youtu.be/${data.youtube_id}` : "",
        ingredients: data.ingredients?.length ? data.ingredients : empty.ingredients,
        instructions: data.instructions?.length ? data.instructions : empty.instructions,
      });
    }).catch(() => toast.error("Could not load recipe")).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setIng = (i, k, v) => setForm((f) => ({ ...f, ingredients: f.ingredients.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }));
  const addIng = () => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { quantity: "", unit: "", name: "" }] }));
  const rmIng = (i) => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  const setStepText = (i, v) => setForm((f) => ({ ...f, instructions: f.instructions.map((x, idx) => idx === i ? v : x) }));
  const addStep = () => setForm((f) => ({ ...f, instructions: [...f.instructions, ""] }));
  const rmStep = (i) => setForm((f) => ({ ...f, instructions: f.instructions.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Recipe needs a title"); setStep(0); return; }
    setBusy(true);
    const payload = {
      ...form,
      prep_time: Number(form.prep_time) || 0,
      cook_time: Number(form.cook_time) || 0,
      servings: Number(form.servings) || 1,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      ingredients: form.ingredients.filter((i) => i.name.trim()),
      instructions: form.instructions.filter((s) => s.trim()),
    };
    try {
      if (id) {
        await api.put(`/recipes/${id}`, payload);
        toast.success("Recipe updated — sent for review");
      } else {
        await api.post("/recipes", payload);
        toast.success("Recipe submitted for review!");
      }
      navigate("/creator/dashboard");
    } catch (err) {
      toast.error(formatError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading recipe..." />;

  const preview = {
    ...form,
    rating_avg: form.rating_avg || 0,
    rating_count: form.rating_count || 0,
    ingredients: form.ingredients.filter((i) => i.name),
    thumbnail: form.thumbnail || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-heading text-3xl sm:text-4xl font-black text-ink">{id ? "Edit recipe" : "Create a recipe"}</h1>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} data-testid={`step-${s.toLowerCase()}`}
            className={`shrink-0 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
              i === step ? "bg-ink text-white" : i < step ? "bg-leaf/10 text-leaf" : "bg-white border border-border text-ink-soft"
            }`}>
            <span className="grid place-items-center w-5 h-5 rounded-full bg-white/20 text-xs">{i < step ? <Check size={12} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-white border border-border shadow-soft p-6 sm:p-8 space-y-5">
        {step === 0 && (
          <>
            <Field label="Recipe name"><input className={inputCls} data-testid="rb-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Spicy Hyderabadi Chicken Biryani" /></Field>
            <Field label="Description"><textarea rows={3} className={inputCls + " h-auto py-3"} data-testid="rb-description" value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Thumbnail image URL"><input className={inputCls} data-testid="rb-thumbnail" value={form.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} placeholder="https://..." /></Field>
            {form.thumbnail && <img src={form.thumbnail} alt="" className="w-full h-48 object-cover rounded-2xl border border-border" />}
          </>
        )}

        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Cuisine"><select className={selectCls} data-testid="rb-cuisine" value={form.cuisine} onChange={(e) => set("cuisine", e.target.value)}>{CUISINES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Region (e.g. Hyderabadi)"><input className={inputCls} data-testid="rb-region" value={form.region} onChange={(e) => set("region", e.target.value)} /></Field>
            <Field label="Category"><select className={selectCls} data-testid="rb-category" value={form.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Diet"><select className={selectCls} data-testid="rb-diet" value={form.diet} onChange={(e) => set("diet", e.target.value)}>{DIETS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Spice level"><select className={selectCls} data-testid="rb-spice" value={form.spice_level} onChange={(e) => set("spice_level", e.target.value)}>{SPICES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Difficulty"><select className={selectCls} data-testid="rb-difficulty" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>{DIFFS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="Tags (comma-separated)"><input className={inputCls} data-testid="rb-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="biryani, chicken, spicy" /></Field></div>
          </div>
        )}

        {step === 2 && (
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Prep time (min)"><input type="number" className={inputCls} data-testid="rb-prep" value={form.prep_time} onChange={(e) => set("prep_time", e.target.value)} /></Field>
            <Field label="Cook time (min)"><input type="number" className={inputCls} data-testid="rb-cook" value={form.cook_time} onChange={(e) => set("cook_time", e.target.value)} /></Field>
            <Field label="Servings"><input type="number" className={inputCls} data-testid="rb-servings" value={form.servings} onChange={(e) => set("servings", e.target.value)} /></Field>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 text-xs font-bold uppercase tracking-wide text-ink-soft px-1 mb-2">
              <span>Qty</span><span>Unit</span><span>Ingredient</span><span></span>
            </div>
            <div className="space-y-2">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2">
                  <input className={inputCls} data-testid={`rb-ing-qty-${i}`} value={ing.quantity} onChange={(e) => setIng(i, "quantity", e.target.value)} placeholder="500" />
                  <input className={inputCls} data-testid={`rb-ing-unit-${i}`} value={ing.unit} onChange={(e) => setIng(i, "unit", e.target.value)} placeholder="g" />
                  <input className={inputCls} data-testid={`rb-ing-name-${i}`} value={ing.name} onChange={(e) => setIng(i, "name", e.target.value)} placeholder="Chicken" />
                  <button onClick={() => rmIng(i)} className="grid place-items-center w-12 rounded-xl border border-border hover:text-coral hover:border-coral"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={addIng} data-testid="rb-add-ingredient" className="mt-3 inline-flex items-center gap-2 font-bold text-coral"><Plus size={16} /> Add ingredient</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="space-y-3">
              {form.instructions.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-ink text-white font-heading font-black">{String(i + 1).padStart(2, "0")}</span>
                  <textarea rows={2} className={inputCls + " h-auto py-3"} data-testid={`rb-step-${i}`} value={s} onChange={(e) => setStepText(i, e.target.value)} placeholder="Describe this step..." />
                  <button onClick={() => rmStep(i)} className="grid place-items-center w-12 rounded-xl border border-border hover:text-coral hover:border-coral shrink-0"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={addStep} data-testid="rb-add-step" className="mt-3 inline-flex items-center gap-2 font-bold text-coral"><Plus size={16} /> Add step</button>
          </div>
        )}

        {step === 5 && (
          <Field label="YouTube video URL"><input className={inputCls} data-testid="rb-youtube" value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." /></Field>
        )}

        {step === 6 && (
          <div>
            <p className="text-sm text-ink-soft mb-4">This is how your recipe will appear.</p>
            <div className="rounded-3xl border border-border overflow-hidden">
              <img src={preview.thumbnail} alt="" className="w-full h-52 object-cover" />
              <div className="p-5 space-y-3">
                <h3 className="font-heading text-2xl font-black text-ink">{preview.title || "Untitled recipe"}</h3>
                <div className="flex items-center gap-1 text-amber-700 font-bold"><Star size={15} className="fill-gold text-gold" /> {preview.rating_avg} · new</div>
                <div className="flex flex-wrap gap-2">
                  <SpiceBadge level={preview.spice_level} /><TimeBadge minutes={preview.cook_time} /><DietBadge diet={preview.diet} /><CuisineBadge cuisine={preview.cuisine} region={preview.region} />
                </div>
                <p className="text-ink-soft">{preview.description}</p>
                <p className="text-sm text-ink-soft"><b>{preview.ingredients.length}</b> ingredients · <b>{form.instructions.filter(Boolean).length}</b> steps</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="inline-flex items-center gap-2 h-12 px-5 rounded-full border border-border bg-white font-bold text-ink disabled:opacity-40 hover:border-coral transition-colors">
          <ChevronLeft size={18} /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} data-testid="rb-next"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ink text-white font-bold hover:bg-ink-soft transition-colors">
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={submit} disabled={busy} data-testid="rb-submit"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-coral hover:bg-coral-hover text-white font-bold transition-colors disabled:opacity-60">
            {busy ? "Submitting..." : "Submit Recipe"}
          </button>
        )}
      </div>
    </div>
  );
}
