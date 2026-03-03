import type { SavedDraft } from "../store";
import type { QueryPlanOutput } from "../plans/validators";

type ExportData = {
  brandName: string;
  category: string;
  goalPrompts: string;
  queryPlan: QueryPlanOutput;
  savedDrafts: SavedDraft[];
};

export function renderMarkdown(data: ExportData): string {
  const { brandName, category, goalPrompts, queryPlan, savedDrafts } = data;
  const lines: string[] = [];

  lines.push(`# Reddit Action Plan — ${brandName} (${category})`);
  lines.push("");

  lines.push("## Goal Prompts");
  for (const p of goalPrompts.split("\n").filter(Boolean)) {
    lines.push(`- ${p.trim()}`);
  }
  lines.push("");

  lines.push("## Cadence");
  lines.push(`- Max comments/day: ${queryPlan.dailyCadence.maxCommentsPerDay}`);
  lines.push(`- Max posts/week: ${queryPlan.dailyCadence.maxPostsPerWeek}`);
  lines.push(`- Rotation: ${queryPlan.dailyCadence.rotationStrategy}`);
  lines.push("");

  lines.push("## Target Subreddits");
  for (const sub of queryPlan.subreddits) {
    lines.push(`### ${sub.name}`);
    lines.push(`**Why:** ${sub.why}`);
    lines.push(`**Risks:** ${sub.riskNotes}`);
    lines.push(`**Style:** ${sub.postingStyle}`);
    if (sub.ruleWarnings.length > 0) {
      for (const w of sub.ruleWarnings) lines.push(`- ${w}`);
    }
    lines.push("");
  }

  if (savedDrafts.length > 0) {
    lines.push("## Action Checklist");
    lines.push("");
    for (const sd of savedDrafts) {
      lines.push(`### r/${sd.thread.subreddit} — "${sd.thread.title}"`);
      lines.push(`- [ ] Open thread: ${sd.thread.url}`);
      lines.push(`- [ ] Post comment:`);
      lines.push("");
      lines.push("```");
      lines.push(sd.editedComment);
      lines.push("```");
      lines.push("");
      if (sd.draft.disclosureLine) {
        lines.push(`- [ ] Include disclosure: ${sd.draft.disclosureLine}`);
      }
      if (sd.draft.followUps.length > 0) {
        lines.push(`- [ ] Prepare follow-ups:`);
        for (const f of sd.draft.followUps) {
          lines.push(`  - ${f}`);
        }
      }
      if (sd.draft.mustAvoid.length > 0) {
        lines.push(`- **Avoid:** ${sd.draft.mustAvoid.join(", ")}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
