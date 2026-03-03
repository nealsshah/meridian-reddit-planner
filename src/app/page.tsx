"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCampaigns, deleteCampaign, type Campaign } from "@/lib/store";

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCampaigns(getCampaigns());
    setLoaded(true);
  }, []);

  function handleDelete(id: string) {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    deleteCampaign(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  if (!loaded) {
    return <div className="text-muted py-12">Loading...</div>;
  }

  return (
    <div>
      {/* Masthead */}
      <div className="mb-10 pb-6 border-b-2 border-foreground animate-fade-up">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">
          {campaigns.length === 0
            ? "No campaigns"
            : `${campaigns.length} Campaign${campaigns.length !== 1 ? "s" : ""}`}
        </p>
        <h1 className="font-display text-5xl md:text-6xl">All Campaigns</h1>
      </div>

      {campaigns.length === 0 ? (
        <div className="py-20 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="text-6xl mb-8 text-accent animate-float select-none">◊</div>
          <h2 className="font-display text-3xl mb-3">Nothing here yet</h2>
          <p className="text-muted text-sm mb-8 max-w-sm">
            Create your first campaign and let the AI find real Reddit threads worth joining.
          </p>
          <Link
            href="/campaigns/new"
            className="inline-block bg-accent text-white px-6 py-3 text-sm font-medium tracking-wide uppercase hover:bg-accent-hover transition-colors"
          >
            Create Campaign
          </Link>
        </div>
      ) : (
        <div>
          {campaigns.map((c, idx) => (
            <div
              key={c.id}
              className="flex items-center border-b border-border group animate-fade-up"
              style={{ animationDelay: `${80 + idx * 60}ms` }}
            >
              <Link
                href={`/campaigns/${c.id}`}
                className="flex items-baseline justify-between flex-1 py-7 px-2 -mx-2 hover:bg-foreground/[0.025] transition-colors min-w-0"
              >
                <div className="min-w-0 mr-8">
                  <h2 className="font-display text-3xl md:text-4xl group-hover:text-accent transition-colors leading-none mb-2">
                    {c.brandName}
                  </h2>
                  <p className="text-xs tracking-[0.18em] uppercase text-muted">
                    {c.category}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">
                      {c.savedDrafts?.length ?? 0} draft{(c.savedDrafts?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className="text-accent text-xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-0 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(c.id)}
                className="ml-4 shrink-0 text-xs font-medium tracking-wider uppercase text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
