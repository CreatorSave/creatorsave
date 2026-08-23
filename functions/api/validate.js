export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const url = String(body.url || "").trim();

    if (!url) {
      return Response.json(
        {
          success: false,
          error: "URL is required"
        },
        { status: 400 }
      );
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      return Response.json(
        {
          success: false,
          error: "Invalid URL"
        },
        { status: 400 }
      );
    }

    const hostname = parsed.hostname
      .replace(/^www\./, "")
      .toLowerCase();

    if (
      hostname !== "instagram.com" &&
      !hostname.endsWith(".instagram.com")
    ) {
      return Response.json(
        {
          success: false,
          error: "Please enter an Instagram URL"
        },
        { status: 400 }
      );
    }

    if (!parsed.pathname.includes("/reel/")) {
      return Response.json(
        {
          success: false,
          error: "Please enter an Instagram Reel URL"
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Instagram Reel URL accepted",
      url: parsed.toString()
    });

  } catch {
    return Response.json(
      {
        success: false,
        error: "Invalid request"
      },
      { status: 400 }
    );
  }
}
