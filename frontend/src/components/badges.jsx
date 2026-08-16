import React from "react";
import { Flame, Clock, Globe, Leaf, BarChart3, Egg } from "lucide-react";

const spiceStyles = {
  mild: "bg-leaf/10 text-leaf",
  medium: "bg-gold/15 text-amber-700",
  spicy: "bg-coral/15 text-coral-hover",
};

const dietStyles = {
  Vegetarian: "bg-leaf/10 text-leaf",
  Vegan: "bg-leaf/15 text-green-700",
  "Non-Vegetarian": "bg-coral/15 text-coral-hover",
  Egg: "bg-gold/15 text-amber-700",
};

function Pill({ children, className = "", testid }) {
  return (
    <span
      data-testid={testid}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

export function SpiceBadge({ level }) {
  const l = (level || "").toLowerCase();
  return (
    <Pill className={spiceStyles[l] || "bg-muted text-ink-soft"} testid={`spice-badge-${l}`}>
      <Flame size={13} /> {l.charAt(0).toUpperCase() + l.slice(1)}
    </Pill>
  );
}

export function TimeBadge({ minutes }) {
  return (
    <Pill className="bg-secondary text-ink-soft" testid="time-badge">
      <Clock size={13} /> {minutes} min
    </Pill>
  );
}

export function CuisineBadge({ cuisine, region }) {
  return (
    <Pill className="bg-secondary text-ink-soft" testid="cuisine-badge">
      <Globe size={13} /> {region || cuisine}
    </Pill>
  );
}

export function DietBadge({ diet }) {
  const Icon = diet === "Egg" ? Egg : Leaf;
  return (
    <Pill className={dietStyles[diet] || "bg-muted text-ink-soft"} testid="diet-badge">
      <Icon size={13} /> {diet}
    </Pill>
  );
}

export function DifficultyBadge({ level }) {
  return (
    <Pill className="bg-secondary text-ink-soft" testid="difficulty-badge">
      <BarChart3 size={13} /> {level}
    </Pill>
  );
}
