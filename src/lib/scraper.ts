import { supabase } from "@/integrations/supabase/client";
import type { ParsedSection } from "./docx-parser";

interface ScrapeOptions {
  url: string;
  ignoreHeaderFooter: boolean;
  auth?: {
    type: "basic" | "password-gate" | "form-login";
    username?: string;
    password?: string;
    formSelector?: string;
  };
}

interface ScrapeResult {
  sections: ParsedSection[];
  rawText: string;
  screenshotBase64?: string;
}

function htmlToSections(html: string, ignoreHeaderFooter: boolean): ParsedSection[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const sections: ParsedSection[] = [];

  // Remove header/footer if requested
  if (ignoreHeaderFooter) {
    doc.querySelectorAll("header, footer, nav, [role='banner'], [role='contentinfo'], [role='navigation']").forEach((el) => el.remove());
  }

  function walk(node: Element) {
    const tag = node.tagName?.toLowerCase();
    if (["script", "style", "noscript", "svg", "meta", "link"].includes(tag)) return;

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

export async function scrapeWebpage(options: ScrapeOptions): Promise<ScrapeResult> {
  const { data, error } = await supabase.functions.invoke("scrape-webpage", {
    body: {
      url: options.url,
      ignoreHeaderFooter: options.ignoreHeaderFooter,
      auth: options.auth,
    },
  });

  if (error) throw new Error(error.message || "Failed to scrape webpage");
  if (!data?.success) throw new Error(data?.error || "Scraping failed");

  const html = data.data?.html || data.html || "";
  const markdown = data.data?.markdown || data.markdown || "";
  const screenshot = data.data?.screenshot || data.screenshot;

  // Try to parse HTML for structured sections, fallback to markdown
  let sections: ParsedSection[];
  if (html) {
    sections = htmlToSections(html, options.ignoreHeaderFooter);
  } else {
    // Fallback: split markdown into sections
    sections = markdown
      .split("\n")
      .filter((l: string) => l.trim())
      .map((line: string): ParsedSection => {
        if (line.startsWith("# ")) return { type: "h1", text: line.slice(2).trim() };
        if (line.startsWith("## ")) return { type: "h2", text: line.slice(3).trim() };
        if (line.startsWith("### ")) return { type: "h3", text: line.slice(4).trim() };
        if (line.startsWith("- ") || line.startsWith("* ")) return { type: "list-item", text: line.slice(2).trim() };
        return { type: "paragraph", text: line.trim() };
      });
  }

  const rawText = sections.map((s) => s.text).join("\n");

  return { sections, rawText, screenshotBase64: screenshot };
}
