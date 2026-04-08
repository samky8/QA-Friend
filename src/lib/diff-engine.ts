import { diffWords } from "diff";
import type { ParsedSection } from "./docx-parser";

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface SectionComparison {
  sectionType: ParsedSection["type"];
  sectionLabel: string;
  sourceText: string;
  targetText: string;
  diff: DiffPart[];
  status: "match" | "changed" | "missing" | "extra";
}

export interface ComparisonResult {
  sections: SectionComparison[];
  summary: {
    total: number;
    matches: number;
    changes: number;
    missing: number;
    extra: number;
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function findBestMatch(
  sourceSection: ParsedSection,
  targetSections: ParsedSection[],
  usedIndices: Set<number>
): { index: number; score: number } | null {
  let bestScore = 0;
  let bestIndex = -1;

  for (let i = 0; i < targetSections.length; i++) {
    if (usedIndices.has(i)) continue;
    const target = targetSections[i];

    // Prefer same type
    let score = 0;
    if (target.type === sourceSection.type) score += 2;

    const srcNorm = normalizeText(sourceSection.text).toLowerCase();
    const tgtNorm = normalizeText(target.text).toLowerCase();

    if (srcNorm === tgtNorm) {
      score += 10;
    } else if (tgtNorm.includes(srcNorm.substring(0, Math.min(20, srcNorm.length)))) {
      score += 5;
    } else if (sourceSection.type === target.type) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex >= 0 && bestScore >= 2 ? { index: bestIndex, score: bestScore } : null;
}

function getSectionLabel(section: ParsedSection, index: number): string {
  const typeLabels: Record<string, string> = {
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    paragraph: "Paragraph",
    "list-item": "List Item",
    link: "Link",
    button: "Button",
    other: "Content",
  };
  return `${typeLabels[section.type] || "Content"} #${index + 1}`;
}

export function compareDocuments(
  sourceSections: ParsedSection[],
  targetSections: ParsedSection[]
): ComparisonResult {
  const comparisons: SectionComparison[] = [];
  const usedTargetIndices = new Set<number>();

  // Match source sections to target sections
  for (let i = 0; i < sourceSections.length; i++) {
    const src = sourceSections[i];
    const match = findBestMatch(src, targetSections, usedTargetIndices);

    if (match) {
      usedTargetIndices.add(match.index);
      const tgt = targetSections[match.index];
      const srcNorm = normalizeText(src.text);
      const tgtNorm = normalizeText(tgt.text);

      const diff = diffWords(srcNorm, tgtNorm);
      const isMatch = srcNorm === tgtNorm;

      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcNorm,
        targetText: tgtNorm,
        diff: diff.map((p) => ({ value: p.value, added: p.added, removed: p.removed })),
        status: isMatch ? "match" : "changed",
      });
    } else {
      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: normalizeText(src.text),
        targetText: "",
        diff: [{ value: normalizeText(src.text), removed: true }],
        status: "missing",
      });
    }
  }

  // Mark unmatched target sections as extra
  for (let i = 0; i < targetSections.length; i++) {
    if (!usedTargetIndices.has(i)) {
      const tgt = targetSections[i];
      comparisons.push({
        sectionType: tgt.type,
        sectionLabel: `Extra: ${getSectionLabel(tgt, i)}`,
        sourceText: "",
        targetText: normalizeText(tgt.text),
        diff: [{ value: normalizeText(tgt.text), added: true }],
        status: "extra",
      });
    }
  }

  const summary = {
    total: comparisons.length,
    matches: comparisons.filter((c) => c.status === "match").length,
    changes: comparisons.filter((c) => c.status === "changed").length,
    missing: comparisons.filter((c) => c.status === "missing").length,
    extra: comparisons.filter((c) => c.status === "extra").length,
  };

  return { sections: comparisons, summary };
}
