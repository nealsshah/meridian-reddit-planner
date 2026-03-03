"use client";

import { useState } from "react";
import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import { markdownToHtml } from "@/lib/markdownToHtml";

const CHANNEL_COLORS: Record<string, string> = {
  reddit: "bg-orange-500/10 text-orange-600",
  seo_content: "bg-blue-500/10 text-blue-600",
  llm_visibility: "bg-purple-500/10 text-purple-600",
  social: "bg-pink-500/10 text-pink-600",
  pr: "bg-emerald-500/10 text-emerald-600",
  reviews: "bg-amber-500/10 text-amber-600",
  email: "bg-cyan-500/10 text-cyan-600",
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

export function TaskCard({
  task,
  canExecute,
  output,
  onExecute,
  onSkip,
}: {
  task: WorkflowTask;
  canExecute: boolean;
  output?: string;
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
  const hasOutput = task.status === "done" && !!output;

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
              Execute
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
            {expanded ? "Less" : "More"}
          </button>
        </div>
      </div>

      {/* Result panel — rendered markdown */}
      {hasOutput && showOutput && (
        <div className="border-t-2 border-success/30 bg-success/[0.02]">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-success">Generated Result</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(output!);
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
                    const blob = new Blob([output!], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-foreground/5 hover:bg-foreground/10 text-muted transition-colors"
                >
                  Download .md
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
              dangerouslySetInnerHTML={{ __html: markdownToHtml(output!) }}
            />
          </div>
        </div>
      )}

      {/* Collapsed done hint */}
      {hasOutput && !showOutput && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-[10px] text-success">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
            Result ready — click "View Result" to see generated content
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
