"use client";

import { useState } from "react";
import Link from "next/link";
import type { Campaign, SavedDraft } from "@/lib/store";
import { updateCampaign } from "@/lib/store";
import type { CitationResult, Brief } from "@/lib/plans/citationValidators";
import type { GeneratedArticle } from "@/lib/plans/articleValidators";
import { checkForSpam } from "@/lib/spamCheck";
import { checkUnsafePhrases } from "@/lib/citationSafety";
import { markdownToHtml } from "@/lib/markdownToHtml";

function CopyBtn({ text, label, onClick }: { text?: string; label: string; onClick?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        if (text) navigator.clipboard.writeText(text);
        if (onClick) onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase transition-colors ${
        copied ? "bg-success/10 text-success" : "bg-foreground/5 hover:bg-foreground/10 text-muted"
      }`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Reddit Drafts Result ──

export function RedditDraftsResult({ campaign }: { campaign: Campaign }) {
  const drafts = campaign.savedDrafts;
  if (!drafts || drafts.length === 0) return null;

  return (
    <div className="space-y-3">
      {drafts.map((sd, idx) => (
        <RedditDraftCard key={idx} sd={sd} idx={idx} campaignId={campaign.id} />
      ))}
    </div>
  );
}

function RedditDraftCard({ sd, idx, campaignId }: { sd: SavedDraft; idx: number; campaignId: string }) {
  const spamFlags = checkForSpam(sd.editedComment);

  return (
    <div className="border border-border bg-background overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="font-medium text-sm line-clamp-2">{sd.thread.title}</p>
            <div className="flex items-center gap-3 text-xs text-muted mt-1">
              <span className="text-accent font-medium">r/{sd.thread.subreddit}</span>
              <span>{sd.thread.score} pts</span>
              <span>{sd.thread.numComments} comments</span>
              <span>{timeAgo(sd.thread.createdUtc)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/campaigns/${campaignId}/opportunities/${idx}`}
              className="text-[10px] font-medium tracking-wider uppercase text-accent hover:underline"
            >
              Edit
            </Link>
            <a
              href={sd.thread.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium tracking-wider uppercase text-accent hover:underline"
            >
              Open on Reddit
            </a>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        {spamFlags.length > 0 && (
          <div className="border border-red-500/30 bg-red-500/5 px-3 py-2 mb-2">
            <p className="text-[10px] font-medium text-red-500">
              Spam triggers: &ldquo;{spamFlags.join('", "')}&rdquo; — edit before posting
            </p>
          </div>
        )}
        <p className="text-[10px] text-muted italic mb-2">{sd.draft.whyThisWillWork}</p>
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed bg-foreground/[0.02] p-3 border border-border/50">
          {sd.editedComment}
        </pre>
        {sd.draft.disclosureLine && (
          <p className="text-[10px] text-muted mt-2 italic">{sd.draft.disclosureLine}</p>
        )}
        <div className="mt-2">
          <CopyBtn text={sd.editedComment} label="Copy comment" />
        </div>
      </div>
    </div>
  );
}

// ── Citation Analysis Result ──

export function CitationAnalysisResult({
  campaign,
  onCampaignUpdate,
}: {
  campaign: Campaign;
  onCampaignUpdate: (c: Campaign) => void;
}) {
  const results = campaign.citationResults ? Object.values(campaign.citationResults) : [];
  if (results.length === 0) return null;

  const allBriefText = results
    .flatMap((r) => r.briefs)
    .map((b) => `${b.briefTitle} ${b.whatToProve} ${b.outline.join(" ")}`)
    .join(" ");
  const unsafePhrases = checkUnsafePhrases(allBriefText);

  return (
    <div className="space-y-4">
      {unsafePhrases.length > 0 && (
        <div className="border border-warning/30 bg-warning/5 px-3 py-2">
          <p className="text-[10px] font-medium text-warning">
            Briefs contain risky claims: {unsafePhrases.join(", ")}
          </p>
        </div>
      )}

      {results.map((result, rIdx) => (
        <CitationPromptBlock
          key={rIdx}
          result={result}
          campaign={campaign}
          onCampaignUpdate={onCampaignUpdate}
        />
      ))}
    </div>
  );
}

function CitationPromptBlock({
  result,
  campaign,
  onCampaignUpdate,
}: {
  result: CitationResult;
  campaign: Campaign;
  onCampaignUpdate: (c: Campaign) => void;
}) {
  const [showCitations, setShowCitations] = useState(false);

  return (
    <div className="border border-border bg-background p-4">
      <h4 className="text-sm font-medium mb-2">&ldquo;{result.prompt}&rdquo;</h4>

      <p className="text-xs text-muted mb-3">{result.answerSummary}</p>

      {result.topPicks && result.topPicks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {result.topPicks.map((pick, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent">
              {pick}
            </span>
          ))}
        </div>
      )}

      {result.citations.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="text-[10px] font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors"
          >
            {showCitations ? "Hide" : "Show"} {result.citations.length} citations
          </button>
          {showCitations && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5 pr-3 font-medium text-muted">Domain</th>
                    <th className="py-1.5 pr-3 font-medium text-muted">Role</th>
                    <th className="py-1.5 pr-3 font-medium text-muted">Relevance</th>
                    <th className="py-1.5 font-medium text-muted">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {result.citations.map((c, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 text-accent">{c.domain}</td>
                      <td className="py-1.5 pr-3">{c.citationRole}</td>
                      <td className="py-1.5 pr-3">{c.relevanceToBrand}</td>
                      <td className="py-1.5">
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          Link
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {result.gaps && result.gaps.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Content Gaps</p>
          <ul className="space-y-0.5">
            {result.gaps.map((gap, i) => (
              <li key={i} className="text-xs flex gap-1.5">
                <span className="text-accent select-none">◊</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.briefs.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-2">Content Briefs</p>
          <div className="space-y-2">
            {result.briefs.map((brief, i) => (
              <BriefCard
                key={i}
                brief={brief}
                campaign={campaign}
                citationUrls={result.citations.map((c) => c.url)}
                existingArticle={campaign.generatedArticles?.[brief.briefTitle]}
                onArticleGenerated={(article) => {
                  const articles = { ...campaign.generatedArticles, [brief.briefTitle]: article };
                  const updated = updateCampaign(campaign.id, { generatedArticles: articles });
                  if (updated) onCampaignUpdate(updated);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BriefCard({
  brief,
  campaign,
  citationUrls,
  existingArticle,
  onArticleGenerated,
}: {
  brief: Brief;
  campaign: Campaign;
  citationUrls: string[];
  existingArticle?: GeneratedArticle;
  onArticleGenerated: (article: GeneratedArticle) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showArticle, setShowArticle] = useState(false);

  async function handleGenerateArticle() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: campaign.brandName,
          brandDomain: campaign.brandDomain,
          category: campaign.category,
          brief,
          citationUrls,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Article generation failed");
      }
      const article: GeneratedArticle = await res.json();
      onArticleGenerated(article);
      setShowArticle(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not generate article.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="border border-border/50 p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="text-xs font-medium">{brief.briefTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent font-medium uppercase tracking-wider">
              {brief.pageType}
            </span>
            <span className="text-[10px] text-muted">{brief.targetKeyword}</span>
          </div>
        </div>
        {existingArticle && (
          <button
            onClick={() => setShowArticle(!showArticle)}
            className="text-[10px] text-accent hover:underline shrink-0"
          >
            {showArticle ? "Hide" : "View Article"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleGenerateArticle}
          disabled={generating}
          className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-accent text-white hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {generating && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1 h-1 bg-white rounded-full animate-dot" style={{ animationDelay: `${i * 160}ms` }} />
              ))}
            </span>
          )}
          {generating ? "Generating..." : existingArticle ? "Regenerate" : "Generate Article"}
        </button>
        {existingArticle && (
          <span className="text-[10px] px-1.5 py-0.5 bg-success/10 text-success font-medium uppercase tracking-wider">
            {existingArticle.wordCount} words
          </span>
        )}
      </div>

      {genError && (
        <div className="border border-red-500/30 bg-red-500/5 px-2 py-1 mt-2">
          <p className="text-[10px] text-red-500">{genError}</p>
        </div>
      )}

      {existingArticle && showArticle && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div
            className="text-sm prose prose-sm max-w-none max-h-80 overflow-y-auto
              [&_h1]:text-base [&_h1]:font-display [&_h2]:text-sm [&_h2]:font-display
              [&_h3]:text-xs [&_h3]:font-medium [&_p]:text-xs [&_p]:leading-relaxed
              [&_li]:text-xs [&_a]:text-accent"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(existingArticle.content) }}
          />
          <div className="flex gap-2 mt-2">
            <CopyBtn onClick={() => navigator.clipboard.writeText(existingArticle.content)} label="Copy article" />
            <CopyBtn
              onClick={() => {
                const blob = new Blob([existingArticle.content], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${existingArticle.slug}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              label="Download .md"
            />
          </div>
        </div>
      )}
    </div>
  );
}
