import type { CitationResult } from "../plans/citationValidators";
import type { GeneratedArticle } from "../plans/articleValidators";

export function renderCitationMarkdown(data: {
  brandName: string;
  category: string;
  results: CitationResult[];
  generatedArticles?: Record<string, GeneratedArticle>;
}): string {
  const { brandName, category, results, generatedArticles } = data;
  const lines: string[] = [];

  lines.push(`# Citation Analysis — ${brandName} (${category})`);
  lines.push("");

  for (const r of results) {
    lines.push(`## Prompt: "${r.prompt}"`);
    lines.push("");

    lines.push("### Answer Summary");
    lines.push(r.answerSummary);
    lines.push("");

    if (r.topPicks && r.topPicks.length > 0) {
      lines.push("### Top Picks");
      for (const pick of r.topPicks) {
        lines.push(`- ${pick}`);
      }
      lines.push("");
    }

    if (r.citations.length > 0) {
      lines.push("### Citations");
      lines.push("");
      lines.push("| Domain | Title | URL | Role | Relevance | Notes |");
      lines.push("|--------|-------|-----|------|-----------|-------|");
      for (const c of r.citations) {
        lines.push(
          `| ${c.domain} | ${c.title} | [Link](${c.url}) | ${c.citationRole} | ${c.relevanceToBrand} | ${c.notes || ""} |`
        );
      }
      lines.push("");
    }

    if (r.gaps && r.gaps.length > 0) {
      lines.push("### Content Gaps");
      for (const gap of r.gaps) {
        lines.push(`- ${gap}`);
      }
      lines.push("");
    }

    if (r.briefs.length > 0) {
      lines.push("### Content Briefs");
      lines.push("");
      for (const b of r.briefs) {
        lines.push(`#### ${b.briefTitle}`);
        lines.push(`- **Page Type:** ${b.pageType}`);
        lines.push(`- **Primary Intent:** ${b.primaryIntent}`);
        lines.push(`- **Target Keyword:** ${b.targetKeyword}`);
        lines.push(`- **What to Prove:** ${b.whatToProve}`);
        if (b.competesWith) {
          lines.push(`- **Competes With:** ${b.competesWith}`);
        }
        lines.push("");
        lines.push("**Outline:**");
        for (const section of b.outline) {
          lines.push(`  1. ${section}`);
        }
        if (b.internalLinks && b.internalLinks.length > 0) {
          lines.push("");
          lines.push("**Internal Links:**");
          for (const link of b.internalLinks) {
            lines.push(`  - ${link}`);
          }
        }
        if (b.schemaSuggestions && b.schemaSuggestions.length > 0) {
          lines.push("");
          lines.push("**Schema Suggestions:**");
          for (const s of b.schemaSuggestions) {
            lines.push(`  - ${s}`);
          }
        }
        if (b.safetyNotes && b.safetyNotes.length > 0) {
          lines.push("");
          lines.push("**Safety Notes:**");
          for (const n of b.safetyNotes) {
            lines.push(`  - ${n}`);
          }
        }
        lines.push("");

        const article = generatedArticles?.[b.briefTitle];
        if (article) {
          lines.push(`##### Generated Article: ${article.title}`);
          lines.push(`*${article.wordCount} words*`);
          lines.push("");
          lines.push(article.content);
          lines.push("");
          if (article.sourcesUsed.length > 0) {
            lines.push("**Sources:**");
            for (const src of article.sourcesUsed) {
              lines.push(`  - ${src}`);
            }
            lines.push("");
          }
        }
      }
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
