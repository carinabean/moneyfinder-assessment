export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Test mode: skip CRM lookup, just pass through with a placeholder page ID
    return Response.json({
      candidate: {
        pageId: "test-mode",
        name: "",
        email,
      },
    });
  } catch (err: any) {
    console.error("Lookup error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
