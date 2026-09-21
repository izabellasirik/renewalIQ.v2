import { prisma } from "@/lib/db";
import { ClientDocumentsUpload } from "@/components/ClientDocumentsUpload";
import { ClientDocumentRow } from "@/components/ClientDocumentRow";

// Needs Attention / Document Insights sections are temporarily disabled
// (not removed) — see components/DocumentInsightCard.tsx and
// components/NeedsAttentionPanel.tsx, still wired up and populated by the
// upload pipeline, just not rendered here for now.

export async function DocumentsTab({ clientId }: { clientId: string }) {
  const docs = await prisma.file.findMany({
    where: { clientId, purpose: "client_document" },
    include: { insight: true },
    orderBy: { uploadedAt: "desc" },
  });

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
    </div>
  );
}
