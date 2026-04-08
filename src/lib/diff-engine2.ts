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
  status: "match" | "changed" | "missing" | "extra" | "moved" | "hyperlinks";
}

export interface ComparisonResult {
  sections: SectionComparison[];
  summary: {
    total: number;
    changes: number;
    missing: number;
    extra: number;
    moved: number;
    hyperlinks: number;
  };
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
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

function sentenceMatchScore(source: string, target: string): number {
  const srcSentences = splitIntoSentences(source);

  if (!srcSentences.length) return 0;

  const matched = srcSentences.filter((sentence) =>
    target.includes(sentence)
  );

  return matched.length / srcSentences.length;
}

export function compareDocuments(
  sourceSections: ParsedSection[],
  targetSections: ParsedSection[]
): ComparisonResult {
  const comparisons: SectionComparison[] = [];
  const usedTargetIndices = new Set<number>();

  const targetTexts = targetSections.map((s) =>
    normalizeText(s.text)
  );

  for (let i = 0; i < sourceSections.length; i++) {
    const src = sourceSections[i];
    const srcText = normalizeText(src.text);

    let exactMatchIdx = -1;

    // PASS 1: exact match anywhere on page
    for (let ti = 0; ti < targetTexts.length; ti++) {
      if (usedTargetIndices.has(ti)) continue;
      // Reserve link targets exclusively for link sources
      if (src.type !== "link" && targetSections[ti].type === "link") continue;

      if (targetTexts[ti] === srcText) {
        exactMatchIdx = ti;
        break;
      }
    }

    if (src.type === "link") {
      let exactLinkIdx = -1;
      let sameHrefIdx = -1;
      let sameTextIdx = -1;

      for (let ti = 0; ti < targetSections.length; ti++) {
        if (usedTargetIndices.has(ti)) continue;
        const target = targetSections[ti];
        if (target.type !== "link") continue;

        const targetText = normalizeText(target.text);
        const targetHref = target.href || "";
        const sourceHref = src.href || "";

        if (targetText === srcText && targetHref === sourceHref) {
          exactLinkIdx = ti;
          break;
        }

        if (sameHrefIdx < 0 && targetHref && sourceHref && targetHref === sourceHref) {
          sameHrefIdx = ti;
        }

        if (sameTextIdx < 0 && targetText === srcText) {
          sameTextIdx = ti;
        }
      }

      if (exactLinkIdx >= 0) {
        usedTargetIndices.add(exactLinkIdx);
        comparisons.push({
          sectionType: src.type,
          sectionLabel: getSectionLabel(src, i),
          sourceText: srcText,
          targetText: targetTexts[exactLinkIdx],
          diff: [{ value: srcText }],
          status: "match",
        });
        continue;
      }

      if (sameHrefIdx >= 0 || sameTextIdx >= 0) {
        const matchedIdx = sameHrefIdx >= 0 ? sameHrefIdx : sameTextIdx;
        usedTargetIndices.add(matchedIdx);
        const targetText = targetTexts[matchedIdx];
        const diff = diffWords(srcText, targetText);

        comparisons.push({
          sectionType: src.type,
          sectionLabel: getSectionLabel(src, i),
          sourceText: srcText,
          targetText,
          diff: diff.map((p) => ({
            value: p.value,
            added: p.added,
            removed: p.removed,
          })),
          status: "hyperlinks",
        });
        continue;
      }

      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcText,
        targetText: "",
        diff: [{ value: srcText, removed: true }],
        status: "hyperlinks",
      });
      continue;
    }

    if (exactMatchIdx >= 0) {
      usedTargetIndices.add(exactMatchIdx);

      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcText,
        targetText: targetTexts[exactMatchIdx],
        diff: [{ value: srcText }],
        status: exactMatchIdx === i ? "match" : "moved",
      });

      continue;
    }

    // PASS 2: sentence-level global match
    let bestIdx = -1;
    let bestScore = 0;

    for (let ti = 0; ti < targetTexts.length; ti++) {
      if (usedTargetIndices.has(ti)) continue;
      if (targetSections[ti].type === "link") continue;

      const score = sentenceMatchScore(
        srcText,
        targetTexts[ti]
      );

      if (score > bestScore) {
        bestScore = score;
        bestIdx = ti;
      }
    }

    if (bestIdx >= 0 && bestScore >= 0.8) {
      usedTargetIndices.add(bestIdx);

      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcText,
        targetText: targetTexts[bestIdx],
        diff: [{ value: srcText }],
        status: bestIdx === i ? "match" : "moved",
      });

      continue;
    }

    // PASS 3: best fuzzy changed match
    let changedIdx = -1;
    let changedScore = 0;

    for (let ti = 0; ti < targetTexts.length; ti++) {
      if (usedTargetIndices.has(ti)) continue;
      if (targetSections[ti].type === "link") continue;

      const tgt = targetTexts[ti];

      let score = 0;

      if (tgt.includes(srcText.slice(0, 30))) {
        score += 5;
      }

      if (targetSections[ti].type === src.type) {
        score += 2;
      }

      if (score > changedScore) {
        changedScore = score;
        changedIdx = ti;
      }
    }

    if (changedIdx >= 0 && changedScore >= 3) {
      usedTargetIndices.add(changedIdx);

      const targetText = targetTexts[changedIdx];
      const diff = diffWords(srcText, targetText);

      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcText,
        targetText,
        diff: diff.map((p) => ({
          value: p.value,
          added: p.added,
          removed: p.removed,
        })),
        status: "changed",
      });

      continue;
    }

    // PASS 4: truly missing
    comparisons.push({
      sectionType: src.type,
      sectionLabel: getSectionLabel(src, i),
      sourceText: srcText,
      targetText: "",
      diff: [{ value: srcText, removed: true }],
      status: "missing",
    });
  }

  // extra content on webpage
  for (let i = 0; i < targetSections.length; i++) {
    if (!usedTargetIndices.has(i)) {
      const targetText = normalizeText(
        targetSections[i].text
      );

      comparisons.push({
        sectionType: targetSections[i].type,
        sectionLabel: `Extra: ${getSectionLabel(
          targetSections[i],
          i
        )}`,
        sourceText: "",
        targetText,
        diff: [{ value: targetText, added: true }],
        status: targetSections[i].type === "link" ? "hyperlinks" : "extra",
      });
    }
  }

  const summary = {
    total: comparisons.filter((c) => c.status !== "extra").length,
    changes: comparisons.filter(
      (c) => c.status === "changed"
    ).length,
    missing: comparisons.filter(
      (c) => c.status === "missing"
    ).length,
    extra: comparisons.filter(
      (c) => c.status === "extra"
    ).length,
    moved: comparisons.filter(
      (c) => c.status === "moved"
    ).length,
    hyperlinks: comparisons.filter(
      (c) => c.status === "hyperlinks"
    ).length,
  };

  return { sections: comparisons, summary };
}