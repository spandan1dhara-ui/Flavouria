import React from "react";
import { SearchBar } from "../components/SearchBar";
import { Search, Scale, ChefHat } from "lucide-react";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <p className="text-xs font-bold tracking-widest uppercase text-coral">About Flavouria</p>
      <h1 className="mt-3 font-heading text-4xl sm:text-5xl font-black text-ink leading-tight">
        We don't sell the Top 3. It's earned.
      </h1>
      <p className="mt-5 text-lg text-ink-soft leading-relaxed">
        Every other recipe site buries you under hundreds of near-identical results. Flavouria does
        the opposite: you tell us what you want to cook, and we hand you the three recipes worth your
        time — ranked by real ratings, rating confidence, relevance, completeness and trust.
      </p>

      <div className="mt-10 grid sm:grid-cols-3 gap-4">
        {[
          { icon: Search, t: "Search", d: "Tell us what you want to cook." },
          { icon: Scale, t: "Compare", d: "We show the three strongest recipes." },
          { icon: ChefHat, t: "Cook", d: "Pick one and start cooking." },
        ].map((s) => (
          <div key={s.t} className="rounded-3xl bg-white border border-border shadow-soft p-6">
            <div className="grid place-items-center w-11 h-11 rounded-2xl bg-coral/10 text-coral mb-4">
              <s.icon size={22} />
            </div>
            <h3 className="font-heading font-black text-ink text-lg">{s.t}</h3>
            <p className="text-ink-soft mt-1">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <SearchBar showExamples />
      </div>
    </div>
  );
}
