import type { ParsedSection } from "./docx-parser";

interface ScrapeOptions {
  url: string;
  ignoreHeaderFooter: boolean;
  auth?: {
    type: "basic" | "password-gate" | "form-login";
    username?: string;
    password?: string;
  };
}

interface ScrapeResult {
  sections: ParsedSection[];
  rawText: string;
}

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

function htmlToSections(html: string, ignoreHeaderFooter: boolean): ParsedSection[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  if (ignoreHeaderFooter) {
    doc.querySelectorAll(
      "header, footer, nav, [role='banner'], [role='contentinfo'], [role='navigation']"
    ).forEach((el) => el.remove());
  }

  // Remove non-visible elements
  doc.querySelectorAll("script, style, noscript, svg, meta, link, template").forEach((el) => el.remove());

  const sections: ParsedSection[] = [];

  function walk(node: Element) {
    const tag = node.tagName?.toLowerCase();
    if (!tag) return;

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = node.textContent?.trim();
      if (text) sections.push({ type: tag, text });
    } else if (tag === "p") {
      const text = node.textContent?.trim();
      if (text) sections.push({ type: "paragraph", text });
    } else if (tag === "li") {
      const text = node.textContent?.trim();
      if (text) sections.push({ type: "list-item", text });
    } else if (tag === "a") {
      const text = node.textContent?.trim();
      if (text) sections.push({ type: "link", text, href: node.getAttribute("href") || undefined });
    } else if (tag === "button" || node.getAttribute("role") === "button") {
      const text = node.textContent?.trim();
      if (text) sections.push({ type: "button", text });
    } else {
      for (const child of Array.from(node.children)) {
        walk(child);
      }
    }
  }

  walk(doc.body);
  return sections;
}

async function fetchWithProxy(url: string, headers?: HeadersInit): Promise<string> {
  // Try direct fetch first
  try {
    const resp = await fetch(url, { headers, mode: "cors" });
    if (resp.ok) return await resp.text();
  } catch {
    // CORS blocked, try proxies
  }

  // Try CORS proxies
  for (const makeProxy of CORS_PROXIES) {
    try {
      const resp = await fetch(makeProxy(url));
      if (resp.ok) return await resp.text();
    } catch {
      continue;
    }
  }

  throw new Error(
    "Could not fetch the webpage. The site may block automated access. " +
    "Try using the 'Paste HTML' option instead."
  );
}

export async function scrapeWebpage(options: ScrapeOptions): Promise<ScrapeResult> {
  const headers: Record<string, string> = {};

  if (options.auth?.type === "basic" && options.auth.username && options.auth.password) {
    headers["Authorization"] =
      "Basic " + btoa(`${options.auth.username}:${options.auth.password}`);
  }

  const html = await fetchWithProxy(options.url, Object.keys(headers).length ? headers : undefined);
  const sections = htmlToSections(html, options.ignoreHeaderFooter);
  const rawText = sections.map((s) => s.text).join("\n");

  return { sections, rawText };
}

export function parseHtmlString(html: string, ignoreHeaderFooter: boolean): ScrapeResult {
  const sections = htmlToSections(html, ignoreHeaderFooter);
  const rawText = sections.map((s) => s.text).join("\n");
  return { sections, rawText };
}
