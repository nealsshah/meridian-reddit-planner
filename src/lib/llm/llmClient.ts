import { buildQueryPlannerPrompt, buildThreadSelectorPrompt, buildThreadDraftPrompt } from "./prompts";
import { buildCitationCapturePrompt } from "./citationPrompts";
import { buildArticlePrompt } from "./articlePrompts";
import {
  QueryPlanOutputSchema,
  ThreadSelectionSchema,
  ThreadDraftSchema,
  type QueryPlanOutput,
  type ThreadSelection,
  type ThreadDraft,
} from "../plans/validators";
import { CitationResultSchema, type CitationResult } from "../plans/citationValidators";
import { GeneratedArticleSchema, type GeneratedArticle } from "../plans/articleValidators";
import { ensureSafetyNote } from "../citationSafety";

async function callOpenAI(prompt: string): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });
  return response.choices[0]?.message?.content || "";
}

async function callAnthropic(prompt: string): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

function callLLM(prompt: string): Promise<string> {
  const provider = process.env.LLM_PROVIDER || "openai";
  return provider === "anthropic" ? callAnthropic(prompt) : callOpenAI(prompt);
}

export async function callOpenAIWithWebSearch(prompt: string): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    tools: [{ type: "web_search_preview" }],
    input: prompt,
  });
  return response.output_text;
}

function extractJson(raw: string): unknown {
  let str = raw.trim();
  // Strip markdown fences
  const fence = str.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fence) str = fence[1].trim();
  // Try parsing directly first
  try {
    return JSON.parse(str);
  } catch {
    // Fall back: find the outermost JSON object in the response
    const start = str.indexOf("{");
    const end = str.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(str.slice(start, end + 1));
    }
    throw new SyntaxError("No JSON object found in response");
  }
}

// ── LLM Call #1: Query Planner ──

export async function generateQueryPlan(inputs: {
  brandName: string;
  category: string;
  goalPrompts: string;
  targetSubs?: string | null;
  brandVoice?: string | null;
  doNotSay?: string | null;
}): Promise<QueryPlanOutput> {
  const prompt = buildQueryPlannerPrompt(inputs);
  const raw = await callLLM(prompt);

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for query plan");
  }

  const validated = QueryPlanOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Query plan validation failed: ${validated.error.message}`);
  }

  return validated.data;
}

// ── LLM Call #2: Thread Selector ──

export async function selectBestThreads(inputs: {
  brandName: string;
  category: string;
  goalPrompts: string;
  promotionStrength: string;
  threads: Array<{
    id: string;
    title: string;
    subreddit: string;
    selftextSnippet: string;
    score: number;
    numComments: number;
    createdUtc: number;
  }>;
  count: number;
}): Promise<ThreadSelection> {
  const prompt = buildThreadSelectorPrompt(inputs);
  const raw = await callLLM(prompt);

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for thread selection");
  }

  const validated = ThreadSelectionSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Thread selection validation failed: ${validated.error.message}`);
  }

  return validated.data;
}

// ── LLM Call #3: Thread-specific Draft ──

export async function generateThreadDraft(inputs: {
  brandName: string;
  category: string;
  brandVoice: string;
  doNotSay: string;
  disclosurePolicy: string;
  promotionStrength: string;
  thread: {
    subreddit: string;
    url: string;
    title: string;
    selftextSnippet: string;
    score: number;
    numComments: number;
    createdUtc: number;
  };
}): Promise<ThreadDraft> {
  const prompt = buildThreadDraftPrompt(inputs);
  const raw = await callLLM(prompt);

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for thread draft");
  }

  const validated = ThreadDraftSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Thread draft validation failed: ${validated.error.message}`);
  }

  return validated.data;
}

// ── LLM Call #4: Citation Capture (OpenAI web search only) ──

export async function generateCitationCapture(inputs: {
  brandName: string;
  brandDomain?: string;
  category: string;
  competitors?: string[];
  prompt: string;
}): Promise<CitationResult> {
  const systemPrompt = buildCitationCapturePrompt(inputs);
  const raw = await callOpenAIWithWebSearch(systemPrompt);

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for citation capture");
  }

  const validated = CitationResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Citation capture validation failed: ${validated.error.message}`);
  }

  const result = validated.data;
  result.briefs = ensureSafetyNote(result.briefs);
  return result;
}

// ── LLM Call #5: Article Generation (OpenAI web search only) ──

export async function generateArticle(inputs: {
  brandName: string;
  brandDomain?: string;
  category: string;
  brief: import("../plans/citationValidators").Brief;
  citationUrls: string[];
}): Promise<GeneratedArticle> {
  const prompt = buildArticlePrompt(inputs);
  const raw = await callOpenAIWithWebSearch(prompt);

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for article generation");
  }

  // Fill in fields the LLM sometimes omits
  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    if (typeof p.content === "string" && typeof p.wordCount !== "number") {
      p.wordCount = p.content.trim().split(/\s+/).length;
    }
    if (!Array.isArray(p.sourcesUsed)) p.sourcesUsed = [];
    if (!Array.isArray(p.safetyNotes)) p.safetyNotes = [];
  }

  const validated = GeneratedArticleSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Article validation failed: ${JSON.stringify(validated.error.issues)}`);
  }

  const article = validated.data;
  if (!article.safetyNotes.some((n) => n.toLowerCase().includes("verbatim"))) {
    article.safetyNotes.push("Do not copy text verbatim");
  }

  return article;
}
