import { prisma } from "@/lib/db";
import { AddDocumentButton } from "@/components/AddDocumentButton";
import { DocumentRow } from "@/components/DocumentRow";

export async function DocumentsTab({ clientId }: { clientId: string }) {
  const [client, docs, contacts] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
    prisma.documentRequirement.findMany({
      where: { clientId },
      include: { files: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contact.findMany({ where: { clientId } }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Document Checklist</h2>
        <AddDocumentButton clientId={clientId} />
      </div>

      {docs.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted">
          No document requirements yet. Add the documents you need to collect for this account.
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              clientId={clientId}
              companyName={client.companyName}
              contactName={client.primaryContactName}
              contacts={contacts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
