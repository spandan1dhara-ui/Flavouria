import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Play, Sparkles } from "lucide-react";
import { SpiceBadge, TimeBadge, CuisineBadge, DietBadge } from "./badges";
import { RatingCount } from "./RatingStars";
import { CreatorBadge } from "./CreatorBadge";
import { SaveButton } from "./SaveButton";

const RANK = {
  1: { ring: "ring-gold", chip: "bg-gold text-ink", label: "1st", medal: "🥇" },
  2: { ring: "ring-slate-300", chip: "bg-slate-200 text-ink", label: "2nd", medal: "🥈" },
  3: { ring: "ring-amber-700/40", chip: "bg-amber-700/15 text-amber-800", label: "3rd", medal: "🥉" },
};

export function TopThreeCard({ recipe, rank, onSelect, index = 0 }) {
  const r = recipe;
  const meta = RANK[rank] || RANK[3];
  const ingredients = (r.ingredients || []).slice(0, 5).map((i) => i.name).join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      data-testid={`top-three-card-${rank}`}
      className="group relative rounded-3xl bg-white border border-border shadow-soft hover:shadow-lift transition-shadow duration-300 overflow-hidden"
    >
      <div className="grid md:grid-cols-[300px_1fr]">
        {/* Image */}
        <div className="relative h-56 md:h-full min-h-[220px] overflow-hidden">
          <img
            src={r.thumbnail}
            alt={r.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span
              className={`grid place-items-center h-11 rounded-full px-3 font-heading font-black text-sm shadow-lift ${meta.chip}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{meta.medal}</span> {meta.label}
              </span>
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <SaveButton recipeId={r.id} initialSaved={r.is_saved} />
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-xl sm:text-2xl font-black text-ink leading-tight">
              {r.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-sm font-bold text-amber-700">
              <Star size={15} className="fill-gold text-gold" /> {r.rating_avg}
            </span>
            <RatingCount count={r.rating_count} />
          </div>

          <div className="flex flex-wrap gap-2">
            <SpiceBadge level={r.spice_level} />
            <TimeBadge minutes={r.cook_time} />
            <DietBadge diet={r.diet} />
            <CuisineBadge cuisine={r.cuisine} region={r.region} />
          </div>

          {ingredients && (
            <p className="text-sm text-ink-soft line-clamp-1">
              <span className="font-semibold text-ink">Ingredients:</span> {ingredients}...
            </p>
          )}

          <div className="flex items-center justify-between gap-3 mt-auto pt-2">
            <CreatorBadge creator={r.creator} />
            {r.why_its_here && (
              <span
                data-testid={`why-its-here-${rank}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 text-leaf px-3 py-1 text-xs font-bold"
              >
                <Sparkles size={13} /> {r.why_its_here}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Link
              to={`/recipe/${r.slug}`}
              onClick={() => onSelect?.(r.id)}
              data-testid={`view-recipe-button-${rank}`}
              className="flex-1 text-center rounded-full bg-coral hover:bg-coral-hover text-white font-bold h-12 grid place-items-center transition-colors"
            >
              View Recipe
            </Link>
            {r.youtube_id && (
              <Link
                to={`/recipe/${r.slug}#video`}
                onClick={() => onSelect?.(r.id)}
                data-testid={`watch-video-button-${rank}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white hover:border-coral text-ink font-bold h-12 px-4 transition-colors"
              >
                <Play size={16} /> Video
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
