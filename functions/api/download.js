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

    const token = context.env.APIFY_TOKEN;

    if (!token) {
      return Response.json(
        {
          success: false,
          error: "APIFY_TOKEN is missing"
        },
        { status: 500 }
      );
    }

    const apiUrl =
      "https://api.apify.com/v2/acts/elis~instagram-downloader-api/run-sync-get-dataset-items?token=" +
      encodeURIComponent(token);

    const response = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        url: [parsed.toString()]
      })
    });

    const text = await response.text();

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          error: "Apify request failed"
        },
        { status: 502 }
      );
    }

    let results;

    try {
      results = JSON.parse(text);
    } catch {
      return Response.json(
        {
          success: false,
          error: "Invalid response from Apify"
        },
        { status: 502 }
      );
    }

    const item = Array.isArray(results)
      ? results[0]
      : null;

    if (!item || item.status !== "success") {
      return Response.json(
        {
          success: false,
          error: "Could not download this Reel"
        },
        { status: 404 }
      );
    }

    const result = Array.isArray(item.result)
      ? item.result
      : [];

    /*
      IMPORTANT:
      Only return actual video results.
      Images/thumbnails are ignored.
    */

    const links = result
      .filter(
        (item) =>
          item &&
          item.type === "video" &&
          typeof item.url === "string"
      )
      .map((item) => ({
        url: item.url,
        type: "video",
        quality: item.quality || ""
      }));

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
