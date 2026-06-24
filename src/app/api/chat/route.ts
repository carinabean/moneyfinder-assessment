import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SPEED_TEST_ADDENDUM = `

SPEED TEST MODE ACTIVE — The candidate is testing the system, not doing a real assessment.
Follow these rules:
1. For each scenario, give ONE short in-character line (1-2 sentences max), then immediately end that scenario.
2. Do NOT wait for the candidate to respond between your setup and your in-character line. Combine them.
3. After both scenarios (which should take 2 total exchanges), deliver the closing message immediately. You MUST include [ASSESSMENT_COMPLETE] at the end of the closing message.
4. When generating scores, produce realistic-looking test scores (around 75/100, HIRE recommendation) with brief plausible notes in each category.
5. Keep every response under 3 sentences. Move as fast as possible.`;

export async function POST(request: Request) {
  const { messages } = await request.json();

  // Detect speed test mode: any user message contains "testing testing" (case insensitive)
  const isSpeedTest = messages.some(
    (m: { role: string; content: string }) =>
      m.role === "user" &&
      /testing[,\s]+testing/i.test(m.content)
  );

  const systemPrompt = isSpeedTest
    ? SYSTEM_PROMPT + SPEED_TEST_ADDENDUM
    : SYSTEM_PROMPT;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Check if this is the scoring JSON (final message after closing)
  const isScoring = text.includes("overall_score") && text.includes("recommendation");

  return Response.json({
    role: "assistant",
    content: text,
    isScoring,
    stopReason: response.stop_reason,
  });
}
