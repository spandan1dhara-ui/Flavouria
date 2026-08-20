import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Eye, ThumbsUp, Youtube, Sparkles, Lightbulb, Heart, ChefHat } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { CookMode } from "./CookMode";
import { toast } from "sonner";

const SENTIMENT = {
  positive: "bg-leaf/10 text-leaf",
  mixed: "bg-gold/15 text-amber-700",
  negative: "bg-coral/15 text-coral-hover",
};

const RANK = {
  1: { chip: "bg-gold text-ink", label: "1st", medal: "🥇", why: "Most popular right now" },
  2: { chip: "bg-slate-200 text-ink", label: "2nd", medal: "🥈", why: "Loved in the comments" },
  3: { chip: "bg-amber-700/15 text-amber-800", label: "3rd", medal: "🥉", why: "Trending & well-liked" },
};

function fmt(n) {
  n = Number(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function VideoCard({ v, index = 0, onSelect, initialSaved = false }) {
  const [play, setPlay] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [cookOpen, setCookOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const meta = RANK[v.rank] || RANK[3];

  const startPlay = () => {
    setPlay(true);
    onSelect?.(v.video_id);
  };

  const toggleSave = async () => {
    if (!user) {
      toast("Log in to save recipes");
      navigate("/login");
      return;
    }
    try {
      const { data } = await api.post("/youtube/save", { video: v });
      setSaved(data.saved);
      toast(data.saved ? "Saved to your collection" : "Removed from saved");
    } catch {
      toast.error("Could not update saved state");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      data-testid={`top-three-card-${v.rank}`}
      className="rounded-3xl bg-white border border-border shadow-soft hover:shadow-lift transition-shadow duration-300 overflow-hidden"
    >
      {/* Embedded video */}
      <div className="relative w-full aspect-video bg-ink">
        {play ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${v.video_id}?autoplay=1`}
            title={v.title}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button onClick={startPlay} data-testid={`play-video-button-${v.rank}`} className="group absolute inset-0 w-full h-full" aria-label="Play video">
            <img src={v.thumbnail} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
            <span className="absolute inset-0 bg-ink/25 group-hover:bg-ink/40 transition-colors" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-16 h-16 rounded-full bg-coral text-white shadow-lift group-hover:scale-110 transition-transform">
              <Play size={26} className="fill-white ml-1" />
            </span>
            <span className={`absolute top-3 left-3 grid place-items-center h-10 px-3 rounded-full font-heading font-black text-sm shadow-lift ${meta.chip}`}>
              <span className="flex items-center gap-1.5"><span className="text-lg leading-none">{meta.medal}</span> {meta.label}</span>
            </span>
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl sm:text-2xl font-black text-ink leading-tight">{v.title}</h3>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-bold text-ink">
            <Youtube size={15} className="text-coral" /> {v.channel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-bold text-ink-soft"><Eye size={13} /> {fmt(v.views)} views</span>
          {v.likes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-bold text-ink-soft"><ThumbsUp size={13} /> {fmt(v.likes)}</span>}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold capitalize ${SENTIMENT[v.sentiment] || SENTIMENT.positive}`}>{v.sentiment} vibes</span>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span data-testid={`why-its-here-${v.rank}`} className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 text-leaf px-3 py-1 text-xs font-bold">
            <Sparkles size={13} /> {meta.why}
          </span>
          <button onClick={toggleSave} data-testid={`yt-save-${v.rank}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-sm font-bold border transition-all ${saved ? "bg-coral/10 border-coral text-coral-hover" : "bg-white border-border text-ink hover:border-coral"}`}>
            <Heart size={15} className={saved ? "fill-coral text-coral" : ""} /> {saved ? "Saved" : "Save"}
          </button>
          {v.method?.length > 0 && (
            <button onClick={() => setCookOpen(true)} data-testid={`yt-cook-${v.rank}`}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-sm font-bold bg-ink text-white hover:bg-ink-soft transition-colors">
              <ChefHat size={15} /> Cook Mode
            </button>
          )}
        </div>

        {/* AI summary */}
        <div className="mt-4 rounded-2xl bg-coral/5 border border-coral/15 p-4">
          <p className="text-xs font-bold tracking-widest uppercase text-coral flex items-center gap-1.5 mb-1.5"><Sparkles size={13} /> AI summary</p>
          <p className="text-ink-soft leading-relaxed">{v.summary}</p>
        </div>

        {/* Ingredients (left) + Method (right) */}
        <div className="mt-5 grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
          <div>
            <h4 className="font-heading font-black text-ink mb-2">Ingredients</h4>
            {v.ingredients?.length ? (
              <ul className="rounded-2xl bg-white border border-border divide-y divide-border overflow-hidden" data-testid={`ingredient-list-${v.rank}`}>
                {v.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                    <span className="text-sm font-semibold text-ink">{ing}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-soft">Not detected.</p>}
          </div>
          <div>
            <h4 className="font-heading font-black text-ink mb-2">Method</h4>
            {v.method?.length ? (
              <ol className="flex flex-col gap-3" data-testid={`instruction-steps-${v.rank}`}>
                {v.method.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 grid place-items-center w-8 h-8 rounded-xl bg-ink text-white font-heading font-black text-sm">{String(i + 1).padStart(2, "0")}</span>
                    <p className="pt-1 text-sm text-ink leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-ink-soft">Not detected.</p>}
          </div>
        </div>

        {/* Tips */}
        {v.tips?.length > 0 && (
          <div className="mt-5">
            <h4 className="font-heading font-black text-ink mb-2 flex items-center gap-1.5"><Lightbulb size={16} className="text-gold" /> Notable tips from comments</h4>
            <ul className="flex flex-col gap-2">
              {v.tips.map((t, i) => (
                <li key={i} className="rounded-2xl bg-gold/5 border border-gold/20 px-4 py-2.5 text-sm text-ink-soft">{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <CookMode open={cookOpen} onClose={() => setCookOpen(false)} title={v.title} ingredients={v.ingredients || []} method={v.method || []} />
    </motion.div>
  );
}
