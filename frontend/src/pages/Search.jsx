import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { SearchBar } from "../components/SearchBar";
import { VideoCard } from "../components/YouTubeResults";
import { LoadingState, SearchEmptyState } from "../components/states";
import { toast } from "sonner";

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const raw = params.get("raw") || "";
  const corrected = raw && raw.toLowerCase() !== query.toLowerCase() ? query : null;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState(null);

  useEffect(() => {
    let active = true;
    window.scrollTo(0, 0);
    setLoading(true);
    setVideos([]);
    // Fire-and-forget community search: logs the search event (demand + north-star) and gives us a search_id.
    api
      .get(`/search?q=${encodeURIComponent(query)}`)
      .then(({ data }) => { if (active) setSearchId(data.search_id); })
      .catch(() => {});

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
  }, [query]);

  const onSelect = (videoId) => {
    api.post("/search/select", { search_id: searchId, recipe_id: videoId }).catch(() => {});
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
        {!loading && count === 3 && <p className="text-ink-soft mt-1 font-medium">The 3 recipes worth trying</p>}
        {!loading && count === 2 && <p className="text-ink-soft mt-1 font-medium">We found 2 great matches.</p>}
        {!loading && count === 1 && <p className="text-ink-soft mt-1 font-medium">We found 1 great match.</p>}
      </div>

      {loading ? (
        <LoadingState label="Finding the 3 recipes worth your time..." />
      ) : count === 0 ? (
        <SearchEmptyState query={query} onSuggest={suggest} />
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {videos.map((v, i) => (
              <VideoCard key={v.video_id} v={v} index={i} onSelect={onSelect} />
            ))}
          </div>

          <div className="mt-12 text-center border-t border-border pt-10">
            <p className="text-ink-soft font-medium">Didn't find what you're looking for?</p>
            <Link
              to="/categories"
              data-testid="explore-more"
              className="inline-flex items-center gap-2 mt-2 font-bold text-coral hover:gap-3 transition-all"
            >
              Explore more recipes <ArrowRight size={18} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
