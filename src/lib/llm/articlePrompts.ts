import type { Brief } from "../plans/citationValidators";

export function buildArticlePrompt(inputs: {
  brandName: string;
  brandDomain?: string;
  category: string;
  brief: Brief;
  citationUrls: string[];
}): string {
  const { brandName, brandDomain, category, brief, citationUrls } = inputs;

  const urlList = citationUrls.length > 0
    ? citationUrls.map((u) => `  - ${u}`).join("\n")
    : "  (none provided)";

  return `You are a content writer for ${brandName}, a brand in the ${category} space${brandDomain ? ` (${brandDomain})` : ""}.

Write a full, publish-ready article based on the content brief below. The article should be 1000-2000 words, well-structured with markdown headings, and grounded in real data from web search.

## Content Brief

**Title:** ${brief.briefTitle}
**Page Type:** ${brief.pageType}
**Primary Intent:** ${brief.primaryIntent}
**Target Keyword:** ${brief.targetKeyword}
**What to Prove:** ${brief.whatToProve}

**Outline:**
${brief.outline.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

## Source URLs to reference
${urlList}

## Instructions
1. Use web search to find current data, statistics, and facts to include in the article.
2. Follow the outline structure but write naturally — use the sections as a guide, not rigid headers.
3. Naturally incorporate the target keyword "${brief.targetKeyword}" throughout the article.
4. Reference the source URLs above where relevant, and include any additional sources you find via search.
5. Write in a knowledgeable, helpful tone appropriate for the ${category} space.
6. Include a brief introduction and conclusion.

## Safety rules
- Do NOT copy text verbatim from any source. Paraphrase and synthesize.
- Do NOT bash or disparage competitors. Be factual and neutral when comparing.
- Attribute claims to their sources where appropriate.
- Do NOT make unsubstantiated health, financial, or legal claims.
When you answer, return ONLY the full article content in markdown. Do not include any explanation, notes, or JSON – just the article itself.`; 
}
