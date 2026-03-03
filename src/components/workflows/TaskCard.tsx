"use client";

import { useState } from "react";
import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import { markdownToHtml } from "@/lib/markdownToHtml";
import type { SocialOutput, PrOutput, EmailOutput, ReviewOutput } from "@/lib/plans/actionValidators";
import { SocialPostItem, PrPitchItem, EmailSequenceItem, ReviewTemplateItem } from "./ActionItems";
import { RedditDraftsResult, CitationAnalysisResult } from "./TaskResults";

const CHANNEL_COLORS: Record<string, string> = {
  reddit: "bg-accent/10 text-accent",
  seo_content: "bg-foreground/5 text-muted",
  llm_visibility: "bg-accent/10 text-accent",
  social: "bg-foreground/5 text-muted",
  pr: "bg-success/10 text-success",
  reviews: "bg-warning/10 text-warning",
  email: "bg-foreground/5 text-muted",
};

const EFFORT_LABELS: Record<string, string> = {
  low: "< 2h",
  medium: "2-8h",
  high: "8h+",
};

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  todo: { bg: "bg-foreground/5 text-muted", label: "To Do" },
  in_progress: { bg: "bg-accent/10 text-accent", label: "Running" },
  done: { bg: "bg-success/10 text-success", label: "Done" },
  skipped: { bg: "bg-foreground/5 text-muted line-through", label: "Skipped" },
};

const STRUCTURED_TASK_TYPES = new Set(["social_repurpose", "pr_pitch", "email_nurture", "review_acquisition"]);
const RICH_RESULT_TYPES = new Set(["reddit_engagement", "citation_gap_analysis"]);

export function TaskCard({
  task,
  canExecute,
  output,
  structuredOutput,
  campaign,
  onCampaignUpdate,
  onExecute,
  onSkip,
}: {
  task: WorkflowTask;
  canExecute: boolean;
  output?: string;
  structuredOutput?: unknown;
  campaign: Campaign;
  onCampaignUpdate: (c: Campaign) => void;
  onExecute: (taskId: string) => void;
  onSkip: (taskId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const channelColor = CHANNEL_COLORS[task.channel] || "bg-foreground/5 text-muted";
  const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES.todo;
  const isExecutable = canExecute && task.status === "todo";
  const isRunning = task.status === "in_progress";
  const hasStructured = task.status === "done" && !!structuredOutput && STRUCTURED_TASK_TYPES.has(task.taskType);
  const hasRichResult = task.status === "done" && RICH_RESULT_TYPES.has(task.taskType) && hasRichData(task.taskType, campaign);
  const hasOutput = task.status === "done" && (!!output || hasStructured || hasRichResult);

  return (
    <div className={`border border-border bg-card transition-all duration-150 ${task.status === "done" && !showOutput ? "opacity-75" : ""}`}>
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider ${channelColor}`}>
                {task.channel.replace("_", " ")}
              </span>
              <span className={`text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider ${statusStyle.bg}`}>
                {statusStyle.label}
              </span>
              {task.dueInDays !== undefined && task.status === "todo" && (
                <span className="text-[10px] px-2 py-0.5 bg-foreground/5 text-muted font-medium">
                  {task.dueInDays <= 7 ? `${task.dueInDays}d` : `${Math.ceil(task.dueInDays / 7)}w`}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
            <p className="text-xs text-muted mt-1 line-clamp-2">{task.description}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted font-medium uppercase tracking-wider">P{task.priority}</span>
              <div className="w-8 h-1 bg-border overflow-hidden" title={`Priority: ${task.priority}/100`}>
                <div className="h-full bg-accent transition-all" style={{ width: `${task.priority}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-wider">
              <span title="Effort">{EFFORT_LABELS[task.effort] || task.effort}</span>
              <span className="opacity-30">|</span>
              <span title="Impact">{task.expectedImpact} impact</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {isExecutable && (
            <button
              onClick={() => onExecute(task.id)}
              className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase bg-accent text-white hover:bg-accent-hover transition-all duration-150"
            >
              Run Task
            </button>
          )}
          {isRunning && (
            <span className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase bg-accent/10 text-accent flex items-center gap-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 bg-accent rounded-full animate-dot"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </span>
              Running...
            </span>
          )}
          {task.status === "todo" && (
            <button
              onClick={() => onSkip(task.id)}
              className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase text-muted hover:text-foreground bg-foreground/5 hover:bg-foreground/10 transition-colors"
            >
              Skip
            </button>
          )}
          {hasOutput && (
            <button
              onClick={() => setShowOutput(!showOutput)}
              className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase text-accent hover:bg-accent/10 transition-colors"
            >
              {showOutput ? "Hide Result" : "View Result"}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs px-3 py-1.5 font-medium tracking-wider uppercase text-muted hover:text-foreground transition-colors ml-auto"
          >
            {expanded ? "Hide Details" : "Details"}
          </button>
        </div>
      </div>

      {/* Rich result panel (Reddit drafts, citations) */}
      {hasRichResult && showOutput && (
        <div className="border-t-2 border-success/30 bg-success/[0.02]">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-success">
                {getRichResultLabel(task.taskType, campaign)}
              </span>
            </div>
            <RichResultRenderer
              taskType={task.taskType}
              campaign={campaign}
              onCampaignUpdate={onCampaignUpdate}
            />
          </div>
        </div>
      )}

      {/* Structured result panel (social, PR, email, reviews) */}
      {hasStructured && !hasRichResult && showOutput && (
        <div className="border-t-2 border-success/30 bg-success/[0.02]">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-success">
                {getStructuredLabel(task.taskType)}
              </span>
              {output && (
                <button
                  onClick={() => {
                    const blob = new Blob([output], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-foreground/5 hover:bg-foreground/10 text-muted transition-colors"
                >
                  Download Markdown
                </button>
              )}
            </div>
            <div className="space-y-3">
              <StructuredResultRenderer taskType={task.taskType} data={structuredOutput} />
            </div>
          </div>
        </div>
      )}

      {/* Markdown result panel (SEO articles, competitor audit, etc.) */}
      {!hasStructured && !hasRichResult && hasOutput && showOutput && output && (
        <div className="border-t-2 border-success/30 bg-success/[0.02]">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-success">Generated Result</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(output);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase transition-colors ${
                    copied ? "bg-success/10 text-success" : "bg-foreground/5 hover:bg-foreground/10 text-muted"
                  }`}
                >
                  {copied ? "Copied!" : "Copy Markdown"}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([output], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-foreground/5 hover:bg-foreground/10 text-muted transition-colors"
                >
                  Download Markdown
                </button>
              </div>
            </div>
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed
                [&_h1]:text-lg [&_h1]:font-display [&_h1]:mt-4 [&_h1]:mb-2
                [&_h2]:text-base [&_h2]:font-display [&_h2]:mt-4 [&_h2]:mb-2
                [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1
                [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2
                [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc
                [&_li]:text-sm [&_li]:mb-1
                [&_strong]:font-semibold
                [&_a]:text-accent [&_a]:underline
                max-h-[500px] overflow-y-auto pr-2"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(output) }}
            />
          </div>
        </div>
      )}

      {/* Collapsed done hint */}
      {hasOutput && !showOutput && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-[10px] text-success">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
            {hasRichResult
              ? getRichCollapsedHint(task.taskType, campaign)
              : hasStructured
              ? getCollapsedHint(task.taskType, structuredOutput)
              : "Result ready \u2014 click \u201cView Result\u201d above to see generated content"}
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="pt-3 border-t border-border/50 space-y-2 text-xs">
            <div>
              <span className="font-medium text-muted">Rationale:</span>
              <p className="mt-0.5">{task.rationale}</p>
            </div>
            <div>
              <span className="font-medium text-muted">Artifact:</span>
              <span className="ml-1">{task.artifactType}</span>
            </div>
            <div>
              <span className="font-medium text-muted">Task Type:</span>
              <span className="ml-1">{task.taskType.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function hasRichData(taskType: string, campaign: Campaign): boolean {
  if (taskType === "reddit_engagement") {
    return campaign.savedDrafts && campaign.savedDrafts.length > 0;
  }
  if (taskType === "citation_gap_analysis") {
    return !!campaign.citationResults && Object.keys(campaign.citationResults).length > 0;
  }
  return false;
}

function getRichResultLabel(taskType: string, campaign: Campaign): string {
  if (taskType === "reddit_engagement") {
    const count = campaign.savedDrafts?.length ?? 0;
    return `${count} Reddit Draft${count !== 1 ? "s" : ""}`;
  }
  if (taskType === "citation_gap_analysis") {
    const count = campaign.citationResults ? Object.keys(campaign.citationResults).length : 0;
    return `Citation Analysis (${count} prompt${count !== 1 ? "s" : ""})`;
  }
  return "Generated Result";
}

function getRichCollapsedHint(taskType: string, campaign: Campaign): string {
  if (taskType === "reddit_engagement") {
    const count = campaign.savedDrafts?.length ?? 0;
    return `${count} draft${count !== 1 ? "s" : ""} ready to copy and post \u2014 click "View Result"`;
  }
  if (taskType === "citation_gap_analysis") {
    const count = campaign.citationResults ? Object.keys(campaign.citationResults).length : 0;
    return `${count} prompt${count !== 1 ? "s" : ""} analyzed with briefs \u2014 click "View Result"`;
  }
  return "Result ready \u2014 click \"View Result\" above";
}

function getStructuredLabel(taskType: string): string {
  switch (taskType) {
    case "social_repurpose": return "Social Posts";
    case "pr_pitch": return "PR Pitches";
    case "email_nurture": return "Email Sequence";
    case "review_acquisition": return "Review Templates";
    default: return "Generated Result";
  }
}

function getCollapsedHint(taskType: string, data: unknown): string {
  if (taskType === "social_repurpose") {
    const d = data as SocialOutput;
    const platforms = d.posts.map((p) => p.platform).join(", ");
    return `${d.posts.length} posts ready (${platforms}) \u2014 click "View Result" to copy`;
  }
  if (taskType === "pr_pitch") {
    const d = data as PrOutput;
    return `${d.pitches.length} pitch emails ready \u2014 click "View Result" to copy and send`;
  }
  if (taskType === "email_nurture") {
    const d = data as EmailOutput;
    return `${d.sequence.length}-email sequence ready \u2014 click "View Result" to copy`;
  }
  if (taskType === "review_acquisition") {
    const d = data as ReviewOutput;
    return `${d.templates.length} review request templates ready \u2014 click "View Result" to copy and send`;
  }
  return "Result ready \u2014 click \"View Result\" above";
}

function RichResultRenderer({
  taskType,
  campaign,
  onCampaignUpdate,
}: {
  taskType: string;
  campaign: Campaign;
  onCampaignUpdate: (c: Campaign) => void;
}) {
  if (taskType === "reddit_engagement") {
    return <RedditDraftsResult campaign={campaign} />;
  }
  if (taskType === "citation_gap_analysis") {
    return <CitationAnalysisResult campaign={campaign} onCampaignUpdate={onCampaignUpdate} />;
  }
  return null;
}

function StructuredResultRenderer({ taskType, data }: { taskType: string; data: unknown }) {
  if (taskType === "social_repurpose") {
    const d = data as SocialOutput;
    return <>{d.posts.map((post, i) => <SocialPostItem key={i} post={post} />)}</>;
  }
  if (taskType === "pr_pitch") {
    const d = data as PrOutput;
    return <>{d.pitches.map((pitch, i) => <PrPitchItem key={i} pitch={pitch} />)}</>;
  }
  if (taskType === "email_nurture") {
    const d = data as EmailOutput;
    return <>{d.sequence.map((email, i) => <EmailSequenceItem key={i} email={email} />)}</>;
  }
  if (taskType === "review_acquisition") {
    const d = data as ReviewOutput;
    return <>{d.templates.map((template, i) => <ReviewTemplateItem key={i} template={template} />)}</>;
  }
  return null;
}
