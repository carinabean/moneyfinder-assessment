"use client";

import { useState } from "react";
import { PREP_SHEET_CONTENT } from "@/lib/prompts";
import { useRouter } from "next/navigation";

export default function PrepPage() {
  const [acknowledged, setAcknowledged] = useState(false);
  const router = useRouter();
  const content = PREP_SHEET_CONTENT;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Top bar */}
      <div className="bg-mf-navy py-4 px-6">
        <h1 className="text-center text-xl font-bold text-white tracking-tight">
          MoneyFinder Skills Assessment
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Subtitle */}
        <div className="text-center mb-10">
          <p className="text-mf-teal text-lg font-medium">
            Candidate Preparation Guide
          </p>
        </div>

        {/* Intro card */}
        <div className="bg-white border border-mf-green/20 rounded-[10px] p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-mf-navy mb-2">
            What to Expect
          </h2>
          <p className="text-foreground/80 mb-3">
            This assessment is a single short negotiation scenario that lets us
            see how you think about negotiating a bill. It lasts about five
            minutes.
          </p>
          <p className="text-foreground/80 mb-3">
            <strong>The scenario:</strong> You&apos;re a Spectrum customer
            of four years. Your bill just jumped from $150 to $195/month
            because your promotional rate expired. You&apos;ve done some
            research and you know your actual usage. You&apos;ll call
            Spectrum and try to negotiate the bill back down. The scenario
            details below are what you know going into the call.
          </p>
          <p className="text-foreground/80">
            There are no trick questions. Just handle the conversation as
            naturally as you can. Review the information below so you have
            some useful context before you begin.
          </p>
        </div>

        {/* About MoneyFinder */}
        <Section title={content.aboutMoneyFinder.title}>
          <ul className="space-y-2">
            {content.aboutMoneyFinder.points.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mf-green shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Scenario Context */}
        <Section title={content.scenarioContext.title}>
          <div className="grid grid-cols-1 gap-3">
            {content.scenarioContext.points.map((p, i) => (
              <div
                key={i}
                className="bg-mf-green/10 border border-mf-green/20 rounded-[10px] p-4"
              >
                <p className="text-mf-teal font-semibold text-sm">{p}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Competitor Research */}
        <Section title={content.competitorResearch.title}>
          <ul className="space-y-2">
            {content.competitorResearch.points.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mf-green shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* CTA */}
        <div className="mt-10 border-t border-mf-green/20 pt-8">
          <label className="flex items-start gap-3 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-mf-navy/30 accent-mf-green"
            />
            <span className="text-foreground/80">
              I&apos;ve reviewed the information above and I&apos;m ready to
              begin the assessment.
            </span>
          </label>
          <button
            disabled={!acknowledged}
            onClick={() => router.push("/assessment")}
            className="w-full py-4 px-8 bg-mf-green text-white rounded-[10px] font-bold text-lg
              hover:bg-mf-green-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Assessment
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-mf-navy mb-4">{title}</h2>
      <div className="text-foreground/80">{children}</div>
    </section>
  );
}
