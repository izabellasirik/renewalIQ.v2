import { StatusBadge, documentStatusTone } from "./StatusBadge";
import { UploadFileForm } from "./UploadFileForm";
import { DeleteButton } from "./DeleteButton";
import { EditDocumentButton } from "./EditDocumentButton";
import { ScheduleFollowUpButton } from "./ScheduleFollowUpButton";
import { DraftEmailButton } from "./DraftEmailButton";
import { updateDocumentStatus, uploadDocumentFile, deleteDocumentRequirement } from "@/lib/localdb/repository";
import { formatShortDate } from "@/lib/format";
import { DOCUMENT_STATUSES } from "@/lib/constants";

type Doc = {
  id: string;
  name: string;
  status: string;
  note: string | null;
  receivedAt: Date | null;
  files: { id: string; filename: string }[];
};

export function DocumentRow({
  doc,
  clientId,
  companyName,
  contactName,
  contacts,
}: {
  doc: Doc;
  clientId: string;
  companyName: string;
  contactName: string | null;
  contacts: { id: string; name: string }[];
}) {
  const icon = doc.status === "Received" ? "✓" : "❌";
  const statusLine =
    doc.status === "Received" && doc.receivedAt
      ? `Received ${formatShortDate(doc.receivedAt)}`
      : doc.status;

  const otherStatuses = DOCUMENT_STATUSES.filter((s) => s !== doc.status);

  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={doc.status === "Received" ? "text-lg text-foreground" : "text-lg text-muted"} aria-hidden>
            {icon}
          </span>
          <div>
            <p className="font-medium text-foreground">{doc.name}</p>
            <p className="text-sm text-muted">{statusLine}</p>
            {doc.note && <p className="mt-0.5 text-sm italic text-muted">{doc.note}</p>}
            {doc.files.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {doc.files.map((f) => (
                  <li key={f.id} className="text-xs text-muted">
                    {f.filename} <span className="italic">(not retained in this test build)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <StatusBadge label={doc.status} tone={documentStatusTone(doc.status)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {otherStatuses.map((s) => (
          <form key={s} action={updateDocumentStatus}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="status" value={s} />
            <button type="submit" className="btn btn-secondary text-xs">
              Mark {s}
            </button>
          </form>
        ))}

        <UploadFileForm
          action={uploadDocumentFile}
          hiddenFields={{ id: doc.id, clientId }}
          label="Attach File"
        />

        {doc.status !== "Received" && (
          <>
            <ScheduleFollowUpButton
              clientId={clientId}
              contacts={contacts}
              buttonClassName="btn btn-secondary text-xs"
              label="Schedule Follow-Up"
              prefill={{
                documentRequirementId: doc.id,
                forLabel: doc.name,
                action: `Follow up with client regarding ${doc.name.toLowerCase()}.`,
              }}
            />
            <DraftEmailButton companyName={companyName} contactName={contactName} documentName={doc.name} />
          </>
        )}

        <EditDocumentButton doc={doc} clientId={clientId} />
        <DeleteButton
          action={deleteDocumentRequirement}
          hiddenFields={{ id: doc.id, clientId }}
          confirmMessage={`Delete "${doc.name}"?`}
        />
      </div>
    </div>
  );
}
