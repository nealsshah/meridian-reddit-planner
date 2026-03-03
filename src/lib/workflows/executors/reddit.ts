import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import type { ExecutorResult } from "../registry";

export async function executeRedditTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  const res = await fetch(`${baseUrl}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandName: campaign.brandName,
      category: campaign.category,
      goalPrompts: campaign.goalPrompts,
      targetSubs: campaign.targetSubs,
      brandVoice: campaign.brandVoice,
      doNotSay: campaign.doNotSay,
      disclosurePolicy: campaign.disclosurePolicy,
      promotionStrength: campaign.promotionStrength,
      draftCount: 5,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    return {
      taskId: task.id,
      success: false,
      message: data.error || "Reddit run failed",
      artifactKey: "savedDrafts",
    };
  }

  const result = await res.json();
  return {
    taskId: task.id,
    success: true,
    message: `Generated ${result.drafts?.length ?? 0} Reddit draft comments`,
    artifactKey: "savedDrafts",
    data: result,
  };
}
