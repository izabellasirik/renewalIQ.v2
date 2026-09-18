import type { File as PrismaFile, MarketSubmission } from "@prisma/client";
import { Disclosure } from "./Disclosure";
import { StatusBadge, marketStatusTone } from "./StatusBadge";
import { UploadFileForm } from "./UploadFileForm";
import { DeleteButton } from "./DeleteButton";
import { ScheduleFollowUpButton } from "./ScheduleFollowUpButton";
import { SubmitButton } from "./SubmitButton";
import { updateMarket, uploadQuoteFile, deleteMarket } from "@/app/actions/markets";
import { formatCurrency, formatShortDate, toDateInputValue } from "@/lib/format";
import { MARKET_STATUSES } from "@/lib/constants";

type MarketFull = MarketSubmission & { files: PrismaFile[] };

export function MarketCard({
  market,
  clientId,
  nextFollowUpDate,
}: {
  market: MarketFull;
  clientId: string;
  nextFollowUpDate: Date | null;
}) {
  const quoteFile = market.files.find((f) => f.purpose === "quote");
  const hasQuote = market.status === "Quote Received" || market.status === "Bound";

  return (
    <Disclosure
      summary={
        <div className="min-w-0">
          <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="text-base font-semibold text-foreground">{market.carrierName}</span>
            {market.contactName && <span className="text-muted">{market.contactName} · Underwriter</span>}
            <StatusBadge label={market.status} tone={marketStatusTone(market.status)} />
            {market.submittedDate && (
              <span className="text-muted">Submitted {formatShortDate(market.submittedDate)}</span>
            )}
            {nextFollowUpDate && <span className="text-muted">Follow-up {formatShortDate(nextFollowUpDate)}</span>}
          </div>
          {market.notes && <p className="mt-1 truncate text-sm text-muted">{market.notes}</p>}
        </div>
      }
    >
      <form action={updateMarket} className="grid grid-cols-2 gap-3">
        <input type="hidden" name="id" value={market.id} />
        <input type="hidden" name="clientId" value={clientId} />

        <div>
          <label className="field-label">Carrier / Market Name</label>
          <input name="carrierName" defaultValue={market.carrierName} required className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={market.status} className="input mt-1">
            {MARKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Contact / Underwriter Name</label>
          <input name="contactName" defaultValue={market.contactName ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Date Submitted</label>
          <input
            type="date"
            name="submittedDate"
            defaultValue={toDateInputValue(market.submittedDate)}
            className="input mt-1"
          />
        </div>

        <div>
          <label className="field-label">Contact Email</label>
          <input type="email" name="contactEmail" defaultValue={market.contactEmail ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Contact Phone</label>
          <input name="contactPhone" defaultValue={market.contactPhone ?? ""} className="input mt-1" />
        </div>

        <div className="col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" defaultValue={market.notes ?? ""} rows={2} className="input mt-1" />
        </div>

        <hr className="col-span-2 border-border" />
        <p className="field-label col-span-2">Requested Information</p>
        <div className="col-span-2">
          <label className="field-label">What the carrier requested (if any)</label>
          <textarea
            name="requestedInfo"
            defaultValue={market.requestedInfo ?? ""}
            rows={2}
            className="input mt-1"
            placeholder={"Updated MVR for John Smith\nCurrent vehicle registration"}
          />
        </div>

        <hr className="col-span-2 border-border" />
        <p className="field-label col-span-2">Quote Information</p>
        <div>
          <label className="field-label">Premium ($)</label>
          <input type="number" min={0} name="premium" defaultValue={market.premium ?? ""} className="input mt-1" />
        </div>
        <div />
        <div>
          <label className="field-label">Effective Date</label>
          <input
            type="date"
            name="effectiveDate"
            defaultValue={toDateInputValue(market.effectiveDate)}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="field-label">Expiration Date</label>
          <input
            type="date"
            name="expirationDate"
            defaultValue={toDateInputValue(market.expirationDate)}
            className="input mt-1"
          />
        </div>

        <div className="col-span-2 flex justify-end">
          <SubmitButton className="btn btn-secondary text-xs">Save Market</SubmitButton>
        </div>
      </form>

      {hasQuote && market.premium != null && (
        <div>
          <p className="field-label mb-1">Quote Premium</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(market.premium)}</p>
          {(market.effectiveDate || market.expirationDate) && (
            <p className="text-xs text-muted">
              {formatShortDate(market.effectiveDate)} – {formatShortDate(market.expirationDate)}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <UploadFileForm
          action={uploadQuoteFile}
          hiddenFields={{ marketId: market.id, clientId }}
          label="Upload Quote Document"
        />
        {quoteFile && (
          <a href={quoteFile.path} target="_blank" className="text-xs text-accent hover:underline">
            {quoteFile.filename}
          </a>
        )}
      </div>

      {market.status === "More Info Needed" && (
        <div className="space-y-2 rounded-lg bg-[var(--status-warn-bg)] p-3">
          <p className="text-sm text-[var(--status-warn)]">
            Needs Attention — {market.carrierName} requested more information.
          </p>
          {market.requestedInfo && (
            <p className="whitespace-pre-wrap text-sm text-[var(--status-warn)]">{market.requestedInfo}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <ScheduleFollowUpButton
          clientId={clientId}
          buttonClassName="btn btn-secondary text-xs"
          label="Schedule Follow-Up"
          prefill={{
            marketSubmissionId: market.id,
            forLabel: `Follow up with ${market.carrierName}`,
            action: `Follow up with ${market.contactName || market.carrierName} regarding ${market.carrierName} quote.`,
          }}
        />
        <DeleteButton
          action={deleteMarket}
          hiddenFields={{ id: market.id, clientId }}
          confirmMessage={`Remove ${market.carrierName} as a market for this account?`}
        />
      </div>
    </Disclosure>
  );
}
