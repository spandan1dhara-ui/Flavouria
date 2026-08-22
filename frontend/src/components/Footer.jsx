import React from "react";
import { Link } from "react-router-dom";
import { LogoIcon } from "./Logo";
import { useAuth } from "../context/AuthContext";

export function Footer() {
  const { user } = useAuth();
  return (
    <footer id="about" className="mt-24 border-t border-border/60 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <LogoIcon size={30} />
            <span className="font-heading font-black text-xl lowercase text-ink">flavouria</span>
          </div>
          <p className="mt-4 text-ink-soft max-w-sm leading-relaxed">
            Flavouria doesn't drown you in hundreds of results. We surface the 3 recipes worth your
            time — earned through ratings, trust and quality, never sold.
          </p>
          <p className="mt-4 text-xs font-bold tracking-widest uppercase text-ink-soft/70">
            Stop scrolling. Start cooking.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-black text-ink mb-4">Explore</h4>
          <ul className="space-y-2 text-ink-soft font-semibold">
            <li><Link to="/" className="hover:text-coral">Discover</Link></li>
            <li><Link to="/categories" className="hover:text-coral">Categories</Link></li>
            <li><Link to="/plan-meal" className="hover:text-coral">Plan your Meal</Link></li>
            <li><Link to="/search?q=chicken+biryani" className="hover:text-coral">Popular searches</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-black text-ink mb-4">Creators</h4>
          <ul className="space-y-2 text-ink-soft font-semibold">
            <li><Link to="/creator" className="hover:text-coral">Become a Creator</Link></li>
            <li><Link to="/creator/dashboard" className="hover:text-coral">Creator dashboard</Link></li>
            {!user && <li><Link to="/login" className="hover:text-coral">Log in</Link></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-sm text-ink-soft">
        © {new Date().getFullYear()} Flavouria · The 3 recipes worth your time.
      </div>
    </footer>
  );
}
