import { diffWordsWithSpace } from "diff";
import type { ParsedSection } from "./docx-parser";

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
  /** Classifies what kind of change this is, for optional suppression in the UI. */
  changeType?: "whitespace" | "case" | "content";
}

export interface SectionComparison {
  sectionType: ParsedSection["type"];
  sectionLabel: string;
  sourceText: string;
  targetText: string;
  diff: DiffPart[];
  status: "match" | "changed" | "missing" | "moved" | "hyperlinks";
  sourceHref?: string;
  targetHref?: string;
  hasWhitespaceChanges: boolean;
  hasCaseChanges: boolean;
  hasContentChanges: boolean;
}

export interface ComparisonResult {
  sections: SectionComparison[];
  summary: {
    total: number;
    changes: number;
    missing: number;
    moved: number;
    hyperlinks: number;
  };
}

function hrefsMatch(sourceHref: string, targetHref: string): boolean {
  if (sourceHref === targetHref) return true;
  // Source is absolute (from Word doc); target may be root-relative (from webpage).
  // Strip domain from source and compare to target as-is.
  try {
    const srcUrl = new URL(sourceHref);
    const srcPath = srcUrl.pathname + srcUrl.search + srcUrl.hash;
    return srcPath === targetHref;
  } catch {
    return false;
  }
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}
/** Preserves whitespace; only normalises quotes, special spaces, and leading/trailing whitespace. */
function normalizeForDisplay(text: string): string {
  return text
    .replace(/[\u00a0\u2009\u202f]/g, " ")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

/**
 * Scans diff output from diffWordsWithSpace and tags consecutive removed+added
 * pairs so the UI can optionally suppress whitespace-only or case-only changes.
 */
function tagDiffParts(parts: DiffPart[]): DiffPart[] {
  const result: DiffPart[] = [];
  let i = 0;

  while (i < parts.length) {
    const part = { ...parts[i] };

    if (part.removed && i + 1 < parts.length && parts[i + 1].added) {
      const addedPart = { ...parts[i + 1] };
      const removedStripped = part.value.replace(/\s+/g, "");
      const addedStripped = addedPart.value.replace(/\s+/g, "");

      let changeType: DiffPart["changeType"];
      if (removedStripped === addedStripped) {
        // Only whitespace differs (including pure whitespace token substitutions)
        changeType = "whitespace";
      } else if (part.value.toLowerCase() === addedPart.value.toLowerCase()) {
        // Only case differs
        changeType = "case";
      } else if (removedStripped.toLowerCase() === addedStripped.toLowerCase()) {
        // Both whitespace and case differ — treat as whitespace (both ignorable together)
        changeType = "whitespace";
      } else {
        changeType = "content";
      }

      result.push({ ...part, changeType });
      result.push({ ...addedPart, changeType });
      i += 2;
    } else {
      result.push(part.removed || part.added ? { ...part, changeType: "content" } : part);
      i++;
    }
  }

  return result;
}

function getChangeStats(parts: DiffPart[]) {
  let hasWhitespaceChanges = false;
  let hasCaseChanges = false;
  let hasContentChanges = false;

  for (const part of parts) {
    if (!part.added && !part.removed) continue;
    if (part.changeType === "whitespace") hasWhitespaceChanges = true;
    else if (part.changeType === "case") hasCaseChanges = true;
    else hasContentChanges = true;
  }

  return { hasWhitespaceChanges, hasCaseChanges, hasContentChanges };
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

function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return intersection / union;
}

export function compareDocuments(
  sourceSections: ParsedSection[],
  targetSections: ParsedSection[]
): ComparisonResult {
  const comparisons: SectionComparison[] = [];
  const usedTargetIndices = new Set<number>();

  // Fully-normalised texts used only for section matching
  const targetTexts = targetSections.map((s) => normalizeText(s.text));
  // Display texts preserve whitespace so whitespace diffs are visible
  const targetDisplayTexts = targetSections.map((s) => normalizeForDisplay(s.text));

  for (let i = 0; i < sourceSections.length; i++) {
    const src = sourceSections[i];
    const srcText = normalizeText(src.text);
    const srcDisplay = normalizeForDisplay(src.text);

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

        if (targetText === srcText && hrefsMatch(sourceHref, targetHref)) {
          exactLinkIdx = ti;
          break;
        }

        if (sameHrefIdx < 0 && targetHref && sourceHref && hrefsMatch(sourceHref, targetHref)) {
          sameHrefIdx = ti;
        }

        if (sameTextIdx < 0 && targetText === srcText) {
          sameTextIdx = ti;
        }
      }

      if (exactLinkIdx >= 0) {
        usedTargetIndices.add(exactLinkIdx);
        const tgtDisplay = targetDisplayTexts[exactLinkIdx];
        const rawDiff = tagDiffParts(
          diffWordsWithSpace(srcDisplay, tgtDisplay).map((p) => ({
            value: p.value, added: p.added, removed: p.removed,
          }))
        );
        const stats = getChangeStats(rawDiff);
        const hasAnyChange = stats.hasContentChanges || stats.hasWhitespaceChanges || stats.hasCaseChanges;
        comparisons.push({
          sectionType: src.type,
          sectionLabel: getSectionLabel(src, i),
          sourceText: srcDisplay,
          targetText: tgtDisplay,
          diff: hasAnyChange ? rawDiff : [{ value: srcDisplay }],
          status: hasAnyChange ? "hyperlinks" : "match",
          sourceHref: src.href,
          targetHref: targetSections[exactLinkIdx].href,
          ...stats,
        });
        continue;
      }

      if (sameHrefIdx >= 0 || sameTextIdx >= 0) {
        const matchedIdx = sameHrefIdx >= 0 ? sameHrefIdx : sameTextIdx;
        usedTargetIndices.add(matchedIdx);
        const tgtDisplay = targetDisplayTexts[matchedIdx];
        const rawDiff = tagDiffParts(
          diffWordsWithSpace(srcDisplay, tgtDisplay).map((p) => ({
            value: p.value, added: p.added, removed: p.removed,
          }))
        );
        const stats = getChangeStats(rawDiff);
        comparisons.push({
          sectionType: src.type,
          sectionLabel: getSectionLabel(src, i),
          sourceText: srcDisplay,
          targetText: tgtDisplay,
          diff: rawDiff,
          status: "hyperlinks",
          sourceHref: src.href,
          targetHref: targetSections[matchedIdx].href,
          ...stats,
        });
        continue;
      }

      const missingLinkDiff = tagDiffParts([{ value: srcDisplay, removed: true, changeType: "content" }]);
      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcDisplay,
        targetText: "",
        diff: missingLinkDiff,
        status: "hyperlinks",
        sourceHref: src.href,
        hasWhitespaceChanges: false,
        hasCaseChanges: false,
        hasContentChanges: true,
      });
      continue;
    }

    if (exactMatchIdx >= 0) {
      usedTargetIndices.add(exactMatchIdx);
      const tgtDisplay = targetDisplayTexts[exactMatchIdx];
      const rawDiff = tagDiffParts(
        diffWordsWithSpace(srcDisplay, tgtDisplay).map((p) => ({
          value: p.value, added: p.added, removed: p.removed,
        }))
      );
      const stats = getChangeStats(rawDiff);
      const hasAnyChange = stats.hasContentChanges || stats.hasWhitespaceChanges || stats.hasCaseChanges;
      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcDisplay,
        targetText: tgtDisplay,
        diff: hasAnyChange ? rawDiff : [{ value: srcDisplay }],
        status: hasAnyChange ? "changed" : (exactMatchIdx === i ? "match" : "moved"),
        ...stats,
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
      const tgtDisplay = targetDisplayTexts[bestIdx];
      const rawDiff = tagDiffParts(
        diffWordsWithSpace(srcDisplay, tgtDisplay).map((p) => ({
          value: p.value, added: p.added, removed: p.removed,
        }))
      );
      const stats = getChangeStats(rawDiff);
      const hasAnyChange = stats.hasContentChanges || stats.hasWhitespaceChanges || stats.hasCaseChanges;
      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcDisplay,
        targetText: tgtDisplay,
        diff: hasAnyChange ? rawDiff : [{ value: srcDisplay }],
        status: hasAnyChange ? "changed" : (bestIdx === i ? "match" : "moved"),
        ...stats,
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

      if (wordSimilarity(srcText, tgt) >= 0.7) {
        score += 6;
      }

      if (score > changedScore) {
        changedScore = score;
        changedIdx = ti;
      }
    }

    if (changedIdx >= 0 && changedScore >= 3) {
      usedTargetIndices.add(changedIdx);
      const tgtDisplay = targetDisplayTexts[changedIdx];
      const rawDiff = tagDiffParts(
        diffWordsWithSpace(srcDisplay, tgtDisplay).map((p) => ({
          value: p.value, added: p.added, removed: p.removed,
        }))
      );
      const stats = getChangeStats(rawDiff);
      comparisons.push({
        sectionType: src.type,
        sectionLabel: getSectionLabel(src, i),
        sourceText: srcDisplay,
        targetText: tgtDisplay,
        diff: rawDiff,
        status: "changed",
        ...stats,
      });
      continue;
    }

    // PASS 4: truly missing
    comparisons.push({
      sectionType: src.type,
      sectionLabel: getSectionLabel(src, i),
      sourceText: srcDisplay,
      targetText: "",
      diff: [{ value: srcDisplay, removed: true, changeType: "content" }],
      status: "missing",
      hasWhitespaceChanges: false,
      hasCaseChanges: false,
      hasContentChanges: true,
    });
  }

  // extra content on webpage
  for (let i = 0; i < targetSections.length; i++) {
    if (!usedTargetIndices.has(i)) {
      const targetDisplay = normalizeForDisplay(targetSections[i].text);
      comparisons.push({
        sectionType: targetSections[i].type,
        sectionLabel: getSectionLabel(targetSections[i], i),
        sourceText: "",
        targetText: targetDisplay,
        diff: [{ value: targetDisplay, added: true, changeType: "content" }],
        status: targetSections[i].type === "link" ? "hyperlinks" : "missing",
        targetHref: targetSections[i].type === "link" ? targetSections[i].href : undefined,
        hasWhitespaceChanges: false,
        hasCaseChanges: false,
        hasContentChanges: true,
      });
    }
  }

  const summary = {
    total: comparisons.length,
    changes: comparisons.filter(
      (c) => c.status === "changed"
    ).length,
    missing: comparisons.filter(
      (c) => c.status === "missing"
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