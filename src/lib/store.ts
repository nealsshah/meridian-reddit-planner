import type { QueryPlanOutput, ThreadDraft } from "./plans/validators";
import type { CitationResult } from "./plans/citationValidators";
import type { GeneratedArticle } from "./plans/articleValidators";
import type { RedditThread } from "@/app/api/reddit/search/route";

export type CitationResultsByPrompt = Record<string, CitationResult>;

export type DisclosurePolicy = "always" | "optional" | "never";
export type PromotionStrength = "soft" | "medium" | "strong";

export type SavedDraft = {
  thread: RedditThread;
  draft: ThreadDraft;
  editedComment: string;
};

export type Campaign = {
  id: string;
  brandName: string;
  category: string;
  goalPrompts: string;
  targetSubs: string;
  brandVoice: string;
  doNotSay: string;
  disclosurePolicy: DisclosurePolicy;
  promotionStrength: PromotionStrength;
  brandDomain?: string;
  competitors?: string;
  createdAt: string;
  queryPlan: QueryPlanOutput | null;
  savedDrafts: SavedDraft[];
  citationResults?: CitationResultsByPrompt;
  lastCitationRunAt?: string;
  citationError?: string;
  generatedArticles?: Record<string, GeneratedArticle>;
};

const STORAGE_KEY = "meridian-campaigns";

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function load(): Campaign[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function save(campaigns: Campaign[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
}

export function getCampaigns(): Campaign[] {
  return load();
}

export function getCampaign(id: string): Campaign | undefined {
  return load().find((c) => c.id === id);
}

export function createCampaign(
  data: Omit<Campaign, "id" | "createdAt" | "queryPlan" | "savedDrafts" | "citationResults" | "lastCitationRunAt" | "citationError" | "generatedArticles">
): Campaign {
  const campaigns = load();
  const campaign: Campaign = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    queryPlan: null,
    savedDrafts: [],
  };
  campaigns.unshift(campaign);
  save(campaigns);
  return campaign;
}

export function updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
  const campaigns = load();
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  campaigns[idx] = { ...campaigns[idx], ...updates };
  save(campaigns);
  return campaigns[idx];
}

export function deleteCampaign(id: string) {
  const campaigns = load().filter((c) => c.id !== id);
  save(campaigns);
}
