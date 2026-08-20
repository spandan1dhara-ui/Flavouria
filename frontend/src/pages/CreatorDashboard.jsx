import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Utensils, Star, Eye, Award, Pencil, Trash2, MessageSquareWarning, Search, Mail, Share2 } from "lucide-react";
import { api } from "../lib/api";
import { LoadingState } from "../components/states";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";

const STATUS_STYLE = {
  PUBLISHED: "bg-leaf/10 text-leaf",
  PENDING: "bg-gold/15 text-amber-700",
  REJECTED: "bg-coral/15 text-coral-hover",
  DRAFT: "bg-secondary text-ink-soft",
  ARCHIVED: "bg-secondary text-ink-soft",
};

export default function CreatorDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const shareUrl = (r) => `${window.location.origin}/recipe/${r.slug}`;
  const shareEmail = (r) => { window.location.href = `mailto:?subject=${encodeURIComponent(r.title + " · Flavouria")}&body=${encodeURIComponent("Check out my recipe on Flavouria:\n" + shareUrl(r))}`; };
  const shareWhatsApp = (r) => { window.open(`https://wa.me/?text=${encodeURIComponent(r.title + " · " + shareUrl(r))}`, "_blank"); };

  const load = () => api.get("/creator/dashboard").then(({ data }) => setData(data)).catch(() => setData(false));

  useEffect(() => { window.scrollTo(0, 0); load(); }, []);

  const del = async (id) => {
    try {
      await api.delete(`/recipes/${id}`);
      toast.success("Recipe deleted");
      load();
    } catch {
      toast.error("Could not delete recipe");
    }
  };

  if (data === null) return <LoadingState label="Loading your dashboard..." />;
  if (!data) return <div className="py-16 text-center text-ink-soft">Create a creator profile first. <Link to="/creator" className="text-coral font-bold">Become a creator →</Link></div>;

  const { creator, stats, recipes } = data;
  const filtered = recipes.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
  const cards = [
    { icon: Utensils, label: "Recipes published", value: stats.recipes_published },
    { icon: Award, label: "Total ratings", value: Number(stats.total_ratings).toLocaleString() },
    { icon: Star, label: "Average rating", value: stats.average_rating },
    { icon: Eye, label: "Recipe views", value: Number(stats.recipe_views).toLocaleString() },
    { icon: Award, label: "Top-3 appearances", value: stats.top3_appearances },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <img src={creator.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border border-border" />
          <div>
            <h1 className="font-heading text-3xl font-black text-ink">{creator.display_name}</h1>
            <Link to={`/creator/${creator.slug}`} className="text-sm font-bold text-coral hover:underline">View public profile →</Link>
          </div>
        </div>
        <button onClick={() => navigate("/creator/recipes/new")} data-testid="new-recipe-button"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-hover text-white font-bold transition-colors">
          <Plus size={18} /> New recipe
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="dashboard-stats">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white border border-border shadow-soft p-5">
            <c.icon size={18} className="text-coral mb-2" />
            <p className="font-heading text-3xl font-black text-ink">{c.value}</p>
            <p className="text-sm text-ink-soft font-semibold mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 mb-4 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-heading text-2xl font-black text-ink">Your recipes</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="creator-recipe-search" placeholder="Search your recipes..."
            className="h-11 w-64 max-w-full rounded-full border border-border bg-white pl-9 pr-4 outline-none focus:border-coral focus:ring-4 focus:ring-coral/10 font-medium text-sm" />
        </div>
      </div>
      <div className="rounded-3xl bg-white border border-border shadow-soft overflow-hidden">
        {recipes.length === 0 ? (
          <div className="p-10 text-center text-ink-soft">No recipes yet. Publish your first one!</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-ink-soft">No recipes match "{q}".</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} data-testid={`dashboard-recipe-${r.slug}`} className="flex items-center gap-4 p-4">
                <img src={r.thumbnail} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-black text-ink truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                    <span className="text-xs text-ink-soft">★ {r.rating_avg} · {Number(r.rating_count).toLocaleString()} · {Number(r.views).toLocaleString()} views</span>
                  </div>
                  {r.status === "REJECTED" && r.moderation_note && (
                    <p className="text-xs text-coral-hover mt-1 flex items-center gap-1"><MessageSquareWarning size={13} /> {r.moderation_note}</p>
                  )}
                </div>
                <button onClick={() => shareWhatsApp(r)} data-testid={`share-whatsapp-${r.slug}`} title="Share on WhatsApp"
                  className="grid place-items-center w-10 h-10 rounded-full border border-border hover:border-leaf hover:text-leaf transition-colors">
                  <Share2 size={16} />
                </button>
                <button onClick={() => shareEmail(r)} data-testid={`share-email-${r.slug}`} title="Share via email"
                  className="grid place-items-center w-10 h-10 rounded-full border border-border hover:border-coral hover:text-coral transition-colors">
                  <Mail size={16} />
                </button>
                <button onClick={() => navigate(`/creator/recipes/${r.id}/edit`)} data-testid={`edit-recipe-${r.slug}`}
                  className="grid place-items-center w-10 h-10 rounded-full border border-border hover:border-coral hover:text-coral transition-colors">
                  <Pencil size={16} />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button data-testid={`delete-recipe-${r.slug}`} className="grid place-items-center w-10 h-10 rounded-full border border-border hover:border-coral hover:text-coral transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
                      <AlertDialogDescription>This can't be undone. "{r.title}" will be removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => del(r.id)} className="bg-coral hover:bg-coral-hover">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
