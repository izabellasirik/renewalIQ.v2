import type { DocumentIssue, IssueCategory, DocumentAnalysisCategory } from "@/lib/documentAnalysis";
import { DOCUMENT_ANALYSIS_CATEGORY_LABELS } from "@/lib/documentAnalysis";

export interface AttentionItem {
  issue: DocumentIssue;
  documentType: DocumentAnalysisCategory;
}

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  review: "REVIEW",
  update: "UPDATE",
  mismatch: "MISMATCH",
};

const CATEGORY_COLOR: Record<IssueCategory, string> = {
  review: "text-[var(--status-bad)]",
  update: "text-[var(--status-warn)]",
  mismatch: "text-[var(--status-bad)]",
};

export function NeedsAttentionPanel({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-6 text-center text-sm text-muted">
        Nothing needs attention right now — uploaded documents look complete.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {items.length} {items.length === 1 ? "item" : "items"} need review
      </p>
      {items.map(({ issue, documentType }, i) => (
        <div key={i} className="surface-card flex items-start justify-between gap-4 p-4">
          <div>
            <p className={`text-xs font-semibold tracking-wide ${CATEGORY_COLOR[issue.category]}`}>
              {CATEGORY_LABEL[issue.category]}
            </p>
            <p className="mt-0.5 text-sm text-foreground">{issue.message}</p>
            <p className="mt-0.5 text-xs text-muted">
              {issue.subject ? `${issue.subject} · ` : ""}
              {DOCUMENT_ANALYSIS_CATEGORY_LABELS[documentType]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
