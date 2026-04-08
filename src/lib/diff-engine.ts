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
  status: "match" | "changed" | "missing" | "extra" | "out-of-order";
}

export interface ComparisonResult {
  sections: SectionComparison[];
  summary: {
    total: number;
    matches: number;
    changes: number;
    missing: number;
    extra: number;
    outOfOrder: number;
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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

  // Build a lookup of all normalized target texts for global matching
  const targetTextsNormalized = targetSections.map((t) => normalizeText(t.text));

  // Phase 1: Try positional match first (same index, same type, same text)
  for (let i = 0; i < sourceSections.length; i++) {
    const src = sourceSections[i];
    const srcNorm = normalizeText(src.text);

    if (i < targetSections.length && !usedTargetIndices.has(i)) {
      const tgtNorm = targetTextsNormalized[i];
      if (srcNorm === tgtNorm) {
        usedTargetIndices.add(i);
        comparisons.push({
          sectionType: src.type,
          sectionLabel: getSectionLabel(src, i),
          sourceText: srcNorm,
          targetText: tgtNorm,
          diff: [{ value: srcNorm }],
          status: "match",
        });
        continue;
      }
    }

    // Placeholder — will resolve in phase 2
    comparisons.push({
      sectionType: src.type,
      sectionLabel: getSectionLabel(src, i),
      sourceText: srcNorm,
      targetText: "",
      diff: [],
      status: "missing", // temporary
    });
  }

  // Phase 2: For unresolved sources, do global search across ALL target sections
  for (let ci = 0; ci < comparisons.length; ci++) {
    const comp = comparisons[ci];
    if (comp.status !== "missing" || comp.targetText !== "") continue;

    const srcNorm = comp.sourceText;

    // Exact global match anywhere in target
    let foundIdx = -1;
    for (let ti = 0; ti < targetTextsNormalized.length; ti++) {
      if (usedTargetIndices.has(ti)) continue;
      if (targetTextsNormalized[ti] === srcNorm) {
        foundIdx = ti;
        break;
      }
    }

    if (foundIdx >= 0) {
      usedTargetIndices.add(foundIdx);
      comp.targetText = targetTextsNormalized[foundIdx];
      comp.diff = [{ value: srcNorm }];
      // It matched but not at the expected position → out-of-order
      comp.status = "out-of-order";
      continue;
    }

    // Fuzzy positional match: find best partial match among unused targets
    let bestIdx = -1;
    let bestScore = 0;
    for (let ti = 0; ti < targetSections.length; ti++) {
      if (usedTargetIndices.has(ti)) continue;
      const tgt = targetSections[ti];
      const tgtNorm = targetTextsNormalized[ti];
      let score = 0;
      if (tgt.type === sourceSections[ci]?.type) score += 2;
      if (tgtNorm.includes(srcNorm.substring(0, Math.min(20, srcNorm.length)))) {
        score += 5;
      } else if (tgt.type === sourceSections[ci]?.type) {
        score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = ti;
      }
    }

    if (bestIdx >= 0 && bestScore >= 3) {
      usedTargetIndices.add(bestIdx);
      const tgtNorm = targetTextsNormalized[bestIdx];
      const diff = diffWords(srcNorm, tgtNorm);
      comp.targetText = tgtNorm;
      comp.diff = diff.map((p) => ({ value: p.value, added: p.added, removed: p.removed }));
      comp.status = "changed";
    } else {
      // Truly missing
      comp.diff = [{ value: srcNorm, removed: true }];
      comp.status = "missing";
    }
  }

  // Phase 3: Mark unmatched target sections as extra
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
    outOfOrder: comparisons.filter((c) => c.status === "out-of-order").length,
  };

  return { sections: comparisons, summary };
}
