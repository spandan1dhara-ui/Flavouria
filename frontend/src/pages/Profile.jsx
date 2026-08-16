import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { RecipeCard } from "../components/RecipeCard";
import { RatingStars } from "../components/RatingStars";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SPICE = ["mild", "medium", "spicy"];
const DIETS = ["Vegetarian", "Non-Vegetarian", "Vegan", "Egg"];
const CUISINES = ["Indian", "Italian", "Chinese", "Japanese", "South Indian", "Dessert"];
const TIMES = [30, 45, 60, 90];

function Chip({ active, onClick, children, testid }) {
  return (
    <button onClick={onClick} data-testid={testid}
      className={`rounded-full px-3.5 py-1.5 text-sm font-bold border transition-colors capitalize ${
        active ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-border hover:border-coral"
      }`}>
      {children}
    </button>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [prefs, setPrefs] = useState(user?.preferences || {});
  const [ratings, setRatings] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setPrefs(user?.preferences || {});
    api.get("/my/ratings").then(({ data }) => setRatings(data.recipes)).catch(() => {});
  }, [user]);

  const toggleArr = (key, val) => {
    setPrefs((p) => {
      const arr = new Set(p[key] || []);
      arr.has(val) ? arr.delete(val) : arr.add(val);
      return { ...p, [key]: [...arr] };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/me/preferences", prefs);
      await refreshUser();
      toast.success("Preferences saved");
    } catch {
      toast.error("Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="rounded-3xl bg-white border border-border shadow-soft p-6 sm:p-8 flex items-center gap-5">
        {user?.picture ? (
          <img src={user.picture} alt="" className="w-20 h-20 rounded-2xl object-cover" />
        ) : (
          <span className="grid place-items-center w-20 h-20 rounded-2xl bg-coral text-white font-heading font-black text-3xl">
            {(user?.name || "U").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="font-heading text-3xl font-black text-ink">{user?.name}</h1>
          <p className="text-ink-soft">{user?.email}</p>
          <span className="inline-block mt-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink-soft">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Preferences */}
      <div className="mt-8 rounded-3xl bg-white border border-border shadow-soft p-6 sm:p-8">
        <h2 className="font-heading text-2xl font-black text-ink">Your taste preferences</h2>
        <p className="text-ink-soft mt-1">These will personalise your Top 3 in the future.</p>

        <div className="mt-6 space-y-6">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">Spice tolerance</p>
            <div className="flex flex-wrap gap-2">
              {SPICE.map((s) => (
                <Chip key={s} active={prefs.spice_tolerance === s} testid={`pref-spice-${s}`}
                  onClick={() => setPrefs((p) => ({ ...p, spice_tolerance: s }))}>{s}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">Dietary preferences</p>
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => (
                <Chip key={d} active={(prefs.dietary || []).includes(d)} testid={`pref-diet-${d}`}
                  onClick={() => toggleArr("dietary", d)}>{d}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">Preferred cuisines</p>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((c) => (
                <Chip key={c} active={(prefs.cuisines || []).includes(c)} testid={`pref-cuisine-${c}`}
                  onClick={() => toggleArr("cuisines", c)}>{c}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-ink-soft mb-2">Max cooking time</p>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <Chip key={t} active={prefs.max_cook_time === t} testid={`pref-time-${t}`}
                  onClick={() => setPrefs((p) => ({ ...p, max_cook_time: t }))}>{t} min</Chip>
              ))}
            </div>
          </div>
        </div>

        <button onClick={save} disabled={saving} data-testid="save-preferences"
          className="mt-6 h-12 px-6 rounded-full bg-coral hover:bg-coral-hover text-white font-bold transition-colors disabled:opacity-60">
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </div>

      {/* My ratings */}
      <div id="ratings" className="mt-8 scroll-mt-20">
        <h2 className="font-heading text-2xl font-black text-ink mb-4">My ratings</h2>
        {ratings.length === 0 ? (
          <p className="text-ink-soft">You haven't rated any recipes yet. <Link to="/" className="font-bold text-coral">Find something to cook →</Link></p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ratings.map((r) => (
              <div key={r.id} className="relative">
                <RecipeCard recipe={r} showSave={false} />
                <div className="mt-1.5 flex items-center gap-2 px-1">
                  <span className="text-sm font-bold text-ink">You:</span>
                  <RatingStars value={r.my_rating} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
