import React, { useState } from "react";
import { Play } from "lucide-react";

export function RecipeVideo({ youtubeId, title }) {
  const [play, setPlay] = useState(false);
  if (!youtubeId) return null;

  const thumb = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

  return (
    <div
      className="relative w-full aspect-video rounded-3xl overflow-hidden bg-ink shadow-soft"
      data-testid="recipe-video"
    >
      {play ? (
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          title={title || "Recipe video"}
          allow="accelerator-fps; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          onClick={() => setPlay(true)}
          data-testid="play-video-button"
          className="group absolute inset-0 w-full h-full"
          aria-label="Play recipe video"
        >
          <img
            src={thumb}
            alt={title ? `${title} video` : "Recipe video"}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.opacity = 0.3)}
          />
          <span className="absolute inset-0 bg-ink/30 group-hover:bg-ink/40 transition-colors" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-16 h-16 rounded-full bg-coral text-white shadow-lift group-hover:scale-110 transition-transform">
            <Play size={26} className="fill-white ml-1" />
          </span>
        </button>
      )}
    </div>
  );
}
