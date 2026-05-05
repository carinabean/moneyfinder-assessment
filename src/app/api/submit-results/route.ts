import { createTranscriptPage } from "@/lib/notion";
import { parseScores } from "@/lib/scoring";
import { sendScoresEmail } from "@/lib/email";

// Communication Hub page ID for test results
const TEST_RESULTS_PAGE_ID = "30ae6451-37c2-8002-9e4d-eca2536124ae";

export async function POST(request: Request) {
  try {
    const { candidatePageId, candidateName, candidateEmail, transcript, scoringResponse } =
      await request.json();

    console.log("[submit-results] Received submission for:", candidateName);
    console.log("[submit-results] Email:", candidateEmail);
    console.log("[submit-results] Transcript messages:", transcript?.length);
    console.log("[submit-results] Has scoring response:", !!scoringResponse);

    if (!transcript) {
      console.error("[submit-results] Missing required fields");
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const scores = scoringResponse ? parseScores(scoringResponse) : null;
    console.log("[submit-results] Parsed scores:", scores ? `${scores.overall_score}/100 - ${scores.recommendation}` : "none");

    // Save to Notion under the Communication Hub page
    const pageId = await createTranscriptPage(
      TEST_RESULTS_PAGE_ID,
      candidateName,
      transcript,
      scores
    );

    console.log("[submit-results] Successfully created Notion page:", pageId);

    // Email scores (not transcript) to the participant
    if (candidateEmail && scores) {
      try {
        await sendScoresEmail(candidateEmail, candidateName, scores);
        console.log("[submit-results] Scores email sent to:", candidateEmail);
      } catch (emailErr: any) {
        console.error("[submit-results] Email send error:", emailErr?.message || emailErr);
        // Don't fail the whole request if email fails
      }
    }

    return Response.json({ success: true, pageId });
  } catch (err: any) {
    console.error("[submit-results] Error:", err?.message || err);
    console.error("[submit-results] Stack:", err?.stack);
    return Response.json(
      { error: "Failed to save results. Please contact the recruiting team." },
      { status: 500 }
    );
  }
}
