"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createCampaign } from "@/lib/store";

export default function NewCampaignPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState("");
  const [goalPrompts, setGoalPrompts] = useState("");
  const [objective, setObjective] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const objectiveRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    objectiveRef.current?.focus();
  }, []);

  function autoResize() {
    const el = objectiveRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }

  const canSubmit = brandName.trim() && category.trim() && goalPrompts.trim() && objective.trim();

  function handleSubmit() {
    if (!canSubmit || submitted) return;
    setSubmitted(true);
    const campaign = createCampaign({
      brandName: brandName.trim(),
      category: category.trim(),
      goalPrompts: goalPrompts.trim(),
      objective: objective.trim(),
      targetSubs: "",
      brandVoice: "helpful, practical, no marketing tone",
      doNotSay: "buy now, limited time, best on the market, #1 guaranteed",
      disclosurePolicy: "optional",
      promotionStrength: "medium",
      brandDomain: "",
      competitors: "",
    });
    router.push(`/campaigns/${campaign.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Headline */}
      <div className="animate-fade-up mb-16">
        <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted mb-4">
          New Campaign
        </p>
        <h1 className="font-display text-6xl md:text-8xl leading-[0.9] tracking-tight">
          What are we<br />
          <span className="text-accent italic">building?</span>
        </h1>
      </div>

      {/* Brand + Category — inline sentence style */}
      <div
        className="mb-14 animate-fade-up"
        style={{ animationDelay: "80ms" }}
      >
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-5">
          The brand
        </p>
        <div className="flex items-baseline gap-3 flex-wrap text-2xl md:text-3xl font-display leading-tight">
          <span className="text-foreground/30">Run a campaign for</span>
          <span className="relative">
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="brand"
              className="bg-transparent border-b-2 border-foreground/20 focus:border-accent text-foreground font-display text-2xl md:text-3xl focus:outline-none transition-colors w-[180px] md:w-[220px] placeholder:text-foreground/15 pb-1"
            />
          </span>
          <span className="text-foreground/30">in</span>
          <span className="relative">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="category"
              className="bg-transparent border-b-2 border-foreground/20 focus:border-accent text-foreground font-display text-2xl md:text-3xl focus:outline-none transition-colors w-[200px] md:w-[260px] placeholder:text-foreground/15 pb-1"
            />
          </span>
        </div>
      </div>

      {/* Goal Prompts */}
      <div
        className="mb-14 animate-fade-up"
        style={{ animationDelay: "160ms" }}
      >
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-4">
          Targeting these queries
        </p>
        <textarea
          value={goalPrompts}
          onChange={(e) => setGoalPrompts(e.target.value)}
          rows={3}
          placeholder={"best running shoes for beginners\nbest marathon training shoes\naffordable running shoes 2026"}
          className="w-full bg-transparent border-b-2 border-foreground/10 focus:border-foreground/30 px-0 py-3 text-base leading-relaxed focus:outline-none resize-none transition-colors placeholder:text-foreground/15"
        />
      </div>

      {/* Objective — the hero input */}
      <div
        className="animate-fade-up"
        style={{ animationDelay: "240ms" }}
      >
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted mb-4">
          Objective
        </p>
        <div className="relative border-l-4 border-accent bg-card">
          <textarea
            ref={objectiveRef}
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Describe what you want to achieve..."
            className="w-full bg-transparent pl-6 pr-16 py-5 text-lg leading-relaxed focus:outline-none resize-none placeholder:text-foreground/20"
            style={{ minHeight: "80px" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitted}
            className={`absolute right-4 bottom-4 w-11 h-11 flex items-center justify-center transition-all duration-200 ${
              canSubmit && !submitted
                ? "bg-accent text-white hover:bg-accent-hover scale-100"
                : "bg-foreground/5 text-foreground/15 scale-90 cursor-not-allowed"
            }`}
            title="Create campaign"
          >
            {submitted ? (
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 bg-current rounded-full animate-dot"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted">
            <kbd className="px-1 py-0.5 bg-foreground/[0.04] text-foreground/40 text-[9px] font-mono tracking-tight">Enter</kbd>
            <span className="mx-1.5 text-foreground/20">/</span>
            <kbd className="px-1 py-0.5 bg-foreground/[0.04] text-foreground/40 text-[9px] font-mono tracking-tight">Shift+Enter</kbd>
            <span className="ml-1.5 text-foreground/30">new line</span>
          </p>
          {canSubmit && !submitted && (
            <p className="text-[10px] text-accent font-medium tracking-wider uppercase animate-fade-up">
              Ready
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
