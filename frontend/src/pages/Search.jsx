import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { SearchBar } from "../components/SearchBar";
import { VideoCard } from "../components/YouTubeResults";
import { RecipeCard } from "../components/RecipeCard";
import { SearchSkeletons } from "../components/SkeletonCard";
import { SearchEmptyState } from "../components/states";
import { toast } from "sonner";

const PAGE = 6;

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const raw = params.get("raw") || "";
  const corrected = raw && raw.toLowerCase() !== query.toLowerCase() ? query : null;
  const { user } = useAuth();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  const [moreOpen, setMoreOpen] = useState(false);
  const [more, setMore] = useState([]);
  const [moreTotal, setMoreTotal] = useState(0);
  const [moreLoading, setMoreLoading] = useState(false);

  useEffect(() => {
    let active = true;
    window.scrollTo(0, 0);
    setLoading(true);
    setVideos([]);
    setMoreOpen(false);
    setMore([]);
    api.get(`/search?q=${encodeURIComponent(query)}`).then(({ data }) => { if (active) setSearchId(data.search_id); }).catch(() => {});
    if (user) api.get("/youtube/saved").then(({ data }) => { if (active) setSavedIds(new Set((data.videos || []).map((v) => v.video_id))); }).catch(() => {});
    (async () => {
      try {
        const { data } = await api.get(`/youtube?q=${encodeURIComponent(query)}`);
        if (active) setVideos(data.videos || []);
      } catch {
        if (active) setVideos([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [query, user]);

  const onSelect = (videoId) => {
    api.post("/search/select", { search_id: searchId, recipe_id: videoId }).catch(() => {});
  };

  const loadMore = async (reset = false) => {
    setMoreLoading(true);
    try {
      const skip = reset ? 0 : more.length;
      const { data } = await api.get(`/explore?q=${encodeURIComponent(query)}&skip=${skip}&limit=${PAGE}`);
      setMoreTotal(data.total);
      setMore((prev) => (reset ? data.recipes : [...prev, ...data.recipes]));
    } catch {
      toast.error("Could not load more recipes");
    } finally {
      setMoreLoading(false);
    }
  };

  const openMore = () => {
    setMoreOpen(true);
    if (more.length === 0) loadMore(true);
  };

  const suggest = async () => {
    try {
      await api.post("/suggest-dish", { query });
      toast.success("Thanks! We'll get creators cooking this.");
    } catch {
      toast.error("Could not submit suggestion");
    }
  };

  const count = videos.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <SearchBar initial={query} size="md" showExamples={false} />
      </div>

      <div className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-ink capitalize">{query}</h1>
        {corrected && (
          <p data-testid="fuzzy-correction-note" className="text-sm text-ink-soft mt-1">
            Showing results for <span className="font-bold text-coral capitalize">{query}</span>
            {" "}· searched for "<span className="capitalize">{raw}</span>"
          </p>
        )}
        {!loading && count >= 1 && <p className="text-ink-soft mt-1 font-medium">The {count === 1 ? "1 recipe" : `${count} recipes`} worth trying</p>}
      </div>

      {loading ? (
        <SearchSkeletons />
      ) : count === 0 ? (
        <SearchEmptyState query={query} onSuggest={suggest} />
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {videos.map((v, i) => (
              <VideoCard key={v.video_id} v={v} index={i} onSelect={onSelect} initialSaved={savedIds.has(v.video_id)} />
            ))}
          </div>

          {/* More Recipes */}
          <div className="mt-12 border-t border-border pt-10">
            {!moreOpen ? (
              <div className="text-center">
                <button onClick={openMore} data-testid="more-recipes-toggle"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-border hover:border-coral px-7 h-13 py-3 font-bold text-ink transition-colors">
                  More Recipes <ChevronDown size={18} />
                </button>
                <p className="text-sm text-ink-soft mt-3">See what our community creators have cooked for "{query}".</p>
              </div>
            ) : (
              <div data-testid="more-recipes-section">
                <h2 className="font-heading text-2xl font-black text-ink mb-4">More recipes to explore</h2>
                {moreLoading && more.length === 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-64 rounded-3xl skeleton" />)}
                  </div>
                ) : more.length === 0 ? (
                  <p className="text-ink-soft">No community recipes for this dish yet — try the videos above.</p>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {more.map((r) => <RecipeCard key={r.id} recipe={r} />)}
                    </div>
                    {more.length < moreTotal && (
                      <div className="text-center mt-8">
                        <button onClick={() => loadMore(false)} disabled={moreLoading} data-testid="load-more"
                          className="inline-flex items-center gap-2 rounded-full bg-coral hover:bg-coral-hover text-white px-7 h-12 font-bold transition-colors disabled:opacity-60">
                          {moreLoading ? <><Loader2 size={17} className="animate-spin" /> Loading...</> : <>Load more ({moreTotal - more.length} left)</>}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
