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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  const canSubmit = brandName.trim() && category.trim() && goalPrompts.trim() && objective.trim();

  function handleSubmit() {
    if (!canSubmit) return;
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

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors duration-150 placeholder:text-muted/50";
  const labelClass =
    "text-xs font-medium tracking-[0.15em] uppercase text-muted";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-up">
        <div className="text-5xl mb-5 text-accent select-none">◊</div>
        <h1 className="font-display text-5xl md:text-6xl mb-3">New Campaign</h1>
        <p className="text-sm text-muted max-w-sm mx-auto">
          We&apos;ll generate a multi-channel workflow and produce all the content automatically.
        </p>
      </div>

      {/* Context fields */}
      <div
        className="rounded-xl border border-border bg-card p-5 mb-5 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        {/* Brand + Category */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className={labelClass}>
              Brand Name <span className="text-accent">*</span>
            </label>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Nike"
              aria-label="Brand name"
              className={`${inputClass} mt-2`}
            />
          </div>
          <div>
            <label className={labelClass}>
              Category <span className="text-accent">*</span>
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Running Shoes"
              aria-label="Category"
              className={`${inputClass} mt-2`}
            />
          </div>
        </div>

        {/* Goal Prompts */}
        <div>
          <label className={labelClass}>
            Goal Prompts <span className="text-accent">*</span>
          </label>
          <textarea
            value={goalPrompts}
            onChange={(e) => setGoalPrompts(e.target.value)}
            rows={3}
            aria-label="Goal prompts"
            placeholder={"best running shoes for beginners\nbest marathon training shoes\naffordable running shoes 2026"}
            className={`${inputClass} mt-2 resize-none`}
          />
          <p className="text-[10px] text-muted mt-1.5">
            Search queries where you want your brand appearing in AI and search results
          </p>
        </div>
      </div>

      {/* Objective — primary input */}
      <div
        className="rounded-xl border border-border bg-card animate-fade-up focus-within:border-foreground transition-colors duration-150"
        style={{ animationDelay: "120ms" }}
      >
        <div className="px-5 pt-4 pb-1">
          <label className={labelClass}>
            Objective <span className="text-accent">*</span>
          </label>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label="Campaign objective"
            placeholder="What do you want to achieve? e.g. Get my brand cited when users ask about running shoes, drive organic traffic, build Reddit presence..."
            className="w-full bg-transparent px-5 pr-14 pb-4 pt-2 text-sm leading-relaxed focus:outline-none resize-none placeholder:text-muted/50 min-h-[52px]"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="Create campaign"
            className="absolute right-3 bottom-3 w-9 h-9 rounded-lg flex items-center justify-center bg-accent text-white hover:bg-accent-hover active:scale-95 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <p
        className="text-[10px] text-muted mt-2 ml-1 animate-fade-up"
        style={{ animationDelay: "180ms" }}
      >
        Press <kbd className="px-1 py-0.5 rounded bg-foreground/5 text-foreground text-[10px] font-mono">Enter</kbd> to create &middot; <kbd className="px-1 py-0.5 rounded bg-foreground/5 text-foreground text-[10px] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
