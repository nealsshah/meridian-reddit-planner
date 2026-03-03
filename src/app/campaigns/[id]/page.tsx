"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, use } from "react";
import { getCampaign, updateCampaign, type Campaign, type SavedDraft, type CitationResultsByPrompt } from "@/lib/store";
import type { GeneratedArticle } from "@/lib/plans/articleValidators";
import type { RunResult } from "@/app/api/run/route";
import type { CitationCaptureResult } from "@/app/api/citations/capture/route";
import type { CitationResult, Brief } from "@/lib/plans/citationValidators";
import { checkForSpam } from "@/lib/spamCheck";
import { checkUnsafePhrases } from "@/lib/citationSafety";
import { renderCitationMarkdown } from "@/lib/export/renderCitationMarkdown";
import { WorkflowBoard } from "@/components/workflows/WorkflowBoard";
import { markdownToHtml } from "@/lib/markdownToHtml";

type Step = "idle" | "planning" | "fetching" | "selecting" | "drafting" | "done" | "error";
type CitationStep = "idle" | "running" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  planning: "Generating search queries...",
  fetching: "Fetching real Reddit threads...",
  selecting: "Picking the best threads to reply to...",
  drafting: "Writing your drafts...",
  done: "Done",
  error: "Something went wrong",
};

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);
  const [citationStep, setCitationStep] = useState<CitationStep>("idle");
  const [citationError, setCitationError] = useState<string | null>(null);

  const reload = useCallback(() => {
    const c = getCampaign(id);
    if (c) setCampaign(c);
  }, [id]);

  useEffect(() => {
    reload();
    setLoaded(true);
  }, [reload]);

  async function handleRunAll() {
    if (!campaign) return;
    setError(null);
    setCitationError(null);
    setStep("planning");
    setCitationStep("idle");

    try {
      const timer1 = setTimeout(() => setStep("fetching"), 4000);
      const timer2 = setTimeout(() => setStep("selecting"), 10000);
      const timer3 = setTimeout(() => setStep("drafting"), 14000);

      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: campaign.brandName,
          category: campaign.category,
          goalPrompts: campaign.goalPrompts,
          targetSubs: campaign.targetSubs,
          brandVoice: campaign.brandVoice,
          doNotSay: campaign.doNotSay,
          disclosurePolicy: campaign.disclosurePolicy,
          promotionStrength: campaign.promotionStrength,
          draftCount: 5,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Run failed");
      }

      const result: RunResult = await res.json();

      const savedDrafts: SavedDraft[] = result.drafts.map((d) => ({
        thread: d.thread,
        draft: d.draft,
        editedComment: d.draft.comment,
      }));

      const updated = updateCampaign(id, {
        queryPlan: result.queryPlan,
        savedDrafts,
      });
      if (updated) setCampaign(updated);
      setRunCount((c) => c + 1);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
      return;
    }

    try {
      setCitationStep("running");

      const prompts = campaign.goalPrompts.split("\n").filter(Boolean);
      const competitors = campaign.competitors
        ? campaign.competitors.split("\n").filter(Boolean)
        : [];

      const res = await fetch("/api/citations/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: campaign.brandName,
          brandDomain: campaign.brandDomain,
          category: campaign.category,
          prompts,
          competitors,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Citation capture failed");
      }

      const data: CitationCaptureResult = await res.json();

      const citationResults: CitationResultsByPrompt = {};
      for (const r of data.results) {
        citationResults[r.prompt] = r;
      }

      const updated = updateCampaign(id, {
        citationResults,
        lastCitationRunAt: new Date().toISOString(),
        citationError: undefined,
      });
      if (updated) setCampaign(updated);
      setCitationStep("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setCitationError(msg);
      updateCampaign(id, { citationError: msg });
      setCitationStep("error");
    }
  }

  function timeAgo(utc: number): string {
    const diff = Math.floor(Date.now() / 1000 - utc);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (!loaded) return <div className="text-muted py-12">Loading...</div>;
  if (!campaign) return <div className="text-muted py-12">Campaign not found</div>;

  const isRunning = step !== "idle" && step !== "done" && step !== "error";
  const hasDrafts = campaign.savedDrafts.length > 0;
  const isCitationRunning = citationStep === "running";
  const isAnyRunning = isRunning || isCitationRunning;

  const baseButtonLabel = hasDrafts ? "Re-run Reddit + Citations" : "Run Reddit + Citations";
  let runningLabel = "";
  if (isRunning) {
    runningLabel = STEP_LABELS[step] || "Running Reddit flow...";
  } else if (isCitationRunning) {
    runningLabel = "Capturing citations and briefs...";
  }

  return (
    <div>
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors mb-8 animate-fade-up"
      >
        ← All Campaigns
      </Link>

      {/* Header */}
      <div className="mb-10 pb-6 border-b-2 border-foreground animate-fade-up">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">
          {campaign.category}
          <span className="mx-2 opacity-40">·</span>
          <span className="capitalize">{campaign.promotionStrength}</span> promotion
          <span className="mx-2 opacity-40">·</span>
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
        <div className="border border-accent/20 bg-accent/5 p-5 mb-8 animate-fade-up" style={{ animationDelay: "50ms" }}>
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
                  <span className="text-accent select-none">◊</span>
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
                    <span className="text-accent select-none">◊</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Board */}
      <WorkflowBoard campaign={campaign} onCampaignUpdate={setCampaign} />

      {/* Run section */}
      <div className="border-2 border-foreground/10 bg-card p-8 mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="text-center">
          <div className="text-5xl mb-4 text-accent/20 animate-float select-none">◊</div>
          <h2 className="font-display text-2xl mb-2">
            {hasDrafts ? "Re-run Campaign & Citations" : "Auto-Run Campaign & Citations"}
          </h2>
          <p className="text-muted text-sm mb-5 max-w-md mx-auto">
            Generates search queries, fetches real Reddit threads, picks the 5 best opportunities, writes ready-to-post comments, and captures citation suggestions.
          </p>
          <button
            onClick={handleRunAll}
            disabled={isAnyRunning}
            className="bg-accent text-white px-10 py-3 text-sm font-medium tracking-widest uppercase hover:bg-accent-hover transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
          >
            {isAnyRunning && (
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-white rounded-full animate-dot"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </span>
            )}
            <span>{isAnyRunning ? runningLabel : baseButtonLabel}</span>
          </button>
          {error && (
            <p className="text-red-500 text-sm mt-4 animate-slide-in">{error}</p>
          )}
        </div>

        {isRunning && (
          <div className="pt-6 mt-6 border-t border-border text-center">
            <div className="flex justify-center mb-6">
              <div className="flex gap-2">
                {(["planning", "fetching", "selecting", "drafting"] as Step[]).map((s) => {
                  const steps: Step[] = ["planning", "fetching", "selecting", "drafting"];
                  const currentIdx = steps.indexOf(step);
                  const thisIdx = steps.indexOf(s);
                  return (
                    <div
                      key={s}
                      className={`h-1 transition-all duration-500 ${
                        thisIdx < currentIdx
                          ? "w-10 bg-success"
                          : thisIdx === currentIdx
                          ? "w-14 progress-shimmer"
                          : "w-10 bg-border"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-muted text-xs tracking-widest uppercase mb-4">{STEP_LABELS[step]}</p>
          </div>
        )}

        {!isRunning && isCitationRunning && (
          <div className="pt-6 mt-6 border-t border-border text-center">
            <p className="text-muted text-xs tracking-widest uppercase mb-4">
              Capturing citations and content briefs...
            </p>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-accent animate-dot"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {hasDrafts && (
        <div>
          <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-border">
            <h2 className="font-display text-2xl">
              {campaign.savedDrafts.length} Ready-to-Post
            </h2>
          </div>

          <div className="space-y-5">
            {campaign.savedDrafts.map((sd, idx) => {
              const spamFlags = checkForSpam(sd.editedComment);
              return (
                <div
                  key={`${idx}-${runCount}`}
                  className="border border-border bg-card overflow-hidden animate-fade-up"
                  style={{ animationDelay: `${idx * 75}ms` }}
                >
                  {/* Thread info */}
                  <div className="px-5 py-4 border-b border-border bg-background">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{sd.thread.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted mt-1.5">
                          <span className="text-accent font-medium">r/{sd.thread.subreddit}</span>
                          <span>{sd.thread.score} pts</span>
                          <span>{sd.thread.numComments} comments</span>
                          <span>{timeAgo(sd.thread.createdUtc)}</span>
                        </div>
                      </div>
                      <Link
                        href={`/campaigns/${id}/opportunities/${idx}`}
                        className="shrink-0 text-xs font-medium tracking-wider uppercase text-accent hover:underline"
                      >
                        Edit →
                      </Link>
                    </div>
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

                  {/* Draft */}
                  <div className="px-5 py-4">
                    {spamFlags.length > 0 && (
                      <div className="border border-red-500/30 bg-red-500/5 px-3 py-2 mb-3 animate-slide-in">
                        <p className="text-xs font-medium text-red-500">
                          Spam phrases detected: &ldquo;{spamFlags.join('", "')}&rdquo; — edit before posting
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted italic mb-3">{sd.draft.whyThisWillWork}</p>
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {sd.editedComment}
                    </pre>
                    {sd.draft.disclosureLine && (
                      <p className="text-xs text-muted mt-2 italic">{sd.draft.disclosureLine}</p>
                    )}
                  </div>

                  <div className="px-5 pb-4">
                    <CopyButton text={sd.editedComment} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Citation Suggestions */}
      <CitationSection
        campaign={campaign}
        citationStep={citationStep}
        citationError={citationError}
        onCampaignUpdate={setCampaign}
      />

      {/* Generated Content from Workflow */}
      <GeneratedContentSection campaign={campaign} />
    </div>
  );
}

function GeneratedContentSection({ campaign }: { campaign: Campaign }) {
  const articles = campaign.generatedArticles;
  if (!articles || Object.keys(articles).length === 0) return null;

  const citationBriefTitles = new Set(
    campaign.citationResults
      ? Object.values(campaign.citationResults).flatMap((r) => r.briefs.map((b) => b.briefTitle))
      : []
  );

  const standaloneArticles = Object.entries(articles).filter(
    ([title]) => !citationBriefTitles.has(title)
  );

  if (standaloneArticles.length === 0) return null;

  return (
    <div className="border-2 border-foreground/10 bg-card p-8 mt-10 animate-fade-up">
      <h2 className="font-display text-2xl mb-6">Generated Content</h2>
      <div className="space-y-4">
        {standaloneArticles.map(([title, article]) => (
          <StandaloneArticleCard key={title} article={article} />
        ))}
      </div>
    </div>
  );
}

function StandaloneArticleCard({ article }: { article: import("@/lib/plans/articleValidators").GeneratedArticle }) {
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(article.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([article.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-sm font-medium">{article.title}</h3>
          <span className="text-[10px] px-2 py-0.5 bg-success/10 text-success font-medium uppercase tracking-wider">
            {article.wordCount} words
          </span>
        </div>
        <button
          onClick={() => setShowContent(!showContent)}
          className="text-xs text-accent hover:underline shrink-0"
        >
          {showContent ? "Hide" : "View Content"}
        </button>
      </div>

      {showContent && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto mb-3">
            {article.content}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`text-xs px-3 py-1.5 font-medium tracking-wider uppercase transition-colors ${
                copied ? "bg-success/10 text-success" : "bg-foreground/5 hover:bg-foreground/10"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase bg-foreground/5 hover:bg-foreground/10 transition-colors"
            >
              Download .md
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CitationSection({
  campaign,
  citationStep,
  citationError,
  onCampaignUpdate,
}: {
  campaign: Campaign;
  citationStep: CitationStep;
  citationError: string | null;
  onCampaignUpdate: (c: Campaign) => void;
}) {
  const hasCitations = campaign.citationResults && Object.keys(campaign.citationResults).length > 0;
  const results = campaign.citationResults
    ? Object.values(campaign.citationResults)
    : [];

  const allBriefText = results
    .flatMap((r) => r.briefs)
    .map((b) => `${b.briefTitle} ${b.whatToProve} ${b.outline.join(" ")}`)
    .join(" ");
  const unsafePhrases = hasCitations ? checkUnsafePhrases(allBriefText) : [];

  function handleCopyMarkdown() {
    const md = renderCitationMarkdown({
      brandName: campaign.brandName,
      category: campaign.category,
      results,
      generatedArticles: campaign.generatedArticles,
    });
    navigator.clipboard.writeText(md);
  }

  function handleDownloadJson() {
    const json = JSON.stringify({ results }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign.brandName.toLowerCase().replace(/\s+/g, "-")}-citations.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border-2 border-foreground/10 bg-card p-8 mt-10 animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl">Citation Suggestions</h2>
          {campaign.lastCitationRunAt && (
            <p className="text-xs text-muted mt-1">
              Last run: {new Date(campaign.lastCitationRunAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="text-xs text-muted uppercase tracking-widest">
          {citationStep === "running"
            ? "Running as part of campaign..."
            : "Runs automatically with campaign"}
        </div>
      </div>

      {citationError && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 mb-4">
          <p className="text-sm text-red-500">{citationError}</p>
        </div>
      )}

      {unsafePhrases.length > 0 && (
        <div className="border border-warning/30 bg-warning/5 px-4 py-3 mb-4">
          <p className="text-xs font-medium text-warning">
            Safety warning: unsafe phrases detected in briefs: {unsafePhrases.join(", ")}
          </p>
        </div>
      )}

      {!hasCitations && citationStep !== "running" && (
        <p className="text-muted text-sm text-center py-4">
          Run citation capture to see what sources LLMs cite for your goal prompts and what content to publish.
        </p>
      )}

      {hasCitations && (
        <div className="space-y-8">
          {results.map((result, rIdx) => (
            <CitationPromptResult
              key={rIdx}
              result={result}
              campaign={campaign}
              onCampaignUpdate={onCampaignUpdate}
            />
          ))}

          <div className="flex gap-3 pt-4 border-t border-border">
            <CopyMarkdownButton onClick={handleCopyMarkdown} />
            <button
              onClick={handleDownloadJson}
              className="text-xs px-4 py-2 font-medium tracking-wider uppercase bg-foreground/5 hover:bg-foreground/10 transition-colors"
            >
              Download Citations JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CitationPromptResult({
  result,
  campaign,
  onCampaignUpdate,
}: {
  result: CitationResult;
  campaign: Campaign;
  onCampaignUpdate: (c: Campaign) => void;
}) {
  return (
    <div className="border border-border bg-background p-5">
      <h3 className="font-display text-lg mb-3">&ldquo;{result.prompt}&rdquo;</h3>

      <div className="mb-4">
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-1">Answer Summary</p>
        <p className="text-sm">{result.answerSummary}</p>
      </div>

      {result.topPicks && result.topPicks.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-1">Top Picks</p>
          <div className="flex flex-wrap gap-2">
            {result.topPicks.map((pick, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-accent/10 text-accent">
                {pick}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.citations.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-2">Citations</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 font-medium text-muted">Domain</th>
                <th className="py-2 pr-3 font-medium text-muted">Title</th>
                <th className="py-2 pr-3 font-medium text-muted">URL</th>
                <th className="py-2 pr-3 font-medium text-muted">Role</th>
                <th className="py-2 pr-3 font-medium text-muted">Relevance</th>
                <th className="py-2 font-medium text-muted">Notes</th>
              </tr>
            </thead>
            <tbody>
              {result.citations.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-accent">{c.domain}</td>
                  <td className="py-2 pr-3">{c.title}</td>
                  <td className="py-2 pr-3">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      Link
                    </a>
                  </td>
                  <td className="py-2 pr-3">{c.citationRole}</td>
                  <td className="py-2 pr-3">{c.relevanceToBrand}</td>
                  <td className="py-2">{c.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.gaps && result.gaps.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-1">Content Gaps</p>
          <ul className="space-y-1">
            {result.gaps.map((gap, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-accent select-none">◊</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.briefs.length > 0 && (
        <div>
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-3">Content Briefs</p>
          <div className="space-y-4">
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
  const [expanded, setExpanded] = useState(false);
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
      setGenError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopyArticle() {
    if (existingArticle) {
      navigator.clipboard.writeText(existingArticle.content);
    }
  }

  function handleDownloadMd() {
    if (!existingArticle) return;
    const blob = new Blob([existingArticle.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${existingArticle.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h4 className="text-sm font-medium">{brief.briefTitle}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent font-medium uppercase tracking-wider">
              {brief.pageType}
            </span>
            <span className="text-xs text-muted">{brief.targetKeyword}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {existingArticle && (
            <button
              onClick={() => setShowArticle(!showArticle)}
              className="text-xs text-accent hover:underline transition-colors"
            >
              {showArticle ? "Hide Article" : "View Article"}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted mb-2">{brief.primaryIntent}</p>

      {/* Generate Article button */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={handleGenerateArticle}
          disabled={generating}
          className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase bg-accent text-white hover:bg-accent-hover transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating && (
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 bg-white rounded-full animate-dot"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </span>
          )}
          {generating ? "Generating..." : existingArticle ? "Regenerate Article" : "Generate Article"}
        </button>
        {existingArticle && (
          <span className="text-[10px] px-2 py-0.5 bg-success/10 text-success font-medium uppercase tracking-wider">
            {existingArticle.wordCount} words
          </span>
        )}
      </div>

      {genError && (
        <div className="border border-red-500/30 bg-red-500/5 px-3 py-2 mb-2">
          <p className="text-xs text-red-500">{genError}</p>
        </div>
      )}

      {/* Generated article display */}
      {existingArticle && showArticle && (
        <div className="mt-3 pt-3 border-t border-accent/20 space-y-3">
          <h5 className="text-sm font-medium">{existingArticle.title}</h5>
          <div
            className="text-sm prose prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-display [&_h2]:text-base [&_h2]:font-display [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_a]:text-accent"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(existingArticle.content) }}
          />
          {existingArticle.sourcesUsed.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted mb-1">Sources Used</p>
              <ul className="space-y-0.5">
                {existingArticle.sourcesUsed.map((src, i) => (
                  <li key={i} className="text-xs">
                    <a href={src} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all">
                      {src}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <ArticleCopyButton onClick={handleCopyArticle} />
            <button
              onClick={handleDownloadMd}
              className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase bg-foreground/5 hover:bg-foreground/10 transition-colors"
            >
              Download .md
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-3 text-xs">
          <div>
            <span className="font-medium text-muted">Outline:</span>
            <ol className="mt-1 space-y-0.5 list-decimal list-inside">
              {brief.outline.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>

          <div>
            <span className="font-medium text-muted">What to Prove:</span>
            <p className="mt-0.5">{brief.whatToProve}</p>
          </div>

          {brief.competesWith && (
            <div>
              <span className="font-medium text-muted">Competes With:</span>
              <p className="mt-0.5">{brief.competesWith}</p>
            </div>
          )}

          {brief.internalLinks && brief.internalLinks.length > 0 && (
            <div>
              <span className="font-medium text-muted">Internal Links:</span>
              <ul className="mt-0.5 space-y-0.5">
                {brief.internalLinks.map((link, i) => (
                  <li key={i}>{link}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.schemaSuggestions && brief.schemaSuggestions.length > 0 && (
            <div>
              <span className="font-medium text-muted">Schema Suggestions:</span>
              <ul className="mt-0.5 space-y-0.5">
                {brief.schemaSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.safetyNotes && brief.safetyNotes.length > 0 && (
            <div>
              <span className="font-medium text-muted">Safety Notes:</span>
              <ul className="mt-0.5 space-y-0.5">
                {brief.safetyNotes.map((n, i) => (
                  <li key={i} className="text-warning">{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArticleCopyButton({ onClick }: { onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`text-xs px-3 py-1.5 font-medium tracking-wider uppercase transition-colors ${
        copied ? "bg-success/10 text-success" : "bg-foreground/5 hover:bg-foreground/10"
      }`}
    >
      {copied ? "Copied!" : "Copy Article"}
    </button>
  );
}

function CopyMarkdownButton({ onClick }: { onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`text-xs px-4 py-2 font-medium tracking-wider uppercase transition-colors ${
        copied ? "bg-success/10 text-success" : "bg-foreground/5 hover:bg-foreground/10"
      }`}
    >
      {copied ? "Copied!" : "Copy Citations Markdown"}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [popKey, setPopKey] = useState(0);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setPopKey((k) => k + 1);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`text-xs px-3 py-1.5 font-medium tracking-wider uppercase transition-colors ${
        copied
          ? "bg-success/10 text-success"
          : "bg-foreground/5 hover:bg-foreground/10"
      }`}
    >
      <span key={popKey} className={copied ? "inline-block animate-scale-pop" : ""}>
        {copied ? "Copied!" : "Copy comment"}
      </span>
    </button>
  );
}
