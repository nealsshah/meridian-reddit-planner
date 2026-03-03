"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, use } from "react";
import { getCampaign, type Campaign } from "@/lib/store";
import { WorkflowBoard } from "@/components/workflows/WorkflowBoard";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    const c = getCampaign(id);
    if (c) setCampaign(c);
  }, [id]);

  useEffect(() => {
    reload();
    setLoaded(true);
  }, [reload]);

  if (!loaded) return <div className="text-muted py-12">Loading campaign...</div>;
  if (!campaign) return <div className="text-muted py-12">Campaign not found. <Link href="/" className="text-accent hover:underline">Back to all campaigns</Link></div>;

  const hasDrafts = campaign.savedDrafts.length > 0;

  return (
    <div>
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors mb-8 animate-fade-up"
      >
        &larr; All Campaigns
      </Link>

      {/* Header */}
      <div className="mb-10 pb-6 border-b-2 border-foreground animate-fade-up">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">
          {campaign.category}
          <span className="mx-2 opacity-40">&middot;</span>
          <span className="capitalize">{campaign.promotionStrength}</span> promotion
          <span className="mx-2 opacity-40">&middot;</span>
          Disclosure: {campaign.disclosurePolicy}
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-5xl md:text-7xl leading-none">{campaign.brandName}</h1>
          {hasDrafts && (
            <Link
              href={`/campaigns/${id}/export`}
              className="shrink-0 border border-border px-4 py-2 text-xs font-medium tracking-widest uppercase hover:border-foreground hover:bg-foreground hover:text-background transition-all duration-150 mb-1"
            >
              Export
            </Link>
          )}
        </div>
      </div>

      {/* Objective */}
      {campaign.objective && (
        <div className="border border-border bg-card p-5 mb-8 animate-fade-up" style={{ animationDelay: "50ms" }}>
          <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Objective</span>
          <p className="text-sm mt-2 leading-relaxed">{campaign.objective}</p>
        </div>
      )}

      {/* Campaign inputs */}
      <div className="border border-border bg-card p-5 mb-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Goal Prompts</span>
            <ul className="mt-2 space-y-1">
              {campaign.goalPrompts.split("\n").filter(Boolean).map((p, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-accent select-none">&loz;</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          {campaign.targetSubs && (
            <div>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Target Subreddits</span>
              <ul className="mt-2 space-y-1">
                {campaign.targetSubs.split("\n").filter(Boolean).map((s, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-accent select-none">&loz;</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Workflow — everything lives here now */}
      <WorkflowBoard campaign={campaign} onCampaignUpdate={setCampaign} />
    </div>
  );
}
