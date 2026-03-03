import { TASK_TYPES, CHANNELS } from "../plans/workflowValidators";

export function buildWorkflowPlannerPrompt(inputs: {
  brandName: string;
  category: string;
  objective: string;
  goalPrompts: string;
  brandDomain?: string;
  competitors?: string;
  brandVoice?: string;
}): string {
  const { brandName, category, objective, goalPrompts, brandDomain, competitors, brandVoice } = inputs;

  return `You are a senior digital marketing strategist. Your job is to turn a brand's objective into a concrete, prioritized, multi-channel workflow plan.

## Brand Context
- **Brand:** ${brandName}
- **Category:** ${category}
- **Domain:** ${brandDomain || "(not provided)"}
- **Voice:** ${brandVoice || "helpful, practical, no marketing tone"}
- **Competitors:** ${competitors || "(none provided)"}

## Objective (natural language)
${objective}

## Goal Prompts (user intent queries the brand wants to appear in)
${goalPrompts}

## Your Task
Generate a workflow plan with 8-15 actionable tasks across multiple channels. Each task should be specific enough that a marketer can execute or approve it.

### Available task types
${TASK_TYPES.join(", ")}

### Available channels
${CHANNELS.join(", ")}

### Guidelines
1. Start with quick wins (Reddit engagement, FAQ pages) that deliver results in days.
2. Layer in medium-term authority builders (pillar articles, data studies, comparison pages).
3. Include LLM visibility tasks (citation gap analysis, content briefs for cite-worthy assets).
4. Add distribution/amplification tasks (social repurpose, email, PR) where they make sense.
5. Each task needs a clear rationale tied back to the objective.
6. Assign realistic priority scores (1-100, higher = more important).
7. Set effort levels honestly: "low" = < 2 hours, "medium" = 2-8 hours, "high" = 8+ hours.
8. Include 3-5 measurable KPIs that tie back to the objective.
9. Generate unique task IDs using the format "task_001", "task_002", etc.

## Output Format
Return ONLY valid JSON, no markdown fences, matching this exact schema:
{
  "goal": "restatement of the objective in one clear sentence",
  "audience": "who the brand is trying to reach",
  "channels": ["reddit", "seo_content", ...],
  "timeline": {
    "quickWins": "what can be done in week 1",
    "shortTerm": "what to accomplish in weeks 2-4",
    "longTerm": "compounding bets for months 2-3"
  },
  "tasks": [
    {
      "id": "task_001",
      "taskType": "reddit_engagement",
      "channel": "reddit",
      "title": "short task name",
      "description": "specific instructions for what to do",
      "priority": 90,
      "effort": "low",
      "expectedImpact": "medium",
      "artifactType": "reddit_comments",
      "rationale": "why this task matters for the objective",
      "status": "todo",
      "dueInDays": 3
    }
  ],
  "kpis": [
    {
      "metric": "Brand mentions in Reddit threads",
      "channel": "reddit",
      "target": "15+ helpful comments posted",
      "windowDays": 30
    }
  ],
  "summary": "2-3 sentence executive summary of the plan"
}`;
}

export function buildReplanPrompt(inputs: {
  brandName: string;
  category: string;
  objective: string;
  currentPlan: string;
  completedTasks: string;
  kpiStatus: string;
}): string {
  return `You are a marketing strategist reviewing a campaign's progress and replanning.

## Brand: ${inputs.brandName} (${inputs.category})

## Original Objective
${inputs.objective}

## Current Plan
${inputs.currentPlan}

## Completed Tasks
${inputs.completedTasks}

## KPI Status
${inputs.kpiStatus}

## Your Task
Review what has been accomplished and what the KPIs show. Then generate an updated workflow plan that:
1. Keeps tasks that are still valuable and not yet done
2. Reprioritizes based on what worked and what didn't
3. Adds new tasks if gaps are evident
4. Updates KPI targets based on current trajectory
5. Removes or deprioritizes tasks that no longer make sense

Return ONLY valid JSON matching the same workflow plan schema (goal, audience, channels, timeline, tasks, kpis, summary).`;
}
