import type { LocalFile, LocalDocumentInsight } from "@/lib/localdb/types";
import { StatusBadge } from "./StatusBadge";
import { DeleteButton } from "./DeleteButton";
import { deleteClientDocument } from "@/lib/localdb/repository";
import { formatShortDate } from "@/lib/format";
import { DOCUMENT_ANALYSIS_CATEGORY_LABELS, type DocumentAnalysisCategory } from "@/lib/documentAnalysis";

type Row = LocalFile & { insight: LocalDocumentInsight | null };

function fileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "heic", "webp"].includes(ext)) return "🖼️";
  if (ext === "pdf" || ext === "doc" || ext === "docx") return "📄";
  return "📁";
}

export function ClientDocumentRow({ doc, clientId }: { doc: Row; clientId: string }) {
  const categoryLabel = doc.category
    ? DOCUMENT_ANALYSIS_CATEGORY_LABELS[doc.category as DocumentAnalysisCategory]
    : "Document";

  const statusLabel = doc.analysisStatus === "Failed" ? "Failed" : doc.insight?.needsReview ? "Needs Review" : "Ready";
  const statusTone = doc.analysisStatus === "Failed" ? "bad" : doc.insight?.needsReview ? "warn" : "good";

  return (
    <div className="surface-card flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden>
          {fileIcon(doc.filename)}
        </span>
        <div>
          <p className="font-medium text-foreground">{doc.filename}</p>
          <p className="text-sm text-muted">
            {categoryLabel} · {formatShortDate(doc.uploadedAt)}
            {doc.isDemo && " · Demo"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge label={statusLabel} tone={statusTone} />
        <span className="text-xs italic text-muted">Not retained</span>
        <DeleteButton
          action={deleteClientDocument}
          hiddenFields={{ id: doc.id, clientId }}
          confirmMessage={`Delete "${doc.filename}"?`}
        />
      </div>
    </div>
  );
}
