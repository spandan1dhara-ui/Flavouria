import React, { useEffect, useState } from "react";
import { Users, ChefHat, Utensils, Clock, Star, Search as SearchIcon, TrendingUp, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { LoadingState } from "../components/states";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { toast } from "sonner";

const STATUSES = ["PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"];

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl bg-white border border-border shadow-soft p-5">
      <Icon size={18} className={accent || "text-coral"} />
      <p className="font-heading text-3xl font-black text-ink mt-2">{value}</p>
      <p className="text-sm text-ink-soft font-semibold">{label}</p>
    </div>
  );
}

function Moderation() {
  const [status, setStatus] = useState("PENDING");
  const [recipes, setRecipes] = useState(null);

  const load = (s) => { setRecipes(null); api.get(`/admin/recipes?status=${s}`).then(({ data }) => setRecipes(data.recipes)); };
  useEffect(() => { load(status); }, [status]);

  const moderate = async (id, newStatus) => {
    const note = newStatus === "REJECTED" ? prompt("Reason for rejection (optional):") || "" : "";
    try {
      await api.post(`/admin/recipes/${id}/moderate`, { status: newStatus, note });
      toast.success(`Recipe ${newStatus.toLowerCase()}`);
      load(status);
    } catch { toast.error("Action failed"); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} data-testid={`admin-status-${s}`}
            className={`rounded-full px-4 py-2 text-sm font-bold border transition-colors ${status === s ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-border hover:border-coral"}`}>{s}</button>
        ))}
      </div>
      {recipes === null ? <LoadingState label="Loading recipes..." /> : recipes.length === 0 ? (
        <p className="text-ink-soft py-10 text-center">No {status.toLowerCase()} recipes.</p>
      ) : (
        <div className="rounded-3xl bg-white border border-border shadow-soft divide-y divide-border overflow-hidden">
          {recipes.map((r) => (
            <div key={r.id} data-testid={`admin-recipe-${r.slug}`} className="flex items-center gap-4 p-4">
              <img src={r.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-black text-ink truncate">{r.title}</p>
                <p className="text-xs text-ink-soft">{r.creator?.display_name} · {r.cuisine} · {r.spice_level}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {r.status !== "PUBLISHED" && <button onClick={() => moderate(r.id, "PUBLISHED")} data-testid={`approve-${r.slug}`} className="rounded-full px-3 py-1.5 text-sm font-bold bg-leaf/10 text-leaf hover:bg-leaf/20">Approve</button>}
                {r.status !== "REJECTED" && <button onClick={() => moderate(r.id, "REJECTED")} data-testid={`reject-${r.slug}`} className="rounded-full px-3 py-1.5 text-sm font-bold bg-coral/10 text-coral-hover hover:bg-coral/20">Reject</button>}
                {r.status !== "ARCHIVED" && <button onClick={() => moderate(r.id, "ARCHIVED")} className="rounded-full px-3 py-1.5 text-sm font-bold bg-secondary text-ink-soft hover:bg-border">Archive</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreatorsTab() {
  const [creators, setCreators] = useState(null);
  useEffect(() => { api.get("/admin/creators").then(({ data }) => setCreators(data.creators)); }, []);
  if (!creators) return <LoadingState label="Loading creators..." />;
  return (
    <div className="rounded-3xl bg-white border border-border shadow-soft divide-y divide-border overflow-hidden">
      {creators.map((c) => (
        <div key={c.id} className="flex items-center gap-4 p-4">
          <img src={c.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
          <div className="flex-1"><p className="font-heading font-black text-ink">{c.display_name}</p><p className="text-xs text-ink-soft">{c.recipe_count} recipes · ★ {c.rating_avg}</p></div>
          <span className="text-sm font-bold text-ink-soft">{Number(c.rating_count).toLocaleString()} ratings</span>
        </div>
      ))}
    </div>
  );
}

function DemandTab() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/searches").then(({ data }) => setData(data)); }, []);
  if (!data) return <LoadingState label="Loading demand..." />;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-heading font-black text-ink mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-coral" /> Zero-result searches</h3>
        <div className="rounded-3xl bg-white border border-border shadow-soft p-4 space-y-2 min-h-[100px]">
          {data.zero_result.length === 0 ? <p className="text-ink-soft text-sm">None — every search found matches.</p> :
            data.zero_result.map((s, i) => <p key={i} className="font-semibold text-ink">"{s.query}"</p>)}
        </div>
      </div>
      <div>
        <h3 className="font-heading font-black text-ink mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-leaf" /> Suggested dishes</h3>
        <div className="rounded-3xl bg-white border border-border shadow-soft p-4 space-y-2 min-h-[100px]">
          {data.suggestions.length === 0 ? <p className="text-ink-soft text-sm">No suggestions yet.</p> :
            data.suggestions.map((s, i) => <p key={i} className="font-semibold text-ink">"{s.query}"</p>)}
        </div>
      </div>
    </div>
  );
}

function RankingTab() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.get("/admin/ranking-config").then(({ data }) => setCfg(data)); }, []);
  const save = async () => {
    try { await api.put("/admin/ranking-config", { weights: cfg.weights }); toast.success("Ranking weights updated"); }
    catch { toast.error("Could not save"); }
  };
  if (!cfg) return <LoadingState label="Loading config..." />;
  const total = Object.values(cfg.weights).reduce((a, b) => a + Number(b), 0);
  return (
    <div className="rounded-3xl bg-white border border-border shadow-soft p-6 max-w-xl">
      <h3 className="font-heading font-black text-ink text-lg">Flavouria Score weights</h3>
      <p className="text-sm text-ink-soft mb-4">Tune how the Top 3 is ranked. The Top 3 is earned, never sold.</p>
      {Object.entries(cfg.weights).map(([k, v]) => (
        <div key={k} className="mb-4">
          <div className="flex justify-between text-sm font-bold text-ink capitalize"><span>{k.replace(/_/g, " ")}</span><span>{Math.round(v * 100)}%</span></div>
          <input type="range" min="0" max="1" step="0.05" value={v} data-testid={`weight-${k}`}
            onChange={(e) => setCfg((c) => ({ ...c, weights: { ...c.weights, [k]: Number(e.target.value) } }))}
            className="w-full accent-coral" />
        </div>
      ))}
      <p className={`text-sm font-bold ${Math.abs(total - 1) < 0.01 ? "text-leaf" : "text-coral-hover"}`}>Total: {Math.round(total * 100)}%</p>
      <button onClick={save} data-testid="save-weights" className="mt-3 h-11 px-6 rounded-full bg-coral hover:bg-coral-hover text-white font-bold transition-colors">Save weights</button>
    </div>
  );
}

export default function Admin() {
  const [ov, setOv] = useState(null);
  useEffect(() => { window.scrollTo(0, 0); api.get("/admin/overview").then(({ data }) => setOv(data)); }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-heading text-4xl font-black text-ink">Admin dashboard</h1>
      <p className="text-ink-soft mt-1">Moderate content, monitor demand and protect the Top 3.</p>

      {/* North star */}
      {ov && (
        <div className="mt-6 rounded-3xl bg-ink text-white p-6 sm:p-8 flex items-center justify-between flex-wrap gap-4" data-testid="north-star">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-white/60">North star metric</p>
            <h2 className="font-heading text-2xl font-black mt-1">Recipe Selection Rate</h2>
            <p className="text-white/70 mt-1 text-sm">Searches where a user picked a Top-3 recipe.</p>
          </div>
          <div className="text-right">
            <p className="font-heading text-6xl font-black text-coral">{ov.selection_rate}%</p>
            <p className="text-white/70 text-sm">{ov.total_searches} total searches</p>
          </div>
        </div>
      )}

      {ov ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Stat icon={Users} label="Total users" value={ov.total_users} />
          <Stat icon={ChefHat} label="Creators" value={ov.total_creators} />
          <Stat icon={Utensils} label="Recipes" value={ov.total_recipes} />
          <Stat icon={Clock} label="Pending review" value={ov.pending_recipes} accent="text-amber-600" />
          <Stat icon={Star} label="Total ratings" value={Number(ov.total_ratings).toLocaleString()} />
          <Stat icon={SearchIcon} label="Searches today" value={ov.searches_today} />
          <Stat icon={AlertTriangle} label="Zero-result searches" value={ov.zero_result_searches} accent="text-coral" />
          <Stat icon={Utensils} label="Published" value={ov.published_recipes} accent="text-leaf" />
        </div>
      ) : <LoadingState />}

      <div className="mt-10">
        <Tabs defaultValue="moderation">
          <TabsList className="bg-white border border-border rounded-full p-1 flex-wrap h-auto">
            <TabsTrigger value="moderation" data-testid="tab-moderation" className="rounded-full">Recipe moderation</TabsTrigger>
            <TabsTrigger value="creators" data-testid="tab-creators" className="rounded-full">Creators</TabsTrigger>
            <TabsTrigger value="demand" data-testid="tab-demand" className="rounded-full">Demand</TabsTrigger>
            <TabsTrigger value="ranking" data-testid="tab-ranking" className="rounded-full">Ranking</TabsTrigger>
          </TabsList>
          <TabsContent value="moderation" className="mt-6"><Moderation /></TabsContent>
          <TabsContent value="creators" className="mt-6"><CreatorsTab /></TabsContent>
          <TabsContent value="demand" className="mt-6"><DemandTab /></TabsContent>
          <TabsContent value="ranking" className="mt-6"><RankingTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
