import { CheckCircle2, XCircle, AlertTriangle, Plus, ArrowUpDown, EyeOff, RotateCcw } from "lucide-react";
import type { ComparisonResult, SectionComparison } from "@/lib/diff-engine";

export type FilterType = "all" | "changed" | "missing" | "extra" | "match" | "out-of-order" | "ignored";

interface Props {
  result: ComparisonResult;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  ignoredIndices: Set<number>;
  onToggleIgnore: (index: number) => void;
}

const statusConfig = {
  match: { icon: CheckCircle2, label: "Match", className: "text-diff-added" },
  changed: { icon: AlertTriangle, label: "Changed", className: "text-diff-changed" },
  missing: { icon: XCircle, label: "Missing", className: "text-diff-removed" },
  extra: { icon: Plus, label: "Extra", className: "text-accent" },
  "out-of-order": { icon: ArrowUpDown, label: "Out of Order", className: "text-primary" },
};

const SectionRow = ({
  section,
  globalIndex,
  isIgnored,
  onToggleIgnore,
}: {
  section: SectionComparison;
  globalIndex: number;
  isIgnored: boolean;
  onToggleIgnore: (i: number) => void;
}) => {
  const config = statusConfig[section.status];
  const Icon = config.icon;

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30">
        <Icon className={`h-4 w-4 ${config.className}`} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {section.sectionLabel}
        </span>
        {section.status === "out-of-order" && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Out of Order
          </span>
        )}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            section.status === "match" || section.status === "out-of-order"
              ? "bg-diff-added-bg text-diff-added"
              : section.status === "changed"
                ? "bg-diff-changed-bg text-diff-changed"
                : section.status === "missing"
                  ? "bg-diff-removed-bg text-diff-removed"
                  : "bg-accent/10 text-accent"
          }`}
        >
          {config.label}
        </span>
        <button
          onClick={() => onToggleIgnore(globalIndex)}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title={isIgnored ? "Restore this row" : "Ignore this row"}
        >
          {isIgnored ? <RotateCcw className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Source (DOCX)</p>
          <div className="text-sm leading-relaxed">
            {section.status === "extra" ? (
              <span className="italic text-muted-foreground">— not in source —</span>
            ) : section.status === "missing" ? (
              <span className="rounded bg-diff-removed-bg px-0.5">{section.sourceText}</span>
            ) : section.status === "out-of-order" || section.status === "match" ? (
              <span>{section.sourceText}</span>
            ) : (
              section.diff.map((part, i) =>
                part.added ? null : (
                  <span
                    key={i}
                    className={part.removed ? "rounded bg-diff-changed-bg px-0.5" : ""}
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
              <span className="italic text-muted-foreground">— not found on page —</span>
            ) : section.status === "extra" ? (
              <span className="rounded bg-accent/10 px-0.5">{section.targetText}</span>
            ) : section.status === "out-of-order" || section.status === "match" ? (
              <span>{section.targetText}</span>
            ) : (
              section.diff.map((part, i) =>
                part.removed ? null : (
                  <span
                    key={i}
                    className={part.added ? "rounded bg-diff-changed-bg px-0.5 font-medium" : ""}
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

const DiffResults = ({ result, filter, onFilterChange, ignoredIndices, onToggleIgnore }: Props) => {
  const { summary } = result;
  const ignoredCount = ignoredIndices.size;

  const filtered =
    filter === "ignored"
      ? result.sections
          .map((s, i) => ({ section: s, index: i }))
          .filter(({ index }) => ignoredIndices.has(index))
      : filter === "all"
        ? result.sections
            .map((s, i) => ({ section: s, index: i }))
            .filter(({ index }) => !ignoredIndices.has(index))
        : result.sections
            .map((s, i) => ({ section: s, index: i }))
            .filter(({ section, index }) => !ignoredIndices.has(index) && section.status === filter);

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: summary.total - ignoredCount },
    { key: "changed", label: "Changed", count: summary.changes },
    { key: "missing", label: "Missing", count: summary.missing },
    { key: "extra", label: "Extra", count: summary.extra },
    { key: "out-of-order", label: "Out of Order", count: summary.outOfOrder },
    { key: "match", label: "Matches", count: summary.matches },
    { key: "ignored", label: "Ignored", count: ignoredCount },
  ];

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold text-foreground">Comparison Results</h2>

      {/* Summary bar */}
      <div className="mb-4 grid grid-cols-5 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{summary.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border border-diff-added/30 bg-diff-added-bg p-3 text-center">
          <p className="text-2xl font-bold text-diff-added">{summary.matches + summary.outOfOrder}</p>
          <p className="text-xs text-diff-added">Matches</p>
        </div>
        <div className="rounded-lg border border-diff-changed/30 bg-diff-changed-bg p-3 text-center">
          <p className="text-2xl font-bold text-diff-changed">{summary.changes}</p>
          <p className="text-xs text-diff-changed">Changes</p>
        </div>
        <div className="rounded-lg border border-diff-removed/30 bg-diff-removed-bg p-3 text-center">
          <p className="text-2xl font-bold text-diff-removed">{summary.missing}</p>
          <p className="text-xs text-diff-removed">Missing</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{summary.outOfOrder}</p>
          <p className="text-xs text-primary">Out of Order</p>
        </div>
      </div>

      {/* Filter tabs */}
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
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DiffResults;
