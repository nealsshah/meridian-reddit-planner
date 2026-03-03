"use client";

import { useState } from "react";
import type { WorkflowPlan, WorkflowTask, Kpi } from "@/lib/plans/workflowValidators";
import type { Campaign, SavedDraft, CitationResultsByPrompt } from "@/lib/store";
import { updateCampaign } from "@/lib/store";
import { TaskCard } from "./TaskCard";
import type { ExecutorResult } from "@/lib/workflows/registry";
import type { RunResult } from "@/app/api/run/route";
import type { CitationCaptureResult } from "@/app/api/citations/capture/route";
import type { GeneratedArticle } from "@/lib/plans/articleValidators";

const EXECUTABLE_TYPES = new Set([
  "reddit_engagement",
  "citation_gap_analysis",
  "pillar_article",
  "comparison_page",
  "faq_page",
  "data_study",
  "social_repurpose",
  "review_acquisition",
  "pr_pitch",
  "email_nurture",
  "competitor_audit",
]);

type WorkflowStep = "idle" | "generating" | "done" | "error";
type Filter = "all" | "todo" | "done" | "skipped";

export function WorkflowBoard({
  campaign,
  onCampaignUpdate,
}: {
  campaign: Campaign;
  onCampaignUpdate: (c: Campaign) => void;
}) {
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("idle");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  const [replanStep, setReplanStep] = useState<WorkflowStep>("idle");

  const plan = campaign.workflowPlan;
  const tasks = campaign.workflowTasks || plan?.tasks || [];

  async function handleGenerateWorkflow() {
    setWorkflowStep("generating");
    setWorkflowError(null);

    try {
      const res = await fetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: campaign.brandName,
          category: campaign.category,
          objective: campaign.objective || "",
          goalPrompts: campaign.goalPrompts,
          brandDomain: campaign.brandDomain,
          competitors: campaign.competitors,
          brandVoice: campaign.brandVoice,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Workflow generation failed");
      }

      const workflowPlan: WorkflowPlan = await res.json();
      const updated = updateCampaign(campaign.id, {
        workflowPlan,
        workflowTasks: workflowPlan.tasks,
        lastWorkflowRunAt: new Date().toISOString(),
      });
      if (updated) onCampaignUpdate(updated);
      setWorkflowStep("done");
    } catch (err) {
      setWorkflowError(err instanceof Error ? err.message : "Unknown error");
      setWorkflowStep("error");
    }
  }

  function updateTaskStatus(taskId: string, status: WorkflowTask["status"]) {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status } : t
    );
    const updated = updateCampaign(campaign.id, { workflowTasks: updatedTasks });
    if (updated) onCampaignUpdate(updated);
  }

  async function handleExecuteTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setExecutingTaskId(taskId);
    updateTaskStatus(taskId, "in_progress");

    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, campaign }),
      });

      const result: ExecutorResult = await res.json();

      if (result.success) {
        const campaignUpdates: Partial<Campaign> = {};
        const existingOutputs = campaign.workflowOutputs || {};

        if (result.artifactKey === "savedDrafts" && result.data) {
          const runResult = result.data as RunResult;
          const savedDrafts: SavedDraft[] = (runResult.drafts || []).map((d) => ({
            thread: d.thread,
            draft: d.draft,
            editedComment: d.draft.comment,
          }));
          campaignUpdates.queryPlan = runResult.queryPlan;
          campaignUpdates.savedDrafts = savedDrafts;

          const lines = (runResult.drafts || []).map((d) =>
            `### r/${d.thread.subreddit}\n\n**Thread:** ${d.thread.title}\n\n${d.draft.comment}`
          );
          campaignUpdates.workflowOutputs = {
            ...existingOutputs,
            [taskId]: `# Reddit Drafts\n\n${lines.length} draft${lines.length !== 1 ? "s" : ""} generated\n\n---\n\n${lines.join("\n\n---\n\n")}`,
          };
        }

        if (result.artifactKey === "citationResults" && result.data) {
          const captureResult = result.data as CitationCaptureResult;
          const citationResults: CitationResultsByPrompt = {};
          for (const r of captureResult.results || []) {
            citationResults[r.prompt] = r;
          }
          campaignUpdates.citationResults = citationResults;
          campaignUpdates.lastCitationRunAt = new Date().toISOString();

          const lines = (captureResult.results || []).map((r) => {
            const citList = r.citations.slice(0, 5).map((c) => `- [${c.url}](${c.url})`).join("\n");
            return `### "${r.prompt}"\n\n**${r.citations.length}** citations found, **${r.briefs.length}** content briefs\n\n${citList}`;
          });
          campaignUpdates.workflowOutputs = {
            ...existingOutputs,
            [taskId]: `# Citation Analysis\n\n${lines.join("\n\n---\n\n")}`,
          };
        }

        if ((result.artifactKey === "generatedArticles" || result.artifactKey === "workflowContent") && result.data) {
          const article = result.data as GeneratedArticle;
          const existingArticles = campaign.generatedArticles || {};
          campaignUpdates.generatedArticles = { ...existingArticles, [article.title]: article };
          campaignUpdates.workflowOutputs = {
            ...existingOutputs,
            [taskId]: article.content,
          };
        }

        updateTaskStatus(taskId, "done");
        const refreshed = updateCampaign(campaign.id, campaignUpdates);
        if (refreshed) onCampaignUpdate(refreshed);
      } else {
        updateTaskStatus(taskId, "todo");
        setWorkflowError(`Task "${task.title}" failed: ${result.message}`);
      }
    } catch (err) {
      updateTaskStatus(taskId, "todo");
      setWorkflowError(
        `Task "${task.title}" failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setExecutingTaskId(null);
    }
  }

  function handleSkipTask(taskId: string) {
    updateTaskStatus(taskId, "skipped");
  }

  async function handleReplan() {
    if (!plan) return;
    setReplanStep("generating");
    setWorkflowError(null);

    try {
      const res = await fetch("/api/workflows/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: campaign.brandName,
          category: campaign.category,
          objective: campaign.objective || "",
          workflowPlan: plan,
          workflowTasks: tasks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Replan failed");
      }

      const newPlan: WorkflowPlan = await res.json();
      const updated = updateCampaign(campaign.id, {
        workflowPlan: newPlan,
        workflowTasks: newPlan.tasks,
        lastWorkflowRunAt: new Date().toISOString(),
      });
      if (updated) onCampaignUpdate(updated);
      setReplanStep("done");
    } catch (err) {
      setWorkflowError(err instanceof Error ? err.message : "Unknown error");
      setReplanStep("error");
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "todo") return t.status === "todo" || t.status === "in_progress";
    return t.status === filter;
  });

  const channelGroups = filteredTasks.reduce<Record<string, WorkflowTask[]>>((acc, task) => {
    const ch = task.channel;
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(task);
    return acc;
  }, {});

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    todo: tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length,
    skipped: tasks.filter((t) => t.status === "skipped").length,
  };

  return (
    <div className="border-2 border-foreground/10 bg-card p-8 mb-10 animate-fade-up" style={{ animationDelay: "140ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl">Workflow Plan</h2>
          {campaign.lastWorkflowRunAt && (
            <p className="text-xs text-muted mt-1">
              Generated: {new Date(campaign.lastWorkflowRunAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {plan && stats.done > 0 && (
            <button
              onClick={handleReplan}
              disabled={replanStep === "generating" || workflowStep === "generating"}
              className="border border-border px-5 py-2.5 text-xs font-medium tracking-widest uppercase hover:border-foreground hover:bg-foreground hover:text-background transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {replanStep === "generating" && (
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1 h-1 bg-current rounded-full animate-dot"
                      style={{ animationDelay: `${i * 160}ms` }}
                    />
                  ))}
                </span>
              )}
              {replanStep === "generating" ? "Replanning..." : "Replan"}
            </button>
          )}
          <button
            onClick={handleGenerateWorkflow}
            disabled={workflowStep === "generating" || replanStep === "generating"}
            className="bg-accent text-white px-6 py-2.5 text-xs font-medium tracking-widest uppercase hover:bg-accent-hover transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {workflowStep === "generating" && (
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
            {workflowStep === "generating"
              ? "Generating..."
              : plan
              ? "Regenerate Workflow"
              : "Generate Workflow"}
          </button>
        </div>
      </div>

      {workflowError && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 mb-4">
          <p className="text-sm text-red-500">{workflowError}</p>
        </div>
      )}

      {!plan && workflowStep !== "generating" && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 text-accent/20 select-none">◊</div>
          <p className="text-muted text-sm max-w-md mx-auto">
            Generate a workflow plan from your campaign objective. The AI will create a prioritized,
            multi-channel task list with specific actions to increase your brand&apos;s visibility.
          </p>
        </div>
      )}

      {workflowStep === "generating" && (
        <div className="text-center py-8">
          <p className="text-muted text-xs tracking-widest uppercase mb-4">
            Analyzing objective and building workflow...
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

      {plan && (
        <div>
          {/* Summary */}
          <div className="border border-border bg-background p-4 mb-6">
            <p className="text-sm mb-3">{plan.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="font-medium text-muted uppercase tracking-wider">Quick Wins</span>
                <p className="mt-1">{plan.timeline.quickWins}</p>
              </div>
              <div>
                <span className="font-medium text-muted uppercase tracking-wider">Short Term</span>
                <p className="mt-1">{plan.timeline.shortTerm}</p>
              </div>
              <div>
                <span className="font-medium text-muted uppercase tracking-wider">Long Term</span>
                <p className="mt-1">{plan.timeline.longTerm}</p>
              </div>
            </div>
          </div>

          {/* Stats + Filter */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted">
                {stats.done}/{stats.total} done
              </span>
              <div className="w-24 h-1 bg-border overflow-hidden">
                <div
                  className="h-full bg-success transition-all duration-300"
                  style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
                />
              </div>
              {stats.skipped > 0 && (
                <span className="text-muted">{stats.skipped} skipped</span>
              )}
            </div>
            <div className="flex gap-1">
              {(["all", "todo", "done", "skipped"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase transition-colors ${
                    filter === f
                      ? "bg-accent text-white"
                      : "bg-foreground/5 text-muted hover:bg-foreground/10"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks grouped by channel */}
          <div className="space-y-6">
            {Object.entries(channelGroups)
              .sort(([, a], [, b]) => {
                const maxA = Math.max(...a.map((t) => t.priority));
                const maxB = Math.max(...b.map((t) => t.priority));
                return maxB - maxA;
              })
              .map(([channel, channelTasks]) => (
                <div key={channel}>
                  <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-3">
                    {channel.replace(/_/g, " ")} ({channelTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {channelTasks
                      .sort((a, b) => b.priority - a.priority)
                      .map((task) => (
                        <TaskCard
                          key={task.id}
                          task={
                            executingTaskId === task.id
                              ? { ...task, status: "in_progress" }
                              : task
                          }
                          canExecute={
                            EXECUTABLE_TYPES.has(task.taskType) && !executingTaskId
                          }
                          output={campaign.workflowOutputs?.[task.id]}
                          onExecute={handleExecuteTask}
                          onSkip={handleSkipTask}
                        />
                      ))}
                  </div>
                </div>
              ))}
          </div>

          {/* KPIs */}
          {plan.kpis.length > 0 && (
            <KpiSection kpis={plan.kpis} />
          )}
        </div>
      )}
    </div>
  );
}

function KpiSection({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="mt-6 pt-6 border-t border-border">
      <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-3">
        Key Performance Indicators
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="border border-border p-3">
            <p className="text-sm font-medium mb-1">{kpi.metric}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-accent font-medium">{kpi.target}</span>
              <span className="text-muted">in {kpi.windowDays}d</span>
            </div>
            {kpi.currentValue && (
              <p className="text-xs text-muted mt-1">Current: {kpi.currentValue}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
