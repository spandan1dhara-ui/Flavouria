import React, { useState } from "react";
import { Star } from "lucide-react";

export function RatingStars({ value = 0, size = 16, className = "" }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} data-testid="rating-stars">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            size={size}
            className={filled ? "fill-gold text-gold" : "text-slate-300"}
          />
        );
      })}
    </div>
  );
}

export function RatingInput({ value = 0, onRate, size = 30, disabled = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="inline-flex items-center gap-1.5" data-testid="rating-input">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            data-testid={`rate-star-${n}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onRate?.(n)}
            className="transition-transform duration-150 hover:scale-125 disabled:opacity-60"
            aria-label={`Rate ${n} stars`}
          >
            <Star
              size={size}
              className={active ? "fill-gold text-gold" : "text-slate-300"}
            />
          </button>
        );
      })}
    </div>
  );
}

export function RatingCount({ count, className = "" }) {
  return (
    <span className={`text-sm text-ink-soft ${className}`} data-testid="rating-count">
      {Number(count || 0).toLocaleString()} ratings
    </span>
  );
}
