import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Eye, ThumbsUp, Youtube, Sparkles, Lightbulb, Loader2 } from "lucide-react";

const SENTIMENT = {
  positive: "bg-leaf/10 text-leaf",
  mixed: "bg-gold/15 text-amber-700",
  negative: "bg-coral/15 text-coral-hover",
};

function fmt(n) {
  n = Number(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const RANK = { 1: "🥇", 2: "🥈", 3: "🥉" };

function VideoCard({ v, index }) {
  const [play, setPlay] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      data-testid={`youtube-card-${v.rank}`}
      className="rounded-3xl bg-white border border-border shadow-soft overflow-hidden"
    >
      {/* Video */}
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
          <button onClick={() => setPlay(true)} data-testid={`youtube-play-${v.rank}`} className="group absolute inset-0 w-full h-full" aria-label="Play video">
            <img src={v.thumbnail} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
            <span className="absolute inset-0 bg-ink/25 group-hover:bg-ink/40 transition-colors" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-16 h-16 rounded-full bg-coral text-white shadow-lift group-hover:scale-110 transition-transform">
              <Play size={26} className="fill-white ml-1" />
            </span>
            <span className="absolute top-3 left-3 grid place-items-center h-9 px-3 rounded-full bg-white/90 backdrop-blur font-heading font-black text-sm text-ink">
              {RANK[v.rank]} #{v.rank}
            </span>
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <h3 className="font-heading text-xl font-black text-ink leading-tight">{v.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-bold text-ink">
            <Youtube size={15} className="text-coral" /> {v.channel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-bold text-ink-soft"><Eye size={13} /> {fmt(v.views)}</span>
          {v.likes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-bold text-ink-soft"><ThumbsUp size={13} /> {fmt(v.likes)}</span>}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold capitalize ${SENTIMENT[v.sentiment] || SENTIMENT.positive}`}>{v.sentiment} vibes</span>
        </div>

        {/* AI summary */}
        <div className="mt-4 rounded-2xl bg-coral/5 border border-coral/15 p-4">
          <p className="text-xs font-bold tracking-widest uppercase text-coral flex items-center gap-1.5 mb-1.5"><Sparkles size={13} /> AI summary</p>
          <p className="text-ink-soft leading-relaxed">{v.summary}</p>
        </div>

        {/* Ingredients + Method */}
        <div className="mt-5 grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
          <div>
            <h4 className="font-heading font-black text-ink mb-2">Ingredients</h4>
            {v.ingredients.length ? (
              <ul className="rounded-2xl bg-white border border-border divide-y divide-border overflow-hidden">
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
            {v.method.length ? (
              <ol className="flex flex-col gap-3">
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
    </motion.div>
  );
}

export function YouTubeResults({ videos, loading }) {
  return (
    <section className="mt-14 border-t border-border pt-10" data-testid="youtube-section">
      <div className="flex items-center gap-3 mb-2">
        <span className="grid place-items-center w-10 h-10 rounded-2xl bg-coral/10 text-coral"><Youtube size={22} /></span>
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-ink">Fresh from YouTube</h2>
          <p className="text-ink-soft text-sm">The 3 trending videos right now — ranked live by views, likes & comment sentiment.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-ink-soft" data-testid="youtube-loading">
          <Loader2 className="animate-spin text-coral mb-3" size={34} />
          <p className="font-semibold">Watching YouTube & summarizing with AI...</p>
        </div>
      ) : !videos || videos.length === 0 ? (
        <p className="text-ink-soft py-8">No live videos found for this dish right now.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {videos.map((v, i) => <VideoCard key={v.video_id} v={v} index={i} />)}
        </div>
      )}
    </section>
  );
}
