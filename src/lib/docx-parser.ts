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

function cleanHref(href: string | null): string | undefined {
  if (!href) return undefined;
  // Word HYPERLINK field \l switch: 'url" \l "anchor"' or 'url" \l "anchor' → 'url#anchor'
  const wlMatch = href.match(/^(.+?)"\s*\\l\s*"([^"]+?)"?\s*$/);
  if (wlMatch) return `${wlMatch[1]}#${wlMatch[2]}`;
  return href;
}

/** If the entire text of node is covered by exactly one <a> descendant, return it. */
function findSoloAnchor(node: Element): Element | null {
  const text = node.textContent?.trim();
  if (!text) return null;
  const anchors = Array.from(node.querySelectorAll("a"));
  if (anchors.length === 1 && anchors[0].textContent?.trim() === text) return anchors[0];
  return null;
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
      const text = node.textContent?.trim();
      const soloAnchor = findSoloAnchor(node);

      if (soloAnchor) {
        // Entire <p>/<li> is a single link (may be nested inside spans/p) — emit only the link
        sections.push({
          type: "link",
          text: text || "",
          href: cleanHref(soloAnchor.getAttribute("href")),
        });
      } else {
        const children = Array.from(node.children);
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
        href: cleanHref(node.getAttribute("href")),
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
