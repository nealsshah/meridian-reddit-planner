import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import type { ExecutorResult } from "../registry";

export async function executePrTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  const res = await fetch(`${baseUrl}/api/pr/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandName: campaign.brandName,
      brandDomain: campaign.brandDomain,
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
      message: data.error || "PR pitch generation failed",
      artifactKey: "prPitches",
    };
  }

  const result = await res.json();
  return {
    taskId: task.id,
    success: true,
    message: `Generated ${result.pitches?.length ?? 0} PR pitches`,
    artifactKey: "prPitches",
    data: result,
  };
}
