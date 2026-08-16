import React from "react";

export function LogoIcon({ size = 36, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Flavouria logo"
    >
      <path d="M33 12c6 4 7 12 1 18-5-6-4-14-1-18z" fill="#22C55E" />
      <rect x="8" y="27.5" width="48" height="6" rx="3" fill="#111827" />
      <path d="M12 33.5h40c0 11-9 19-20 19S12 44.5 12 33.5z" fill="#FF6B5E" />
      <path
        d="M20 15v9a3 3 0 006 0v-9"
        fill="none"
        stroke="#111827"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line x1="23" y1="24" x2="23" y2="30.5" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ onClick, className = "" }) {
  return (
    <div
      onClick={onClick}
      data-testid="brand-logo"
      className={`flex items-center gap-2 cursor-pointer select-none ${className}`}
    >
      <LogoIcon size={34} />
      <span className="font-heading font-black text-2xl tracking-tight text-ink lowercase">
        flavouria
      </span>
    </div>
  );
}
