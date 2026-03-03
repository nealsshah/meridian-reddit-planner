"use client";

import { useRouter } from "next/navigation";
import { createCampaign, type DisclosurePolicy, type PromotionStrength } from "@/lib/store";

const inputClass =
  "w-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-foreground transition-colors";
const selectClass =
  "w-full border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:border-foreground transition-colors appearance-none cursor-pointer";
const labelClass = "block text-xs font-medium tracking-[0.15em] uppercase text-muted mb-2";

export default function NewCampaignPage() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const campaign = createCampaign({
      brandName: form.get("brandName") as string,
      category: form.get("category") as string,
      goalPrompts: form.get("goalPrompts") as string,
      objective: (form.get("objective") as string) || "",
      targetSubs: (form.get("targetSubs") as string) || "",
      brandVoice: (form.get("brandVoice") as string) || "",
      doNotSay: (form.get("doNotSay") as string) || "",
      disclosurePolicy: (form.get("disclosurePolicy") as DisclosurePolicy) || "optional",
      promotionStrength: (form.get("promotionStrength") as PromotionStrength) || "medium",
      brandDomain: (form.get("brandDomain") as string) || "",
      competitors: (form.get("competitors") as string) || "",
    });
    router.push(`/campaigns/${campaign.id}`);
  }

  return (
    <div className="max-w-2xl animate-fade-up">
      {/* Header */}
      <div className="mb-10 pb-6 border-b-2 border-foreground">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-3">
          New Campaign
        </p>
        <h1 className="font-display text-5xl">Create Campaign</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <label className={labelClass}>
            Brand Name <span className="text-accent">*</span>
          </label>
          <input name="brandName" required placeholder="e.g. Nike" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>
            Category <span className="text-accent">*</span>
          </label>
          <input name="category" required placeholder="e.g. Running Shoes" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>
            Objective
          </label>
          <textarea
            name="objective"
            rows={3}
            placeholder={"Describe what you want to achieve in plain language, e.g.:\nI want to increase visibility of my brand when users search for best running shoes for beginners. Drive more organic traffic and get cited by AI assistants."}
            className={inputClass + " resize-y"}
          />
          <p className="text-xs text-muted mt-1.5">
            Describe your marketing goal and we&apos;ll generate a multi-channel workflow to achieve it
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Goal Prompts <span className="text-accent">*</span>
          </label>
          <textarea
            name="goalPrompts"
            required
            rows={4}
            placeholder={"One per line, e.g.:\nbest running shoes\nbest marathon shoes\nrunning shoes for beginners"}
            className={inputClass + " resize-y"}
          />
          <p className="text-xs text-muted mt-1.5">
            Search queries where you want your brand to show up in AI and Reddit answers
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Target Subreddits <span className="text-muted normal-case tracking-normal text-xs">(optional)</span>
          </label>
          <textarea
            name="targetSubs"
            rows={3}
            placeholder={"One per line, e.g.:\nr/RunningShoeGeeks\nr/running"}
            className={inputClass + " resize-y"}
          />
          <p className="text-xs text-muted mt-1.5">Leave blank and we&apos;ll suggest relevant subreddits automatically</p>
        </div>

        <div>
          <label className={labelClass}>
            Brand Domain <span className="text-muted normal-case tracking-normal text-xs">(optional)</span>
          </label>
          <input
            name="brandDomain"
            placeholder="e.g. nike.com"
            className={inputClass}
          />
          <p className="text-xs text-muted mt-1.5">
            Your website domain, so we can track which AI answers already cite your content
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Competitors <span className="text-muted normal-case tracking-normal text-xs">(optional)</span>
          </label>
          <textarea
            name="competitors"
            rows={3}
            placeholder={"One per line, e.g.:\nadidas.com\nnewbalance.com"}
            className={inputClass + " resize-y"}
          />
          <p className="text-xs text-muted mt-1.5">
            Competitor websites to compare against in citation analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Disclosure Policy</label>
            <select name="disclosurePolicy" defaultValue="optional" className={selectClass}>
              <option value="always">Always disclose</option>
              <option value="optional">Optional (situational)</option>
              <option value="never">Never disclose</option>
            </select>
            <p className="text-xs text-muted mt-1.5">
              Whether generated comments should disclose the brand affiliation
            </p>
          </div>

          <div>
            <label className={labelClass}>Promotion Strength</label>
            <select name="promotionStrength" defaultValue="medium" className={selectClass}>
              <option value="soft">Soft — subtle, at most 1 mention</option>
              <option value="medium">Medium — 1-2 mentions with rationale</option>
              <option value="strong">Strong — brand-forward (auto-discloses)</option>
            </select>
            <p className="text-xs text-muted mt-1.5">
              How prominently the brand features in generated comments
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Brand Voice <span className="text-muted normal-case tracking-normal text-xs">(optional)</span>
          </label>
          <textarea
            name="brandVoice"
            rows={2}
            defaultValue="helpful, practical, no marketing tone"
            className={inputClass + " resize-y"}
          />
        </div>

        <div>
          <label className={labelClass}>
            Do-Not-Say List <span className="text-muted normal-case tracking-normal text-xs">(optional)</span>
          </label>
          <textarea
            name="doNotSay"
            rows={2}
            defaultValue={"buy now, limited time, best on the market, #1 guaranteed"}
            className={inputClass + " resize-y"}
          />
        </div>

        <div className="flex gap-3 pt-3 border-t border-border">
          <button
            type="submit"
            className="bg-accent text-white px-7 py-3 text-sm font-medium tracking-wide uppercase hover:bg-accent-hover transition-colors"
          >
            Create Campaign
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-7 py-3 text-sm font-medium tracking-wide uppercase border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all duration-150"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
