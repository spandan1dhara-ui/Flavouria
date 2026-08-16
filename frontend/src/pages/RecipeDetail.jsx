import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Star, Users, Clock, Timer, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { SpiceBadge, TimeBadge, CuisineBadge, DietBadge, DifficultyBadge } from "../components/badges";
import { RatingInput, RatingCount } from "../components/RatingStars";
import { CreatorBadge } from "../components/CreatorBadge";
import { SaveButton } from "../components/SaveButton";
import { RecipeVideo } from "../components/RecipeVideo";
import { LoadingState, RecipeEmptyState } from "../components/states";
import { toast } from "sonner";

function Schema({ r }) {
  useEffect(() => {
    if (!r) return;
    const data = {
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: r.title,
      description: r.description,
      image: [r.thumbnail],
      author: { "@type": "Person", name: r.creator?.display_name },
      recipeCuisine: r.cuisine,
      totalTime: `PT${(r.prep_time || 0) + (r.cook_time || 0)}M`,
      recipeIngredient: (r.ingredients || []).map((i) => `${i.quantity || ""} ${i.unit || ""} ${i.name}`.trim()),
      recipeInstructions: (r.instructions || []).map((s) => ({ "@type": "HowToStep", text: s })),
      aggregateRating: { "@type": "AggregateRating", ratingValue: r.rating_avg, ratingCount: r.rating_count },
    };
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = JSON.stringify(data);
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, [r]);
  return null;
}

export default function RecipeDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    api
      .get(`/recipes/${slug}`)
      .then(({ data }) => {
        setR(data);
        setMyRating(data.my_rating || 0);
        if (window.location.hash === "#video") {
          setTimeout(() => document.getElementById("video")?.scrollIntoView({ behavior: "smooth" }), 300);
        }
      })
      .catch(() => setR(false))
      .finally(() => setLoading(false));
  }, [slug]);

  const rate = async (value) => {
    if (!user) {
      toast("Log in to rate this recipe");
      navigate("/login");
      return;
    }
    try {
      const { data } = await api.post(`/recipes/${r.id}/rate`, { value });
      setMyRating(value);
      setR((prev) => ({ ...prev, rating_avg: data.rating_avg, rating_count: data.rating_count }));
      toast.success("Thanks for rating!");
    } catch {
      toast.error("Could not submit rating");
    }
  };

  if (loading) return <LoadingState label="Loading recipe..." />;
  if (!r) return <div className="py-16"><RecipeEmptyState title="Recipe not found" subtitle="It may have been removed or unpublished." /></div>;

  return (
    <div className="pb-10">
      <Schema r={r} />

      {/* Hero image */}
      <div className="relative h-[46vh] max-h-[520px] w-full overflow-hidden">
        <img src={r.thumbnail} alt={r.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute top-4 left-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-4 h-10 font-bold text-ink shadow-soft hover:scale-105 transition-transform" data-testid="back-button">
            <ArrowLeft size={17} /> Back
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-3">
              <SpiceBadge level={r.spice_level} />
              <CuisineBadge cuisine={r.cuisine} region={r.region} />
              <DietBadge diet={r.diet} />
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black text-white leading-tight drop-shadow">
              {r.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 relative">
        {/* Meta card */}
        <div className="rounded-3xl bg-white border border-border shadow-lift p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <CreatorBadge creator={r.creator} size="lg" />
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-lg font-black text-ink">
                <Star size={18} className="fill-gold text-gold" /> {r.rating_avg}
              </span>
              <RatingCount count={r.rating_count} />
            </div>
          </div>
          <SaveButton recipeId={r.id} initialSaved={r.is_saved} variant="full" />
        </div>

        <p className="mt-6 text-lg text-ink-soft leading-relaxed">{r.description}</p>

        {/* Quick metadata */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Timer, label: "Prep", value: `${r.prep_time} min` },
            { icon: Clock, label: "Cook", value: `${r.cook_time} min` },
            { icon: Users, label: "Servings", value: r.servings },
            { icon: Star, label: "Difficulty", value: r.difficulty },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-white border border-border p-4 text-center">
              <m.icon size={18} className="mx-auto text-coral mb-1.5" />
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{m.label}</p>
              <p className="font-heading font-black text-ink">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Video */}
        {r.youtube_id && (
          <div id="video" className="mt-10 scroll-mt-20">
            <h2 className="font-heading text-2xl font-black text-ink mb-4">Watch it made</h2>
            <RecipeVideo youtubeId={r.youtube_id} title={r.title} />
          </div>
        )}

        {/* Ingredients + Instructions */}
        <div className="mt-10 grid lg:grid-cols-[0.9fr_1.1fr] gap-8">
          <div>
            <h2 className="font-heading text-2xl font-black text-ink mb-4">Ingredients</h2>
            <ul className="rounded-3xl bg-white border border-border shadow-soft divide-y divide-border overflow-hidden" data-testid="ingredient-list">
              {(r.ingredients || []).map((ing, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                  <span className="font-semibold text-ink">
                    {[ing.quantity, ing.unit].filter(Boolean).join(" ")} {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-2xl font-black text-ink mb-4">Method</h2>
            <ol className="flex flex-col gap-4" data-testid="instruction-steps">
              {(r.instructions || []).map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-ink text-white font-heading font-black">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="pt-1.5 text-ink leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Rating */}
        <div className="mt-12 rounded-3xl bg-white border border-border shadow-soft p-8 text-center" data-testid="rate-section">
          <h2 className="font-heading text-2xl font-black text-ink">How was this recipe?</h2>
          <p className="text-ink-soft mt-1">{user ? "Tap a star to rate." : "Log in to leave a rating."}</p>
          <div className="mt-5 flex justify-center">
            <RatingInput value={myRating} onRate={rate} />
          </div>
          {myRating > 0 && <p className="mt-3 text-sm font-bold text-leaf">You rated this {myRating} ★</p>}
        </div>

        <div className="mt-12 text-center">
          <Link to="/categories" className="font-bold text-coral hover:underline">Explore more recipes →</Link>
        </div>
      </div>
    </div>
  );
}
