"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { getCampaign, updateCampaign, type Campaign } from "@/lib/store";
import { checkForSpam } from "@/lib/spamCheck";

export default function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string; oppId: string }>;
}) {
  const { id, oppId } = use(params);
  const draftIdx = parseInt(oppId, 10);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editedComment, setEditedComment] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const c = getCampaign(id);
    if (c) {
      setCampaign(c);
      const sd = c.savedDrafts[draftIdx];
      if (sd) setEditedComment(sd.editedComment);
    }
    setLoaded(true);
  }, [id, draftIdx]);

  function handleSave() {
    if (!campaign) return;
    const drafts = [...campaign.savedDrafts];
    drafts[draftIdx] = { ...drafts[draftIdx], editedComment };
    const updated = updateCampaign(id, { savedDrafts: drafts });
    if (updated) setCampaign(updated);
  }

  function handleCopy() {
    navigator.clipboard.writeText(editedComment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!loaded) return <div className="text-muted py-12">Loading...</div>;
  if (!campaign) return <div className="text-muted py-12">Campaign not found</div>;

  const sd = campaign.savedDrafts[draftIdx];
  if (!sd) return <div className="text-muted py-12">Draft not found</div>;

  const spamFlags = checkForSpam(editedComment);

  return (
    <div className="animate-fade-up">
      <Link
        href={`/campaigns/${id}`}
        className="text-xs font-medium tracking-[0.15em] uppercase text-muted hover:text-accent transition-colors"
      >
        ← Back to {campaign.brandName}
      </Link>

      {/* Thread header */}
      <div className="mt-6 mb-8 pb-6 border-b-2 border-foreground">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-3">
          <span className="text-accent">r/{sd.thread.subreddit}</span>
          <span className="mx-2 opacity-40">·</span>
          {sd.thread.score} pts
          <span className="mx-2 opacity-40">·</span>
          {sd.thread.numComments} comments
        </p>
        <h1 className="font-display text-3xl md:text-4xl leading-snug mb-5">{sd.thread.title}</h1>
        <a
          href={sd.thread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold tracking-wide uppercase transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="10"/>
            <path fill="white" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 1-.97 1 1 0 0 0-.96.68l-2.38-.5a.27.27 0 0 0-.32.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .68-1.11zm-9.4 1.06a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.63a3.42 3.42 0 0 1-2.85.66 3.42 3.42 0 0 1-2.85-.66.23.23 0 0 1 .33-.33 2.97 2.97 0 0 0 2.52.49 2.97 2.97 0 0 0 2.52-.49.23.23 0 0 1 .33.33zm-.22-1.63a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/>
          </svg>
          Open on Reddit
        </a>
      </div>

      {/* Thread snippet */}
      {sd.thread.selftextSnippet && (
        <div className="border border-border bg-card p-5 mb-5">
          <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Thread Body</span>
          <p className="text-sm mt-2 leading-relaxed">{sd.thread.selftextSnippet}</p>
        </div>
      )}

      {/* Draft metadata */}
      <div className="border border-border bg-card p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div>
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Why this will work</span>
            <p className="mt-2">{sd.draft.whyThisWillWork}</p>
          </div>
          <div>
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Promotion strength</span>
            <p className="mt-2">
              <span className={`text-xs font-medium px-2 py-0.5 ${
                sd.draft.promotionStrength === "soft"
                  ? "bg-success/10 text-success"
                  : sd.draft.promotionStrength === "medium"
                  ? "bg-warning/10 text-warning"
                  : "bg-red-500/10 text-red-500"
              }`}>
                {sd.draft.promotionStrength}
              </span>
            </p>
          </div>
          {sd.draft.mustAvoid.length > 0 && (
            <div>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Must avoid</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sd.draft.mustAvoid.map((a, i) => (
                  <span key={i} className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5">{a}</span>
                ))}
              </div>
            </div>
          )}
          {sd.draft.disclosureLine && (
            <div>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Disclosure line</span>
              <p className="mt-2 text-xs italic">{sd.draft.disclosureLine}</p>
            </div>
          )}
        </div>
      </div>

      {/* Spam warning */}
      {spamFlags.length > 0 && (
        <div className="border border-red-500/30 bg-red-500/5 p-4 mb-5 animate-slide-in">
          <p className="text-sm font-medium text-red-500">
            Spam phrases detected: &ldquo;{spamFlags.join('", "')}&rdquo;
          </p>
          <p className="text-xs text-red-400 mt-1">
            Edit the comment below before posting.
          </p>
        </div>
      )}

      {/* Editable comment */}
      <div className="border border-border bg-card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Comment (editable)</span>
          <button onClick={handleCopy} className="text-xs text-accent hover:underline font-medium">
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
        <textarea
          value={editedComment}
          onChange={(e) => setEditedComment(e.target.value)}
          rows={10}
          className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors resize-y font-mono"
        />
        <div className="flex gap-3 mt-4 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            className="bg-accent text-white px-6 py-2.5 text-xs font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={handleCopy}
            className="px-6 py-2.5 text-xs font-medium tracking-widest uppercase border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all duration-150"
          >
            {copied ? "Copied!" : "Copy Comment"}
          </button>
        </div>
      </div>

      {/* Follow-ups */}
      {sd.draft.followUps.length > 0 && (
        <div className="border border-border bg-card p-5">
          <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted">Prepared Follow-ups</span>
          <div className="space-y-3 mt-3">
            {sd.draft.followUps.map((f, i) => (
              <div key={i} className="bg-foreground/5 p-4">
                <p className="text-sm font-mono">{f}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(f)}
                  className="text-xs text-accent hover:underline mt-2 font-medium"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
