"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { getCampaign } from "@/lib/store";
import { renderMarkdown } from "@/lib/export/renderMarkdown";

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [markdown, setMarkdown] = useState("");
  const [jsonData, setJsonData] = useState<object | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [view, setView] = useState<"markdown" | "json">("markdown");

  useEffect(() => {
    const campaign = getCampaign(id);
    if (campaign?.queryPlan) {
      setMarkdown(
        renderMarkdown({
          brandName: campaign.brandName,
          category: campaign.category,
          goalPrompts: campaign.goalPrompts,
          queryPlan: campaign.queryPlan,
          savedDrafts: campaign.savedDrafts,
        })
      );
      setJsonData({
        campaign: {
          brandName: campaign.brandName,
          category: campaign.category,
          promotionStrength: campaign.promotionStrength,
          disclosurePolicy: campaign.disclosurePolicy,
        },
        queryPlan: campaign.queryPlan,
        drafts: campaign.savedDrafts.map((sd) => ({
          threadUrl: sd.thread.url,
          threadTitle: sd.thread.title,
          subreddit: sd.thread.subreddit,
          comment: sd.editedComment,
          disclosureLine: sd.draft.disclosureLine,
          followUps: sd.draft.followUps,
          promotionStrength: sd.draft.promotionStrength,
        })),
      });
    }
    setLoaded(true);
  }, [id]);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reddit-action-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) return <div className="text-muted py-12 text-center">Loading...</div>;
  if (!jsonData) return <div className="text-muted py-12 text-center">No plan to export</div>;

  return (
    <div>
      <Link
        href={`/campaigns/${id}`}
        className="text-xs font-medium tracking-[0.15em] uppercase text-muted hover:text-accent transition-colors"
      >
        ← Back to Campaign
      </Link>

      {/* Masthead */}
      <div className="mt-6 mb-8 pb-6 border-b-2 border-foreground animate-fade-up">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">Export</p>
        <h1 className="font-display text-5xl">Action Checklist</h1>
      </div>

      <div className="flex items-center justify-between mb-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex gap-1">
          <button
            onClick={() => setView("markdown")}
            className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-colors ${
              view === "markdown"
                ? "bg-foreground text-background"
                : "border border-border hover:border-foreground transition-all duration-150"
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setView("json")}
            className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-colors ${
              view === "json"
                ? "bg-foreground text-background"
                : "border border-border hover:border-foreground transition-all duration-150"
            }`}
          >
            JSON
          </button>
        </div>

        <div className="flex gap-2">
          {view === "markdown" ? (
            <button
              onClick={() => copyToClipboard(markdown, "markdown")}
              className="bg-accent text-white px-5 py-2 text-xs font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors"
            >
              {copied === "markdown" ? "Copied!" : "Copy Markdown"}
            </button>
          ) : (
            <>
              <button
                onClick={() => copyToClipboard(JSON.stringify(jsonData, null, 2), "json")}
                className="bg-accent text-white px-5 py-2 text-xs font-medium tracking-widest uppercase hover:bg-accent-hover transition-colors"
              >
                {copied === "json" ? "Copied!" : "Copy JSON"}
              </button>
              <button
                onClick={downloadJson}
                className="px-5 py-2 text-xs font-medium tracking-widest uppercase border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all duration-150"
              >
                Download JSON
              </button>
            </>
          )}
        </div>
      </div>

      <div key={view} className="border border-border bg-card overflow-hidden animate-fade-up" style={{ animationDelay: "100ms" }}>
        <pre className="p-6 text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
          {view === "markdown" ? markdown : JSON.stringify(jsonData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
