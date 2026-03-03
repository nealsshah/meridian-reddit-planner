import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import type { ExecutorResult } from "../registry";

export async function executeReviewTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  const res = await fetch(`${baseUrl}/api/reviews/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandName: campaign.brandName,
      category: campaign.category,
      brandVoice: campaign.brandVoice,
      taskTitle: task.title,
      taskDescription: task.description,
      rationale: task.rationale,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    return {
      taskId: task.id,
      success: false,
      message: data.error || "Review template generation failed",
      artifactKey: "reviewTemplates",
    };
  }

  const result = await res.json();
  return {
    taskId: task.id,
    success: true,
    message: `Generated ${result.templates?.length ?? 0} review templates`,
    artifactKey: "reviewTemplates",
    data: result,
  };
}
