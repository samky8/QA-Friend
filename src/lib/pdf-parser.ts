import * as pdfjsLib from "pdfjs-dist";
import type { ParsedDocument, ParsedSection } from "./docx-parser";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).href;

export async function parsePdf(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const sections: ParsedSection[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items into lines by y-position
    const itemsByY = new Map<number, string[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round((item as pdfjsLib.TextItem).transform[5]);
      if (!itemsByY.has(y)) itemsByY.set(y, []);
      itemsByY.get(y)!.push(item.str);
    }

    // Sort by y descending (top of page first) and emit each line as a paragraph
    const sortedYs = Array.from(itemsByY.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const text = itemsByY.get(y)!.join(" ").trim();
      if (text) sections.push({ type: "paragraph", text });
    }
  }

  const rawText = sections.map((s) => s.text).join("\n");
  const html = sections.map((s) => `<p>${s.text}</p>`).join("\n");

  return { sections, rawText, html };
}
