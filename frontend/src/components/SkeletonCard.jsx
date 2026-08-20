import React from "react";

export function SkeletonCard() {
  return (
    <div className="rounded-3xl bg-white border border-border shadow-soft overflow-hidden" data-testid="skeleton-card">
      <div className="w-full aspect-video skeleton" />
      <div className="p-5 sm:p-6 space-y-4">
        <div className="h-7 w-3/4 rounded-lg skeleton" />
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full skeleton" />
          <div className="h-6 w-20 rounded-full skeleton" />
          <div className="h-6 w-24 rounded-full skeleton" />
        </div>
        <div className="h-20 w-full rounded-2xl skeleton" />
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="h-5 w-28 rounded skeleton" />
            <div className="h-24 w-full rounded-2xl skeleton" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-24 rounded skeleton" />
            <div className="h-24 w-full rounded-2xl skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchSkeletons() {
  return (
    <div className="flex flex-col gap-6" data-testid="search-skeletons">
      {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
    </div>
  );
}
