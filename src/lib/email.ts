import type { AssessmentScores } from "./scoring";

function formatCategory(key: string, cat: { score: number; max: number; notes: string }): string {
  const label = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label}: ${cat.score}/${cat.max} - ${cat.notes}`;
}

export async function sendScoresEmail(
  to: string,
  candidateName: string,
  scores: AssessmentScores
) {
  const apiToken = process.env.MISSIVE_API_TOKEN;
  if (!apiToken) {
    console.warn("[email] MISSIVE_API_TOKEN not set, skipping email");
    return;
  }

  const categoryLines = Object.entries(scores.categories)
    .map(([key, cat]) => formatCategory(key, cat))
    .join("\n  ");

  const htmlBody = `
<div style="font-family: 'Hanken Grotesk', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D2A26;">
  <div style="background-color: #272E40; padding: 20px 24px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">MoneyFinder Skills Assessment Results</h1>
  </div>

  <div style="padding: 24px; background: #F7F9F8; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin: 0 0 4px;"><strong>Candidate:</strong> ${candidateName}</p>
    <p style="margin: 0 0 16px; color: #666;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

    <div style="background: #ffffff; border-radius: 10px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e5e5;">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 36px; font-weight: 800; color: #272E40;">${scores.overall_score}</span>
        <span style="font-size: 16px; color: #666;">/100</span>
        <div style="margin-top: 4px; font-weight: 700; color: ${scores.recommendation === "NO_HIRE" ? "#F18A58" : "#67A37E"};">
          ${scores.recommendation.replace(/_/g, " ")}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${Object.entries(scores.categories).map(([key, cat]) => `
        <tr style="border-top: 1px solid #f0f0f0;">
          <td style="padding: 8px 0; font-weight: 600;">${key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td>
          <td style="padding: 8px 0; text-align: right; white-space: nowrap; font-weight: 700; color: #272E40;">${cat.score}/${cat.max}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 0 0 8px; color: #666; font-size: 13px;">${cat.notes}</td>
        </tr>`).join("")}
      </table>
    </div>

    <div style="background: #ffffff; border-radius: 10px; padding: 16px; margin-bottom: 12px; border: 1px solid #e5e5e5;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #272E40;">Scenario Summary</h3>
      <p style="margin: 0; font-size: 14px; color: #555;">${scores.scenario_summary || "N/A"}</p>
    </div>

    <div style="background: #ffffff; border-radius: 10px; padding: 16px; margin-bottom: 12px; border: 1px solid #e5e5e5;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #67A37E;">Key Strengths</h3>
      <p style="margin: 0; font-size: 14px; color: #555;">${scores.key_strengths || "N/A"}</p>
    </div>

    <div style="background: #ffffff; border-radius: 10px; padding: 16px; margin-bottom: 12px; border: 1px solid #e5e5e5;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #F18A58;">Areas for Development</h3>
      <p style="margin: 0; font-size: 14px; color: #555;">${scores.areas_for_development || "N/A"}</p>
    </div>

    ${scores.auto_fail_triggers?.length ? `
    <div style="background: #FFF3ED; border-radius: 10px; padding: 16px; border: 1px solid #F18A58;">
      <strong style="color: #F18A58;">Auto-Fail Triggers:</strong> ${scores.auto_fail_triggers.join(", ")}
    </div>` : ""}

    <p style="margin: 24px 0 0; font-size: 12px; color: #999; text-align: center;">
      This is an automated assessment result from the MoneyFinder Skills Assessment tool.
    </p>
  </div>
</div>`;

  const response = await fetch("https://public.missiveapp.com/v1/drafts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      drafts: {
        subject: `Skills Assessment Results - ${candidateName}`,
        body: htmlBody,
        from_field: {
          name: "Carina Clingman",
          address: "carina@recruitomics.com",
        },
        to_fields: [{ address: to }],
        send: true,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Missive API error ${response.status}: ${text}`);
  }
}
