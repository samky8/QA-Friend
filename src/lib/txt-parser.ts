import type { ParsedDocument, ParsedSection } from "./docx-parser";

export async function parseTxt(file: File): Promise<ParsedDocument> {
  const text = await file.text();

  const sections: ParsedSection[] = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ type: "paragraph" as const, text: line }));

  const rawText = sections.map((s) => s.text).join("\n");
  const html = sections.map((s) => `<p>${s.text}</p>`).join("\n");

  return { sections, rawText, html };
}
