import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { RecipeCard } from "../components/RecipeCard";
import { VideoCard } from "../components/YouTubeResults";
import { LoadingState, RecipeEmptyState } from "../components/states";
import { Link } from "react-router-dom";

export default function Saved() {
  const [recipes, setRecipes] = useState(null);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get("/saved").then(({ data }) => setRecipes(data.recipes)).catch(() => setRecipes([]));
    api.get("/youtube/saved").then(({ data }) => setVideos(data.videos || [])).catch(() => setVideos([]));
  }, []);

  if (recipes === null) return <LoadingState label="Loading your saved recipes..." />;

  const empty = recipes.length === 0 && videos.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-heading text-4xl font-black text-ink">Saved recipes</h1>
      <p className="text-ink-soft mt-2">Your personal collection to cook later.</p>

      {empty ? (
        <div className="mt-8">
          <RecipeEmptyState title="Nothing saved yet" subtitle="Tap Save on any recipe or YouTube result to keep it here." />
          <div className="text-center">
            <Link to="/" className="font-bold text-coral hover:underline">Start searching →</Link>
          </div>
        </div>
      ) : (
        <>
          {videos.length > 0 && (
            <section className="mt-8">
              <h2 className="font-heading text-2xl font-black text-ink mb-4">Saved from YouTube</h2>
              <div className="flex flex-col gap-6">
                {videos.map((v, i) => <VideoCard key={v.video_id} v={v} index={i} initialSaved />)}
              </div>
            </section>
          )}
          {recipes.length > 0 && (
            <section className="mt-10">
              <h2 className="font-heading text-2xl font-black text-ink mb-4">Community recipes</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
