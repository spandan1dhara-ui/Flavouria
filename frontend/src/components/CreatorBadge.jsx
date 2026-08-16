import React from "react";
import { Link } from "react-router-dom";

export function CreatorBadge({ creator, size = "sm" }) {
  if (!creator) return null;
  const dim = size === "lg" ? "w-11 h-11" : "w-8 h-8";
  return (
    <Link
      to={`/creator/${creator.slug}`}
      onClick={(e) => e.stopPropagation()}
      data-testid="creator-badge"
      className="inline-flex items-center gap-2 group"
    >
      <img
        src={creator.avatar}
        alt={creator.display_name}
        loading="lazy"
        className={`${dim} rounded-full object-cover border border-border`}
      />
      <span className="text-sm font-bold text-ink group-hover:text-coral transition-colors">
        {creator.display_name}
      </span>
    </Link>
  );
}
