import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import type { ExecutorResult } from "../registry";

export async function executeSocialTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  const res = await fetch(`${baseUrl}/api/social/generate`, {
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
      message: data.error || "Social post generation failed",
      artifactKey: "socialPosts",
    };
  }

  const result = await res.json();
  return {
    taskId: task.id,
    success: true,
    message: `Generated ${result.posts?.length ?? 0} social posts`,
    artifactKey: "socialPosts",
    data: result,
  };
}
