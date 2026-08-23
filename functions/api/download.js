export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const url = String(body.url || "").trim();

    if (!url) {
      return Response.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      return Response.json(
        { success: false, error: "Invalid URL" },
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
        { success: false, error: "Please enter an Instagram URL" },
        { status: 400 }
      );
    }

    if (!parsed.pathname.includes("/reel/")) {
      return Response.json(
        { success: false, error: "Please enter an Instagram Reel URL" },
        { status: 400 }
      );
    }

    const token = context.env.APIFY_TOKEN;

    if (!token) {
      return Response.json(
        { success: false, error: "API configuration missing" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.apify.com/v2/acts/elis~instagram-downloader-api/run-sync-get-dataset-items?token=" +
        encodeURIComponent(token),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          urls: [parsed.toString()]
        })
      }
    );

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          error: "Download service failed"
        },
        { status: 502 }
      );
    }

    const results = await response.json();

    const item = Array.isArray(results) ? results[0] : null;

    if (!item || item.status !== "success" || !item.result) {
      return Response.json(
        {
          success: false,
          error: "Could not get the Reel download link"
        },
        { status: 404 }
      );
    }

    const links = Array.isArray(item.result)
      ? item.result
          .filter(
            (item) =>
              item &&
              item.type === "video" &&
              typeof item.url === "string"
          )
          .map((item) => ({
            url: item.url,
            quality: item.quality || ""
          }))
      : [];

    if (!links.length) {
      return Response.json(
        {
          success: false,
          error: "No video download link found"
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      links
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Server error"
      },
      { status: 500 }
    );
  }
}
