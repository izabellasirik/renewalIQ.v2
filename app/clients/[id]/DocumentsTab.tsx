import { prisma } from "@/lib/db";
import { ClientDocumentsUpload } from "@/components/ClientDocumentsUpload";
import { ClientDocumentRow } from "@/components/ClientDocumentRow";
import { DocumentInsightCard } from "@/components/DocumentInsightCard";
import { NeedsAttentionPanel, type AttentionItem } from "@/components/NeedsAttentionPanel";
import type { DocumentAnalysisCategory, DocumentIssue } from "@/lib/documentAnalysis";

export async function DocumentsTab({ clientId }: { clientId: string }) {
  const [docs, vehicles] = await Promise.all([
    prisma.file.findMany({
      where: { clientId, purpose: "client_document" },
      include: { insight: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.vehicle.findMany({ where: { clientId }, select: { vin: true } }),
  ]);

  const knownVins = vehicles.map((v) => v.vin).filter((v): v is string => !!v);
  const withInsight = docs.filter((d) => d.insight);

  const attentionItems: AttentionItem[] = withInsight.flatMap((d) =>
    (d.insight!.issues as unknown as DocumentIssue[]).map((issue) => ({
      issue,
      documentType: d.insight!.documentType as DocumentAnalysisCategory,
    }))
  );

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <ClientDocumentsUpload clientId={clientId} />

        <div className="mt-4">
          {docs.length === 0 ? (
            <p className="text-sm text-muted">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <ClientDocumentRow key={doc.id} doc={doc} clientId={clientId} />
              ))}
            </div>
          )}
        </div>
      </section>

      {withInsight.length > 0 && (
        <section className="surface-card p-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Needs Attention</h2>
          <NeedsAttentionPanel items={attentionItems} />
        </section>
      )}

      {withInsight.length > 0 && (
        <section className="surface-card p-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Document Insights</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {withInsight.map((doc) => (
              <DocumentInsightCard key={doc.id} file={doc} insight={doc.insight!} knownVins={knownVins} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
