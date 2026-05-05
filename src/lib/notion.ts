import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATA_SOURCE_ID = process.env.NOTION_CANDIDATE_DATA_SOURCE_ID!;

export interface CandidateRecord {
  pageId: string;
  name: string;
  email: string;
}

export async function lookupCandidate(
  email: string
): Promise<CandidateRecord | null> {
  const response = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: {
      property: "Email Address",
      email: {
        equals: email,
      },
    },
  });

  if (response.results.length === 0) return null;

  const page = response.results[0];
  const props = (page as any).properties;

  let name = "";
  if (props.Name?.title?.[0]?.plain_text) {
    name = props.Name.title[0].plain_text;
  }

  return {
    pageId: page.id,
    name,
    email,
  };
}

// Helper to create a rich text segment
function richText(content: string, bold = false) {
  return {
    type: "text" as const,
    text: { content },
    ...(bold ? { annotations: { bold: true } } : {}),
  };
}

// Helper to create a paragraph block
function paragraph(...segments: Array<{ type: "text"; text: { content: string }; annotations?: { bold: boolean } }>) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: segments },
  };
}

export async function createTranscriptPage(
  parentPageId: string,
  candidateName: string,
  transcript: Array<{ role: string; content: string }>,
  scores: any
): Promise<string> {
  const now = new Date().toISOString().split("T")[0];

  // ─── Assessment Scores (toggle heading, collapsed by default) ───
  const scoreChildren: any[] = [];
  if (scores) {
    scoreChildren.push(
      paragraph(
        richText("Overall Score: ", true),
        richText(`${scores.overall_score}/100`)
      ),
      paragraph(
        richText("Recommendation: ", true),
        richText(scores.recommendation)
      )
    );

    // Category breakdowns
    if (scores.categories) {
      scoreChildren.push({
        object: "block",
        type: "divider",
        divider: {},
      });
      for (const [key, cat] of Object.entries(scores.categories) as any[]) {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
        scoreChildren.push(
          paragraph(
            richText(`${label}: ${cat.score}/${cat.max}`, true),
            richText(` — ${cat.notes}`)
          )
        );
      }
    }

    // Summary
    if (scores.scenario_summary) {
      scoreChildren.push({
        object: "block",
        type: "divider",
        divider: {},
      });
      scoreChildren.push(
        paragraph(
          richText("Scenario Summary: ", true),
          richText(scores.scenario_summary)
        )
      );
    }

    // Key strengths & areas for development
    if (scores.key_strengths) {
      scoreChildren.push({
        object: "block",
        type: "divider",
        divider: {},
      });
      scoreChildren.push(
        paragraph(richText("Key Strengths: ", true), richText(scores.key_strengths))
      );
    }
    if (scores.areas_for_development) {
      scoreChildren.push(
        paragraph(richText("Areas for Development: ", true), richText(scores.areas_for_development))
      );
    }

    // Auto-fail triggers
    if (scores.auto_fail_triggers?.length > 0) {
      scoreChildren.push({
        object: "block",
        type: "callout",
        callout: {
          rich_text: [richText(`Auto-fail triggers: ${scores.auto_fail_triggers.join(", ")}`)],
          icon: { emoji: "⚠️" },
        },
      });
    }
  }

  // ─── Transcript (toggle heading, collapsed by default) ───
  const transcriptChildren: any[] = [];
  for (const msg of transcript) {
    // Skip internal scoring trigger messages
    if (msg.content === "END_ASSESSMENT_GENERATE_SCORES") continue;

    const speaker = msg.role === "assistant" ? "Assessor" : candidateName;
    transcriptChildren.push(
      paragraph(richText(`${speaker}: `, true), richText(msg.content))
    );
  }

  // ─── Build the page ───
  const topLevelBlocks: any[] = [
    // Date
    paragraph(richText(`Date: ${now}`, true)),
  ];

  // Assessment Scores as a toggle heading
  if (scoreChildren.length > 0) {
    topLevelBlocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [richText("Assessment Scores")],
        is_toggleable: true,
        children: scoreChildren,
      },
    });
  }

  // Transcript as a toggle heading
  if (transcriptChildren.length > 0) {
    // Notion limits children to 100 per block, so we may need to split
    const firstBatch = transcriptChildren.slice(0, 100);
    const remaining = transcriptChildren.slice(100);

    topLevelBlocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [richText("Full Transcript")],
        is_toggleable: true,
        children: firstBatch,
      },
    });

    // If transcript exceeds 100 messages, append overflow after page creation
    // (handled below)
    if (remaining.length > 0) {
      // We'll append these after creation
    }
  }

  console.log("[Notion] Creating transcript page under parent:", parentPageId);
  console.log("[Notion] Blocks count:", topLevelBlocks.length);

  const page = await notion.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [
          {
            text: {
              content: `Skills Assessment — ${now}`,
            },
          },
        ],
      },
    },
    children: topLevelBlocks,
  });

  console.log("[Notion] Page created:", page.id);

  // Append overflow transcript blocks if needed
  const overflow = transcriptChildren.slice(100);
  if (overflow.length > 0) {
    // We need to find the transcript toggle block and append to it
    // For simplicity, append as top-level blocks
    const batches: any[][] = [];
    for (let i = 0; i < overflow.length; i += 100) {
      batches.push(overflow.slice(i, i + 100));
    }
    for (const batch of batches) {
      await notion.blocks.children.append({
        block_id: page.id,
        children: batch,
      });
    }
  }

  return page.id;
}
