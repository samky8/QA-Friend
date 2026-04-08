import { CheckCircle2, XCircle, AlertTriangle, Plus } from "lucide-react";
import type { ComparisonResult, SectionComparison } from "@/lib/diff-engine";

interface Props {
  result: ComparisonResult;
  filter: "all" | "changed" | "missing" | "extra" | "match";
  onFilterChange: (f: Props["filter"]) => void;
}

const statusConfig = {
  match: { icon: CheckCircle2, label: "Match", className: "text-diff-added" },
  changed: { icon: AlertTriangle, label: "Changed", className: "text-diff-changed" },
  missing: { icon: XCircle, label: "Missing", className: "text-diff-removed" },
  extra: { icon: Plus, label: "Extra", className: "text-accent" },
};

const SectionRow = ({ section }: { section: SectionComparison }) => {
  const config = statusConfig[section.status];
  const Icon = config.icon;

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30">
        <Icon className={`h-4 w-4 ${config.className}`} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {section.sectionLabel}
        </span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
          section.status === "match" ? "bg-diff-added-bg text-diff-added" :
          section.status === "changed" ? "bg-diff-changed-bg text-diff-changed" :
          section.status === "missing" ? "bg-diff-removed-bg text-diff-removed" :
          "bg-accent/10 text-accent"
        }`}>
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Source (DOCX)</p>
          <div className="text-sm leading-relaxed">
            {section.status === "extra" ? (
              <span className="italic text-muted-foreground">— not in source —</span>
            ) : section.status === "missing" ? (
              <span className="rounded bg-diff-removed-bg px-0.5">{section.sourceText}</span>
            ) : (
              section.diff.map((part, i) =>
                part.added ? null : (
                  <span
                    key={i}
                    className={part.removed ? "rounded bg-diff-removed-bg line-through" : ""}
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
            ) : (
              section.diff.map((part, i) =>
                part.removed ? null : (
                  <span
                    key={i}
                    className={part.added ? "rounded bg-diff-added-bg font-medium" : ""}
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

const DiffResults = ({ result, filter, onFilterChange }: Props) => {
  const { summary } = result;
  const filtered = filter === "all" ? result.sections : result.sections.filter((s) => s.status === filter);

  const filters: { key: Props["filter"]; label: string; count: number }[] = [
    { key: "all", label: "All", count: summary.total },
    { key: "changed", label: "Changed", count: summary.changes },
    { key: "missing", label: "Missing", count: summary.missing },
    { key: "extra", label: "Extra", count: summary.extra },
    { key: "match", label: "Matches", count: summary.matches },
  ];

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold text-foreground">Comparison Results</h2>

      {/* Summary bar */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{summary.total}</p>
          <p className="text-xs text-muted-foreground">Total Sections</p>
        </div>
        <div className="rounded-lg border border-diff-added/30 bg-diff-added-bg p-3 text-center">
          <p className="text-2xl font-bold text-diff-added">{summary.matches}</p>
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
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-card p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
          filtered.map((section, i) => <SectionRow key={i} section={section} />)
        )}
      </div>
    </div>
  );
};

export default DiffResults;
