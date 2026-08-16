import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Eye, Award } from "lucide-react";
import { api, formatError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import { toast } from "sonner";

const PERKS = [
  { icon: TrendingUp, t: "Get discovered", d: "Your recipes surface when people search for exactly what you cook." },
  { icon: Award, t: "Build reputation", d: "Earn ratings and Top-3 appearances that compound over time." },
  { icon: Eye, t: "Real analytics", d: "See views, ratings and how often you land in the Top 3." },
];

export default function CreatorLanding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  const isCreator = user && (user.role === "creator" || user.role === "admin");

  const apply = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/creator/apply", { display_name: name, bio });
      await refreshUser();
      toast.success("You're a creator now!");
      setOpen(false);
      navigate("/creator/dashboard");
    } catch (err) {
      toast.error(formatError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const cta = () => {
    if (!user) { navigate("/login"); return; }
    if (isCreator) { navigate("/creator/dashboard"); return; }
    setOpen(true);
  };

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-coral/10 blur-3xl" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-coral">For creators</p>
          <h1 className="mt-4 font-heading text-4xl sm:text-6xl font-black text-ink leading-[1.05]">
            Your recipe deserves to be discovered.
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-ink-soft max-w-2xl mx-auto">
            Publish your recipes on Flavouria and let people find them when they're looking for what you cook.
          </p>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                onClick={cta}
                data-testid="become-creator-cta"
                className="mt-8 inline-flex items-center h-14 px-8 rounded-full bg-coral hover:bg-coral-hover text-white font-bold text-lg transition-colors shadow-lift"
              >
                {isCreator ? "Go to your dashboard" : "Become a Creator"}
              </button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-black">Set up your creator profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={apply} className="flex flex-col gap-4 mt-2">
                <label className="text-sm font-bold text-ink">
                  Display name
                  <input required value={name} onChange={(e) => setName(e.target.value)} data-testid="creator-name-input"
                    className="mt-1.5 w-full h-12 rounded-xl border border-border px-4 outline-none focus:border-coral focus:ring-4 focus:ring-coral/10 font-medium" />
                </label>
                <label className="text-sm font-bold text-ink">
                  Bio
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} data-testid="creator-bio-input"
                    placeholder="What kind of food do you cook?"
                    className="mt-1.5 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-coral focus:ring-4 focus:ring-coral/10 font-medium" />
                </label>
                <button type="submit" disabled={busy} data-testid="creator-apply-submit"
                  className="h-12 rounded-full bg-coral hover:bg-coral-hover text-white font-bold transition-colors disabled:opacity-60">
                  {busy ? "Setting up..." : "Create profile"}
                </button>
              </form>
            </DialogContent>
          </Dialog>

          <p className="mt-4 text-sm text-ink-soft">No minimum recipes required. Aim for 4–5 quality recipes a month.</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-3 gap-4">
        {PERKS.map((p, i) => (
          <motion.div key={p.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="rounded-3xl bg-white border border-border shadow-soft p-7">
            <div className="grid place-items-center w-12 h-12 rounded-2xl bg-coral/10 text-coral mb-4"><p.icon size={22} /></div>
            <h3 className="font-heading text-xl font-black text-ink">{p.t}</h3>
            <p className="text-ink-soft mt-1">{p.d}</p>
          </motion.div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <div className="rounded-3xl bg-ink text-white p-8 sm:p-10">
          <h2 className="font-heading text-2xl font-black">The Top 3 is earned, never sold.</h2>
          <p className="text-white/70 mt-2 max-w-2xl">
            Placement comes from relevance, quality, ratings and trust — so great recipes rise no matter
            how big your following is.
          </p>
          <ul className="mt-5 grid sm:grid-cols-2 gap-2">
            {["Ratings & confidence", "Search relevance", "Recipe completeness", "Creator reliability"].map((x) => (
              <li key={x} className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18} className="text-leaf" /> {x}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
