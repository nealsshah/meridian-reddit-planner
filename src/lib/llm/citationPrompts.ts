export function buildCitationCapturePrompt(inputs: {
  brandName: string;
  brandDomain?: string;
  category: string;
  competitors?: string[];
  prompt: string;
}): string {
  const competitorList =
    inputs.competitors && inputs.competitors.length > 0
      ? inputs.competitors.join(", ")
      : "None provided";

  return `You are an LLM citation analyst. Your job is to answer a user's goal prompt using web search, then analyze which sources get cited and what content the brand should publish to compete for those citations.

Brand: ${inputs.brandName}
Brand domain: ${inputs.brandDomain || "Not provided"}
Category: ${inputs.category}
Competitors: ${competitorList}

Goal prompt to answer:
"${inputs.prompt}"

Instructions:
1. Use web search to answer the goal prompt as an LLM would answer it for a real user.
2. Note every URL you found via search that informed your answer.
3. Analyze which sources would be cited by an LLM answering this prompt.
4. Identify gaps where the brand could publish content to earn citations.
5. Generate content briefs the brand should create to compete for citation slots.

Rules:
- Do NOT copy text verbatim from any source.
- Do NOT bash competitors. Be factual and neutral.
- Every brief MUST include "Do not copy text verbatim" in its safetyNotes array.
- Return at least 3 content briefs per prompt.
- Citations should include real URLs you found, not made-up ones.

Return ONLY valid JSON matching this exact schema:
{
  "prompt": "the goal prompt",
  "answerSummary": "a 2-3 sentence summary of how an LLM would answer this prompt",
  "topPicks": ["brand or product names the LLM would likely recommend"],
  "citations": [
    {
      "url": "https://example.com/page",
      "domain": "example.com",
      "title": "Page title",
      "citationRole": "primary source | supporting evidence | product page | review | comparison",
      "relevanceToBrand": "how this citation relates to the brand's opportunity",
      "notes": "any extra context"
    }
  ],
  "gaps": ["content topics where the brand has no presence but could earn citations"],
  "briefs": [
    {
      "briefTitle": "Title of the content piece to create",
      "pageType": "guide | comparison | review | landing page | blog post | FAQ",
      "primaryIntent": "what the reader should learn or do",
      "targetKeyword": "primary keyword to target",
      "outline": ["Section 1: ...", "Section 2: ...", "Section 3: ..."],
      "whatToProve": "the key claim or value proposition this content must establish",
      "internalLinks": ["pages on the brand site to link to"],
      "schemaSuggestions": ["FAQ schema", "HowTo schema", "Product schema"],
      "competesWith": "URL or domain this content would compete with for citations",
      "safetyNotes": ["Do not copy text verbatim"]
    }
  ]
}`;
}
