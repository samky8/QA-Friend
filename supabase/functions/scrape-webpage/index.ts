import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, ignoreHeaderFooter, auth } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Firecrawl request
    const scrapeBody: Record<string, unknown> = {
      url: parsedUrl.toString(),
      formats: ["html", "markdown", "screenshot"],
      onlyMainContent: ignoreHeaderFooter ?? false,
      waitFor: 3000,
    };

    // Build headers for basic auth
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // For basic auth, we can pass it in the URL
    if (auth?.type === "basic" && auth.username && auth.password) {
      const authUrl = new URL(parsedUrl.toString());
      authUrl.username = auth.username;
      authUrl.password = auth.password;
      scrapeBody.url = authUrl.toString();
    }

    // For password gate, add headers
    if (auth?.type === "password-gate" && auth.password) {
      scrapeBody.headers = {
        "X-Password": auth.password,
      };
    }

    console.log("Scraping URL:", parsedUrl.hostname);

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers,
      body: JSON.stringify(scrapeBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Scraping failed (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Never log or store auth credentials
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
