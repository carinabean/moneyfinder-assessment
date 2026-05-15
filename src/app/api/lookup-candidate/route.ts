import { lookupCandidate } from "@/lib/notion";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const candidate = await lookupCandidate(email);

    if (!candidate) {
      return Response.json(
        {
          error:
            "No candidate record found for this email address. Please contact the recruiting team.",
        },
        { status: 404 }
      );
    }

    return Response.json({ candidate });
  } catch (err: any) {
    console.error("Notion lookup error:", err);
    return Response.json(
      { error: "Failed to look up candidate. Please try again." },
      { status: 500 }
    );
  }
}
