import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";

export type ExecutorResult = {
  taskId: string;
  success: boolean;
  message: string;
  artifactKey: string;
  data?: unknown;
};

type TaskExecutor = (task: WorkflowTask, campaign: Campaign, baseUrl: string) => Promise<ExecutorResult>;

const executorMap: Record<string, TaskExecutor> = {};

export function registerExecutor(taskType: string, executor: TaskExecutor) {
  executorMap[taskType] = executor;
}

export function getExecutor(taskType: string): TaskExecutor | undefined {
  return executorMap[taskType];
}

export function hasExecutor(taskType: string): boolean {
  return taskType in executorMap;
}

export function getExecutableTaskTypes(): string[] {
  return Object.keys(executorMap);
}

async function lazyLoadExecutors() {
  if (Object.keys(executorMap).length > 0) return;

  const { executeRedditTask } = await import("./executors/reddit");
  const { executeCitationTask } = await import("./executors/citations");
  const { executeSeoTask } = await import("./executors/seo");
  const { executeContentTask } = await import("./executors/content");
  const { executeSocialTask } = await import("./executors/social");
  const { executePrTask } = await import("./executors/pr");
  const { executeEmailTask } = await import("./executors/email");
  const { executeReviewTask } = await import("./executors/reviews");

  registerExecutor("reddit_engagement", executeRedditTask);
  registerExecutor("citation_gap_analysis", executeCitationTask);
  registerExecutor("pillar_article", executeSeoTask);
  registerExecutor("comparison_page", executeSeoTask);
  registerExecutor("faq_page", executeSeoTask);
  registerExecutor("data_study", executeSeoTask);
  registerExecutor("social_repurpose", executeSocialTask);
  registerExecutor("pr_pitch", executePrTask);
  registerExecutor("email_nurture", executeEmailTask);
  registerExecutor("review_acquisition", executeReviewTask);
  registerExecutor("competitor_audit", executeContentTask);
}

export async function executeTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  await lazyLoadExecutors();

  const executor = getExecutor(task.taskType);
  if (!executor) {
    return {
      taskId: task.id,
      success: false,
      message: `No executor registered for task type "${task.taskType}". This task requires manual execution.`,
      artifactKey: "",
    };
  }

  return executor(task, campaign, baseUrl);
}
