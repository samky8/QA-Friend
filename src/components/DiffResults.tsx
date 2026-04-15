import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ArrowUpDown, EyeOff, RotateCcw, Globe2Icon } from "lucide-react";
import type { ComparisonResult, SectionComparison, DiffPart } from "@/lib/diff-engine2";

export type FilterType = "all" | "changed" | "missing" | "moved" | "hyperlinks" | "ignored" | "resolved";

interface Props {
  result: ComparisonResult;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  ignoredIndices: Set<number>;
  onToggleIgnore: (index: number) => void;
  resolvedIndices: Set<number>;
  onToggleResolve: (index: number) => void;
}

const statusConfig = {
  match: { icon: CheckCircle2, label: "Match", className: "text-diff-added" },
  changed: { icon: AlertTriangle, label: "Changed", className: "text-diff-changed" },
  missing: { icon: XCircle, label: "Missing", className: "text-diff-removed" },
  hyperlinks: { icon: Globe2Icon, label: "Hyperlink", className: "text-hyperlinks" },
  moved: { icon: ArrowUpDown, label: "Moved", className: "text-primary" },
};

const SectionRow = ({
  section,
  globalIndex,
  isIgnored,
  onToggleIgnore,
  isResolved,
  onToggleResolve,
  ignoreWhitespace,
  ignoreCase,
}: {
  section: SectionComparison;
  globalIndex: number;
  isIgnored: boolean;
  onToggleIgnore: (i: number) => void;
  isResolved: boolean;
  onToggleResolve: (i: number) => void;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
}) => {
  const config = statusConfig[section.status];
  const Icon = config.icon;

  const shouldHighlight = (part: DiffPart) =>
    !(part.changeType === "whitespace" && ignoreWhitespace) &&
    !(part.changeType === "case" && ignoreCase);

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30">
        <Icon className={`h-4 w-4 ${config.className}`} />
       <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
         {section.sectionLabel}
        </span>
        {section.status === "moved" && (
         <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        Appears elsewhere on the page 
         </span>
        )}
        
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            section.status === "match" || section.status === "moved"
              ? "bg-diff-added-bg text-diff-added"
              : section.status === "changed"
                ? "bg-diff-changed-bg text-diff-changed"
                : section.status === "missing"
                  ? "bg-diff-removed-bg text-diff-removed"
                  : "bg-hyperlinks-bg text-hyperlinks"
          }`}
        >
          {config.label}
        </span>
        <button
          onClick={() => onToggleIgnore(globalIndex)}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title={isIgnored ? "Restore (unignore)" : "Ignore this row"}
        >
          {isIgnored ? <RotateCcw className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onToggleResolve(globalIndex)}
          className="ml-1 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-diff-added transition-colors"
          title={isResolved ? "Restore (unresolve)" : "Mark as resolved"}
        >
          {isResolved ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Source (DOCX)</p>
          <div className="text-sm leading-relaxed">
            {section.status === "missing" ? (
              section.sourceText
                ? <span className="rounded bg-diff-removed-highlight px-0.5 dark:text-gray-900">{section.sourceText}</span>
                : <span className="italic text-muted-foreground">— not found in source —</span>
            ) : section.status === "hyperlinks" ? (
              <>
                {section.sourceText
                  ? section.diff.map((part, i) =>
                      part.added ? null : (
                        <span
                          key={i}
                          className={part.removed && shouldHighlight(part) ? "rounded bg-diff-changed-highlight px-0.5 dark:text-gray-900" : ""}
                        >
                          {part.value}
                        </span>
                      )
                    )
                  : <span className="italic text-muted-foreground">— not found in source —</span>
                }
                {section.sourceHref && (
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{section.sourceHref}</p>
                )}
              </>
            ) : section.status === "moved" ? (
              <span>{section.sourceText}</span>
            ) : (
              section.diff.map((part, i) =>
                part.added ? null : (
                  <span
                    key={i}
                    className={part.removed && shouldHighlight(part) ? "rounded bg-diff-changed-highlight px-0.5 dark:text-gray-900" : ""}
                  >
                    {part.value}
                  </span>
                )
              )
            )}
          </div>
        </div>

        <div className="p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Target (Webpage)</p>
          <div className="text-sm leading-relaxed">
            {section.status === "missing" ? (
              section.targetText
                ? <span className="rounded bg-diff-removed-highlight px-0.5 dark:text-gray-900">{section.targetText}</span>
                : <span className="italic text-muted-foreground">— not found on page —</span>
            ) : section.status === "hyperlinks" ? (
              <>
                {section.targetText
                  ? section.diff.map((part, i) =>
                      part.removed ? null : (
                        <span
                          key={i}
                          className={part.added && shouldHighlight(part) ? "rounded bg-diff-changed-highlight px-0.5 font-medium dark:text-gray-900" : ""}
                        >
                          {part.value}
                        </span>
                      )
                    )
                  : <span className="italic text-muted-foreground">— not found on page —</span>
                }
                {section.targetHref && (
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{section.targetHref}</p>
                )}
              </>
            ) : section.status === "moved" ? (
              <span>{section.targetText}</span>
            ) : (
              section.diff.map((part, i) =>
                part.removed ? null : (
                  <span
                    key={i}
                    className={part.added && shouldHighlight(part) ? "rounded bg-diff-changed-highlight px-0.5 font-medium dark:text-gray-900" : ""}
                  >
                    {part.value}
                  </span>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DiffResults = ({ result, filter, onFilterChange, ignoredIndices, onToggleIgnore, resolvedIndices, onToggleResolve }: Props) => {
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  const isEffectivelyActive = (section: SectionComparison): boolean => {
    if (section.status === "match" || section.status === "moved") return false;
    if (section.status !== "changed") return true;
    return (
      section.hasContentChanges ||
      (!ignoreWhitespace && section.hasWhitespaceChanges) ||
      (!ignoreCase && section.hasCaseChanges)
    );
  };

  const { summary } = result;
  const ignoredCount = ignoredIndices.size;
  const resolvedCount = resolvedIndices.size;
  const allCount = result.sections.filter(
    (section, index) =>
      !ignoredIndices.has(index) &&
      !resolvedIndices.has(index) &&
      isEffectivelyActive(section)
  ).length;

  const visibleHyperlinkCount = result.sections.filter(
    (section, index) => !ignoredIndices.has(index) && !resolvedIndices.has(index) && section.status === "hyperlinks"
  ).length;

  const visibleChangedCount = result.sections.filter(
    (section, index) =>
      !ignoredIndices.has(index) &&
      !resolvedIndices.has(index) &&
      section.status === "changed" &&
      isEffectivelyActive(section)
  ).length;

  const visibleMissingCount = result.sections.filter(
    (section, index) => !ignoredIndices.has(index) && !resolvedIndices.has(index) && section.status === "missing"
  ).length;

  const visibleMovedCount = result.sections.filter(
    (section, index) => !ignoredIndices.has(index) && !resolvedIndices.has(index) && section.status === "moved"
  ).length;

  const filtered =
    filter === "ignored"
      ? result.sections
          .map((s, i) => ({ section: s, index: i }))
          .filter(({ index }) => ignoredIndices.has(index))
      : filter === "resolved"
        ? result.sections
            .map((s, i) => ({ section: s, index: i }))
            .filter(({ index }) => resolvedIndices.has(index))
      : filter === "all"
        ? result.sections
            .map((s, i) => ({ section: s, index: i }))
            .filter(
              ({ section, index }) =>
                !ignoredIndices.has(index) &&
                !resolvedIndices.has(index) &&
                isEffectivelyActive(section)
            )
        : filter === "changed"
          ? result.sections
              .map((s, i) => ({ section: s, index: i }))
              .filter(({ section, index }) =>
                !ignoredIndices.has(index) &&
                !resolvedIndices.has(index) &&
                section.status === "changed" &&
                isEffectivelyActive(section)
              )
          : filter === "hyperlinks"
            ? result.sections
                .map((s, i) => ({ section: s, index: i }))
                .filter(({ section, index }) => !ignoredIndices.has(index) && !resolvedIndices.has(index) && section.status === "hyperlinks")
            : result.sections
                .map((s, i) => ({ section: s, index: i }))
                .filter(({ section, index }) => !ignoredIndices.has(index) && !resolvedIndices.has(index) && section.status === filter);

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: allCount },
    { key: "changed", label: "Changed", count: visibleChangedCount },
    { key: "missing", label: "Missing", count: visibleMissingCount },
    { key: "hyperlinks", label: "Hyperlinks", count: visibleHyperlinkCount },
    { key: "moved", label: "Moved", count: visibleMovedCount },
    { key: "ignored", label: "Ignored", count: ignoredCount },
    { key: "resolved", label: "Resolved", count: resolvedCount },
  ];

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold text-foreground">Comparison results</h2>

      {/* Summary bar */}
      <div className="mb-4 grid grid-cols-5 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{allCount}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border border-diff-changed/30 bg-diff-changed-bg p-3 text-center">
          <p className="text-2xl font-bold text-diff-changed">{visibleChangedCount}</p>
          <p className="text-xs text-diff-changed">Changed</p>
        </div>
        <div className="rounded-lg border border-diff-removed/30 bg-diff-removed-bg p-3 text-center">
          <p className="text-2xl font-bold text-diff-removed">{visibleMissingCount}</p>
          <p className="text-xs text-diff-removed">Missing</p>
        </div>
        <div className="rounded-lg border border-diff-hyperlinks/30 bg-hyperlinks-bg p-3 text-center">
          <p className="text-2xl font-bold text-hyperlinks">{visibleHyperlinkCount}</p>
          <p className="text-xs text-hyperlinks">Hyperlinks</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{visibleMovedCount}</p>
          <p className="text-xs text-primary">Moved</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
        <label className="flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            checked={ignoreWhitespace}
            onChange={(e) => setIgnoreWhitespace(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Ignore whitespace changes
        </label>
        <label className="flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            checked={ignoreCase}
            onChange={(e) => setIgnoreCase(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Ignore case changes
        </label>
      </div>
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-card p-1 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors min-w-[80px] ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Diff sections */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No sections match this filter.</p>
        ) : (
          filtered.map(({ section, index }) => (
            <SectionRow
              key={index}
              section={section}
              globalIndex={index}
              isIgnored={ignoredIndices.has(index)}
              onToggleIgnore={onToggleIgnore}
              isResolved={resolvedIndices.has(index)}
              onToggleResolve={onToggleResolve}
              ignoreWhitespace={ignoreWhitespace}
              ignoreCase={ignoreCase}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DiffResults;
