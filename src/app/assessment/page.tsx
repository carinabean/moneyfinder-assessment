"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VoiceChat from "@/components/VoiceChat";
import { PREP_SHEET_CONTENT } from "@/lib/prompts";

export default function AssessmentPage() {
  const [step, setStep] = useState<"form" | "chat">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [candidatePageId, setCandidatePageId] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/lookup-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      setCandidatePageId(data.candidate.pageId);
      setStep("chat");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  if (step === "chat") {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <div className="bg-mf-navy py-3 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold text-white tracking-tight">
              MoneyFinder Skills Assessment
            </h1>
            <p className="text-white/60 text-sm">{name}</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex gap-4 py-4 px-4">
          {/* Main chat area */}
          <div className="flex-1 min-w-0">
            <VoiceChat
              candidateName={name}
              candidateEmail={email}
              candidatePageId={candidatePageId}
              onComplete={() => router.push("/thank-you")}
            />
          </div>
          {/* Reference panel */}
          <ReferencePanel />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="bg-mf-navy py-4 px-6">
        <h1 className="text-center text-xl font-bold text-white tracking-tight">
          MoneyFinder Skills Assessment
        </h1>
      </div>

      <div className="flex items-center justify-center flex-1 min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-mf-teal text-lg font-medium">
              Enter your information to begin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-mf-navy mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 border border-mf-navy/20 rounded-[10px] text-foreground bg-white
                  focus:outline-none focus:ring-2 focus:ring-mf-green focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-mf-navy mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-4 py-3 border border-mf-navy/20 rounded-[10px] text-foreground bg-white
                  focus:outline-none focus:ring-2 focus:ring-mf-green focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-mf-orange/10 border border-mf-orange/30 rounded-[10px] p-4">
                <p className="text-mf-orange text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className="w-full py-3 px-6 bg-mf-green text-white rounded-[10px] font-bold text-lg
                hover:bg-mf-green-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "Looking you up..." : "Begin Assessment"}
            </button>
          </form>

          <p className="text-center text-foreground/40 text-xs mt-6">
            Make sure your microphone is enabled. This assessment uses voice
            interaction.
          </p>
        </div>
      </div>
    </main>
  );
}

function ReferencePanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const content = PREP_SHEET_CONTENT;

  return (
    <div
      className={`shrink-0 transition-all duration-200 ${isCollapsed ? "w-10" : "w-72"}`}
    >
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-10 h-10 bg-mf-navy/10 rounded-[10px] flex items-center justify-center
            hover:bg-mf-navy/20 transition-colors"
          title="Show reference notes"
        >
          <svg className="w-4 h-4 text-mf-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </button>
      ) : (
        <div className="bg-white border border-mf-navy/10 rounded-[10px] h-[calc(100vh-140px)] overflow-y-auto shadow-sm">
          <div className="sticky top-0 bg-mf-navy rounded-t-[10px] px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              Reference Notes
            </span>
            <button
              onClick={() => setIsCollapsed(true)}
              className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white"
              title="Collapse"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-3 space-y-4 text-xs text-foreground/80">
            <RefSection title={content.scenarioContext.title}>
              {content.scenarioContext.points.map((p, i) => (
                <li key={i} className="font-semibold text-mf-teal">{p}</li>
              ))}
            </RefSection>
            <RefSection title={content.competitorResearch.title}>
              {content.competitorResearch.points.map((p, i) => (
                <li key={i} className="font-medium">{p}</li>
              ))}
            </RefSection>
            <RefSection title={content.aboutMoneyFinder.title}>
              {content.aboutMoneyFinder.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </RefSection>
          </div>
        </div>
      )}
    </div>
  );
}

function RefSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-bold text-mf-navy mb-1">{title}</h3>
      <ul className="space-y-1 list-disc list-inside text-foreground/70">
        {children}
      </ul>
    </div>
  );
}
