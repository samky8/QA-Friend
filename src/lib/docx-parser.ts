import mammoth from "mammoth";

export interface ParsedSection {
  type: "h1" | "h2" | "h3" | "paragraph" | "list-item" | "link" | "button" | "other";
  text: string;
  href?: string;
  children?: ParsedSection[];
}

export interface ParsedDocument {
  sections: ParsedSection[];
  rawText: string;
  html: string;
}

function htmlToSections(html: string): ParsedSection[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const sections: ParsedSection[] = [];

  function walk(node: Element) {
    const tag = node.tagName?.toLowerCase();

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      sections.push({ type: tag, text: node.textContent?.trim() || "" });
    } else if (tag === "p" || tag === "li") {
      const children = Array.from(node.children);
      const text = node.textContent?.trim();
      const soloLink =
        children.length === 1 &&
        children[0].tagName?.toLowerCase() === "a" &&
        children[0].textContent?.trim() === text;

      if (soloLink) {
        // Entire <p>/<li> is a single link — emit only the link
        sections.push({
          type: "link",
          text: text || "",
          href: children[0].getAttribute("href") || undefined,
        });
      } else {
        if (text)
          sections.push({ type: tag === "p" ? "paragraph" : "list-item", text });
        for (const child of children) {
          walk(child);
        }
      }
    } else if (tag === "a") {
      sections.push({
        type: "link",
        text: node.textContent?.trim() || "",
        href: node.getAttribute("href") || undefined,
      });
    } else {
      for (const child of Array.from(node.children)) {
        walk(child);
      }
    }
  }

  walk(doc.body);
  return sections;
}

export async function parseDocx(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  const sections = htmlToSections(html);
  const rawText = sections.map((s) => s.text).join("\n");

  return { sections, rawText, html };
}
