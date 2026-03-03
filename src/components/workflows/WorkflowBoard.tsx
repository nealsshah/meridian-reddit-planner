"use client";

import { useState, useRef, useCallback } from "react";
import type { WorkflowPlan, WorkflowTask, Kpi } from "@/lib/plans/workflowValidators";
import type { Campaign, SavedDraft, CitationResultsByPrompt } from "@/lib/store";
import { updateCampaign, getCampaign } from "@/lib/store";
import { TaskCard } from "./TaskCard";
import type { ExecutorResult } from "@/lib/workflows/registry";
import type { RunResult } from "@/app/api/run/route";
import type { CitationCaptureResult } from "@/app/api/citations/capture/route";
import type { GeneratedArticle } from "@/lib/plans/articleValidators";
import type { SocialOutput } from "@/lib/plans/actionValidators";
import type { PrOutput } from "@/lib/plans/actionValidators";
import type { EmailOutput } from "@/lib/plans/actionValidators";
import type { ReviewOutput } from "@/lib/plans/actionValidators";

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

type WorkflowStep = "idle" | "generating" | "executing" | "done" | "error";
type Filter = "all" | "todo" | "done" | "skipped";
type AutoProgress = { total: number; done: number; failed: number; running: string[] };

const CONCURRENCY_LIMIT = 3;

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
  const [autoProgress, setAutoProgress] = useState<AutoProgress | null>(null);
  const [replanStep, setReplanStep] = useState<WorkflowStep>("idle");

  const campaignRef = useRef(campaign);
  campaignRef.current = campaign;

  const plan = campaign.workflowPlan;
  const tasks = campaign.workflowTasks || plan?.tasks || [];

  const isAutoExecuting = workflowStep === "executing";

  const freshCampaign = useCallback(() => {
    return getCampaign(campaignRef.current.id) || campaignRef.current;
  }, []);

  async function executeOneTask(taskId: string, campaignForApi: Campaign): Promise<{ taskId: string; success: boolean; error?: string }> {
    const task = (campaignForApi.workflowTasks || []).find((t) => t.id === taskId);
    if (!task) return { taskId, success: false, error: "Task not found" };

    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, campaign: campaignForApi }),
      });

      const result: ExecutorResult = await res.json();

      if (result.success) {
        const latest = freshCampaign();
        const campaignUpdates: Partial<Campaign> = {};
        const existingOutputs = latest.workflowOutputs || {};

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
          const latestArticles = freshCampaign().generatedArticles || {};
          campaignUpdates.generatedArticles = { ...latestArticles, [article.title]: article };
          campaignUpdates.workflowOutputs = {
            ...existingOutputs,
            [taskId]: article.content,
          };
        }

        const STRUCTURED_KEYS = new Set(["socialPosts", "prPitches", "emailSequence", "reviewTemplates"]);
        if (STRUCTURED_KEYS.has(result.artifactKey) && result.data) {
          const latestStructured = freshCampaign().workflowStructuredOutputs || {};
          campaignUpdates.workflowStructuredOutputs = {
            ...latestStructured,
            [taskId]: result.data,
          };
          campaignUpdates.workflowOutputs = {
            ...existingOutputs,
            ...(campaignUpdates.workflowOutputs || {}),
            [taskId]: buildMarkdownSummary(result.artifactKey, result.data),
          };
        }

        const latestTasks = (freshCampaign().workflowTasks || []).map((t) =>
          t.id === taskId ? { ...t, status: "done" as const } : t
        );
        campaignUpdates.workflowTasks = latestTasks;

        const refreshed = updateCampaign(latest.id, campaignUpdates);
        if (refreshed) onCampaignUpdate(refreshed);

        return { taskId, success: true };
      } else {
        const latestTasks = (freshCampaign().workflowTasks || []).map((t) =>
          t.id === taskId ? { ...t, status: "todo" as const } : t
        );
        updateCampaign(freshCampaign().id, { workflowTasks: latestTasks });
        return { taskId, success: false, error: result.message };
      }
    } catch (err) {
      const latestTasks = (freshCampaign().workflowTasks || []).map((t) =>
        t.id === taskId ? { ...t, status: "todo" as const } : t
      );
      updateCampaign(freshCampaign().id, { workflowTasks: latestTasks });
      return { taskId, success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  async function autoExecuteAll(taskList: WorkflowTask[], campaignForApi: Campaign) {
    const executableTasks = taskList.filter(
      (t) => t.status === "todo" && EXECUTABLE_TYPES.has(t.taskType)
    );

    if (executableTasks.length === 0) return;

    setWorkflowStep("executing");
    const progress: AutoProgress = { total: executableTasks.length, done: 0, failed: 0, running: [] };
    setAutoProgress({ ...progress });

    // Mark all tasks as in_progress in store
    const allInProgress = taskList.map((t) =>
      executableTasks.some((e) => e.id === t.id) ? { ...t, status: "in_progress" as const } : t
    );
    const preUpdate = updateCampaign(campaignForApi.id, { workflowTasks: allInProgress });
    if (preUpdate) onCampaignUpdate(preUpdate);

    const queue = [...executableTasks];
    const errors: string[] = [];

    async function processNext(): Promise<void> {
      const task = queue.shift();
      if (!task) return;

      progress.running = [...progress.running, task.id];
      setAutoProgress({ ...progress });

      const result = await executeOneTask(task.id, campaignForApi);

      progress.running = progress.running.filter((id) => id !== task.id);
      if (result.success) {
        progress.done++;
      } else {
        progress.failed++;
        if (result.error) errors.push(`${task.title}: ${result.error}`);
      }
      setAutoProgress({ ...progress });

      // Trigger re-render with latest campaign from store
      const latest = freshCampaign();
      if (latest) onCampaignUpdate(latest);

      return processNext();
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, executableTasks.length) }, () => processNext());
    await Promise.all(workers);

    if (errors.length > 0) {
      setWorkflowError(`${errors.length} task(s) failed: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`);
    }

    setWorkflowStep("done");
    setAutoProgress(null);

    const latest = freshCampaign();
    if (latest) onCampaignUpdate(latest);
  }

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
        workflowOutputs: {},
        workflowStructuredOutputs: {},
        lastWorkflowRunAt: new Date().toISOString(),
      });

      if (updated) {
        onCampaignUpdate(updated);
        autoExecuteAll(workflowPlan.tasks, updated);
      }
    } catch (err) {
      setWorkflowError(err instanceof Error ? err.message : "Could not generate workflow. Check your connection and try again.");
      setWorkflowStep("error");
    }
  }

  function updateTaskStatus(taskId: string, status: WorkflowTask["status"]) {
    const latest = freshCampaign();
    const updatedTasks = (latest.workflowTasks || []).map((t) =>
      t.id === taskId ? { ...t, status } : t
    );
    const updated = updateCampaign(latest.id, { workflowTasks: updatedTasks });
    if (updated) onCampaignUpdate(updated);
  }

  async function handleExecuteTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setExecutingTaskId(taskId);
    updateTaskStatus(taskId, "in_progress");

    const result = await executeOneTask(taskId, campaign);

    if (!result.success && result.error) {
      setWorkflowError(`"${task.title}" could not complete: ${result.error}`);
    }

    setExecutingTaskId(null);
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
      setWorkflowError(err instanceof Error ? err.message : "Could not replan workflow. Check your connection and try again.");
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

  const isBusy = workflowStep === "generating" || workflowStep === "executing" || replanStep === "generating";

  return (
    <div className="border border-border bg-card p-6 mb-10 animate-fade-up" style={{ animationDelay: "140ms" }}>
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
          {plan && stats.done > 0 && !isAutoExecuting && (
            <button
              onClick={handleReplan}
              disabled={isBusy}
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
            disabled={isBusy}
            className="bg-accent text-white px-6 py-2.5 text-xs font-medium tracking-widest uppercase hover:bg-accent-hover transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(workflowStep === "generating" || workflowStep === "executing") && (
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
              : workflowStep === "executing"
              ? "Running..."
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

      {!plan && workflowStep !== "generating" && workflowStep !== "executing" && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 text-accent/20 select-none">◊</div>
          <p className="text-muted text-sm max-w-md mx-auto">
            Generate a workflow plan from your campaign objective. The AI will create a prioritized,
            multi-channel task list and automatically generate all content — you just review and post.
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

      {/* Auto-execute progress */}
      {isAutoExecuting && autoProgress && (
        <div className="border border-accent/30 bg-accent/5 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-accent animate-dot"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs font-medium tracking-widest uppercase text-accent">
                Generating all content...
              </span>
            </div>
            <span className="text-xs text-muted">
              {autoProgress.done + autoProgress.failed}/{autoProgress.total} complete
              {autoProgress.failed > 0 && (
                <span className="text-red-500 ml-1">({autoProgress.failed} failed)</span>
              )}
            </span>
          </div>
          <div className="w-full h-1.5 bg-border overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${((autoProgress.done + autoProgress.failed) / autoProgress.total) * 100}%` }}
            />
          </div>
          {autoProgress.running.length > 0 && (
            <p className="text-[10px] text-muted mt-2">
              Running {autoProgress.running.length} task{autoProgress.running.length !== 1 ? "s" : ""} in parallel...
            </p>
          )}
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
                            EXECUTABLE_TYPES.has(task.taskType) && !executingTaskId && !isAutoExecuting
                          }
                          output={campaign.workflowOutputs?.[task.id]}
                          structuredOutput={campaign.workflowStructuredOutputs?.[task.id]}
                          campaign={campaign}
                          onCampaignUpdate={onCampaignUpdate}
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

function buildMarkdownSummary(artifactKey: string, data: unknown): string {
  if (artifactKey === "socialPosts") {
    const d = data as SocialOutput;
    const lines = d.posts.map(
      (p) => `### ${p.platform.toUpperCase()}\n\n${p.text}\n\n*${p.charCount} chars* | ${p.hashtags.join(" ")}`
    );
    return `# Social Posts\n\n${d.posts.length} posts generated\n\n---\n\n${lines.join("\n\n---\n\n")}`;
  }
  if (artifactKey === "prPitches") {
    const d = data as PrOutput;
    const lines = d.pitches.map(
      (p) => `### ${p.outletType}\n\n**Subject:** ${p.subjectLine}\n\n${p.body}\n\n*Target:* ${p.targetDescription}`
    );
    return `# PR Pitches\n\n${d.pitches.length} pitches generated\n\n---\n\n${lines.join("\n\n---\n\n")}`;
  }
  if (artifactKey === "emailSequence") {
    const d = data as EmailOutput;
    const lines = d.sequence.map(
      (e) => `### Email ${e.position}: ${e.subjectLine}\n\n*Send:* ${e.sendDelay}\n\n${e.body}\n\n**CTA:** ${e.ctaText}`
    );
    return `# Email Sequence\n\n${d.sequence.length} emails generated\n\n---\n\n${lines.join("\n\n---\n\n")}`;
  }
  if (artifactKey === "reviewTemplates") {
    const d = data as ReviewOutput;
    const lines = d.templates.map(
      (t) => `### ${t.platform}\n\n**Subject:** ${t.subjectLine}\n\n${t.body}\n\n*Timing:* ${t.timing}`
    );
    return `# Review Templates\n\n${d.templates.length} templates generated\n\n---\n\n${lines.join("\n\n---\n\n")}`;
  }
  return "";
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
