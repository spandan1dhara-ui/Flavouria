import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Scale, ChefHat, ArrowRight } from "lucide-react";
import { SearchBar } from "../components/SearchBar";

const STEPS = [
  { n: "01", icon: Search, t: "Search", d: "Tell us what you want to cook." },
  { n: "02", icon: Scale, t: "Compare", d: "We show the three strongest recipes." },
  { n: "03", icon: ChefHat, t: "Cook", d: "Pick one and start cooking." },
];

const POPULAR = ["Chicken Biryani", "Butter Chicken", "Momos", "Pasta", "Pizza", "Masala Dosa", "Chocolate Cake"];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-coral/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full bg-white border border-border px-4 py-1.5 text-sm font-bold text-ink-soft shadow-soft"
          >
            <span className="w-2 h-2 rounded-full bg-leaf" /> Stop scrolling. Start cooking.
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-ink leading-[1.05]"
          >
            What do you want to cook?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-4 text-lg sm:text-xl text-ink-soft font-medium"
          >
            We find the <span className="text-coral font-bold">3 recipes</span> worth your time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10"
          >
            <SearchBar autoFocus showExamples />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-coral">The Flavouria way</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-black text-ink">How Flavouria works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-3xl bg-white border border-border shadow-soft p-7 hover:shadow-lift hover:-translate-y-1 transition-all duration-300"
            >
              <span className="font-heading text-5xl font-black text-coral/15">{s.n}</span>
              <div className="grid place-items-center w-12 h-12 rounded-2xl bg-coral/10 text-coral my-4">
                <s.icon size={24} />
              </div>
              <h3 className="font-heading text-xl font-black text-ink">{s.t}</h3>
              <p className="text-ink-soft mt-1">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular searches */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <div className="rounded-[2rem] bg-ink text-white p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-coral/20 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="font-heading text-2xl sm:text-3xl font-black">People are cooking right now</h2>
            <p className="text-white/70 mt-2">Tap a dish to see its Top 3.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {POPULAR.map((p) => (
                <Link
                  key={p}
                  to={`/search?q=${encodeURIComponent(p)}`}
                  data-testid={`popular-${p.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-full bg-white/10 hover:bg-coral border border-white/15 hover:border-coral px-4 py-2 text-sm font-bold transition-colors"
                >
                  {p}
                </Link>
              ))}
            </div>
            <Link to="/categories" className="inline-flex items-center gap-2 mt-8 font-bold text-coral hover:gap-3 transition-all">
              Browse categories <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
