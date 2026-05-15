import { createTranscriptPage } from "@/lib/notion";
import { parseScores } from "@/lib/scoring";

export async function POST(request: Request) {
  try {
    const { candidatePageId, candidateName, candidateEmail, transcript, scoringResponse } =
      await request.json();

    console.log("[submit-results] Received submission for:", candidateName);
    console.log("[submit-results] Email:", candidateEmail);
    console.log("[submit-results] Candidate page ID:", candidatePageId);
    console.log("[submit-results] Transcript messages:", transcript?.length);
    console.log("[submit-results] Has scoring response:", !!scoringResponse);

    if (!candidatePageId || !transcript) {
      console.error("[submit-results] Missing required fields");
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const scores = scoringResponse ? parseScores(scoringResponse) : null;
    console.log(
      "[submit-results] Parsed scores:",
      scores ? `${scores.overall_score}/100 - ${scores.recommendation}` : "none"
    );

    // Save results as a child page under the candidate's profile in the Notion CRM
    const pageId = await createTranscriptPage(
      candidatePageId,
      candidateName,
      transcript,
      scores
    );

    console.log("[submit-results] Successfully created Notion page:", pageId);

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
