import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import type { ExecutorResult } from "../registry";

export async function executeCitationTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  const prompts = campaign.goalPrompts.split("\n").filter(Boolean);
  const competitors = campaign.competitors
    ? campaign.competitors.split("\n").filter(Boolean)
    : [];

  const res = await fetch(`${baseUrl}/api/citations/capture`, {
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
    return {
      taskId: task.id,
      success: false,
      message: data.error || "Citation capture failed",
      artifactKey: "citationResults",
    };
  }

  const result = await res.json();
  return {
    taskId: task.id,
    success: true,
    message: `Captured citations for ${result.results?.length ?? 0} prompts`,
    artifactKey: "citationResults",
    data: result,
  };
}
