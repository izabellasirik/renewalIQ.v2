import type { Driver, File as PrismaFile, MedicalCert, Mvr, Violation } from "@prisma/client";
import { Disclosure } from "./Disclosure";
import { StatusBadge } from "./StatusBadge";
import { UploadFileForm } from "./UploadFileForm";
import { DeleteButton } from "./DeleteButton";
import { AddMvrButton } from "./AddMvrButton";
import { AddViolationButton } from "./AddViolationButton";
import { AddMedicalCertButton } from "./AddMedicalCertButton";
import { ScheduleFollowUpButton } from "./ScheduleFollowUpButton";
import { SubmitButton } from "./SubmitButton";
import { assessDriver } from "@/lib/status";
import { updateDriver, uploadDriverFile, deleteDriver } from "@/app/actions/drivers";
import { formatShortDate, toDateInputValue } from "@/lib/format";
import { US_STATES } from "@/lib/constants";

type DriverFull = Driver & {
  files: PrismaFile[];
  mvrs: (Mvr & { violations: Violation[]; files: PrismaFile[] })[];
  medicalCerts: (MedicalCert & { files: PrismaFile[] })[];
};

function icon(ok: boolean) {
  return ok ? "✓" : "⚠";
}

export function DriverCard({ driver, clientId }: { driver: DriverFull; clientId: string }) {
  const assessment = assessDriver(driver);
  const latestMvr = assessment.mvr.latest;
  const latestMedical = assessment.medical.latest;
  const licenseFile = driver.files.find((f) => f.purpose === "license");
  const previousLicenseFile = driver.files.find((f) => f.purpose === "previousLicense");

  return (
    <Disclosure
      summary={
        <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-base font-semibold text-foreground">{driver.name}</span>
          <span className="text-muted">License {icon(!assessment.license.needsAttention)}</span>
          <span className="text-muted">MVR {icon(!assessment.mvr.needsAttention)}</span>
          <span className="text-muted">Medical {icon(!assessment.medical.needsAttention)}</span>
          <StatusBadge
            label={`Overall: ${assessment.overall}`}
            tone={assessment.overall === "Complete" ? "good" : "warn"}
          />
        </div>
      }
    >
      {/* License */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Driver&apos;s License / ID</h4>
          <StatusBadge
            label={assessment.license.status}
            tone={assessment.license.status === "Expired" ? "bad" : assessment.license.status === "Expiring Soon" ? "warn" : "good"}
          />
        </div>
        <form action={updateDriver} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="id" value={driver.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="name" value={driver.name} />
          <div>
            <label className="field-label">License Number</label>
            <input name="licenseNumber" defaultValue={driver.licenseNumber ?? ""} className="input mt-1" />
          </div>
          <div>
            <label className="field-label">State</label>
            <select name="licenseState" defaultValue={driver.licenseState ?? ""} className="input mt-1">
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Issue Date</label>
            <input type="date" name="licenseIssueDate" defaultValue={toDateInputValue(driver.licenseIssueDate)} className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Expiration Date</label>
            <input type="date" name="licenseExpirationDate" defaultValue={toDateInputValue(driver.licenseExpirationDate)} className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Required Licensing History (years)</label>
            <input type="number" min={0} name="requiredHistoryYears" defaultValue={driver.requiredHistoryYears ?? ""} className="input mt-1" />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="previousLicenseNeeded" defaultChecked={driver.previousLicenseNeeded} />
            Previous License Needed
          </label>
          <div className="col-span-2 flex justify-end">
            <SubmitButton className="btn btn-secondary text-xs">Save License Info</SubmitButton>
          </div>
        </form>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <UploadFileForm
            action={uploadDriverFile}
            hiddenFields={{ driverId: driver.id, clientId, purpose: "license" }}
            label="Upload License"
          />
          {driver.previousLicenseNeeded && (
            <UploadFileForm
              action={uploadDriverFile}
              hiddenFields={{ driverId: driver.id, clientId, purpose: "previousLicense" }}
              label="Upload Previous License"
            />
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-3">
          {licenseFile && (
            <a href={`/api/files/${licenseFile.id}`} target="_blank" className="text-xs text-accent hover:underline">
              {licenseFile.filename}
            </a>
          )}
          {previousLicenseFile && (
            <a href={`/api/files/${previousLicenseFile.id}`} target="_blank" className="text-xs text-accent hover:underline">
              Previous license: {previousLicenseFile.filename}
            </a>
          )}
        </div>

        {assessment.license.needsAttention && (
          <div className="mt-3 space-y-2 rounded-lg bg-[var(--status-warn-bg)] p-3">
            {assessment.license.reasons.map((reason) => (
              <div key={reason} className="flex items-center justify-between gap-3 text-sm text-[var(--status-warn)]">
                <span>Needs Attention — {reason}</span>
                <ScheduleFollowUpButton
                  clientId={clientId}
                  buttonClassName="btn btn-secondary text-xs"
                  label="Schedule Follow-Up"
                  prefill={{
                    driverId: driver.id,
                    forLabel: reason,
                    action:
                      reason === "Previous license/history may be required"
                        ? "Follow up with client for previous driver's license."
                        : `Follow up with client regarding ${reason.toLowerCase()}.`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MVR */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">MVR</h4>
          <AddMvrButton driverId={driver.id} clientId={clientId} />
        </div>
        {latestMvr ? (
          <div className="text-sm text-foreground">
            <p>MVR Reported: {formatShortDate(latestMvr.reportDate)}</p>
            <p className="text-muted">
              Age: {assessment.mvr.ageDays} days · History: {latestMvr.historyYears ?? "—"} years (requires{" "}
              {assessment.mvr.requiredYears})
            </p>
            {latestMvr.notes && <p className="mt-1 italic text-muted">{latestMvr.notes}</p>}

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {assessment.mvr.violationCounts.total} Violation{assessment.mvr.violationCounts.total === 1 ? "" : "s"}
                {assessment.mvr.violationCounts.total > 0 && (
                  <span className="text-muted">
                    {" "}
                    ({assessment.mvr.violationCounts.severe} Severe, {assessment.mvr.violationCounts.moderate} Moderate,{" "}
                    {assessment.mvr.violationCounts.minor} Minor)
                  </span>
                )}
              </p>
              <AddViolationButton mvrId={latestMvr.id} clientId={clientId} />
            </div>
            {latestMvr.violations.length > 0 && (
              <ul className="mt-2 space-y-1">
                {latestMvr.violations.map((v) => (
                  <li key={v.id} className="flex items-center justify-between text-sm">
                    <span>
                      {v.type} {v.date && `— ${formatShortDate(v.date)}`}
                    </span>
                    <StatusBadge
                      label={v.severity}
                      tone={v.severity === "Severe" ? "bad" : v.severity === "Moderate" ? "warn" : "neutral"}
                    />
                  </li>
                ))}
              </ul>
            )}
            {latestMvr.files.length > 0 && (
              <a href={`/api/files/${latestMvr.files[0].id}`} target="_blank" className="mt-2 inline-block text-xs text-accent hover:underline">
                {latestMvr.files[0].filename}
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">No MVR on file.</p>
        )}

        {assessment.mvr.needsAttention && (
          <div className="mt-3 space-y-2 rounded-lg bg-[var(--status-warn-bg)] p-3">
            {assessment.mvr.reasons.map((reason) => (
              <div key={reason} className="flex items-center justify-between gap-3 text-sm text-[var(--status-warn)]">
                <span>Needs Attention — {reason}</span>
                <ScheduleFollowUpButton
                  clientId={clientId}
                  buttonClassName="btn btn-secondary text-xs"
                  label="Schedule Follow-Up"
                  prefill={{
                    driverId: driver.id,
                    forLabel: reason,
                    action: `Follow up with client regarding ${reason.toLowerCase()}.`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medical */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Medical Certificate</h4>
          <AddMedicalCertButton driverId={driver.id} clientId={clientId} />
        </div>
        {latestMedical ? (
          <div className="text-sm text-foreground">
            <p>
              Issued {formatShortDate(latestMedical.issueDate)} · Expires {formatShortDate(latestMedical.expirationDate)}
            </p>
            {latestMedical.files.length > 0 && (
              <a href={`/api/files/${latestMedical.files[0].id}`} target="_blank" className="mt-1 inline-block text-xs text-accent hover:underline">
                {latestMedical.files[0].filename}
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">No medical certificate on file.</p>
        )}
        {assessment.medical.needsAttention && (
          <div className="mt-3 space-y-2 rounded-lg bg-[var(--status-bad-bg)] p-3">
            {assessment.medical.reasons.map((reason) => (
              <div key={reason} className="flex items-center justify-between gap-3 text-sm text-[var(--status-bad)]">
                <span>Needs Attention — {reason}</span>
                <ScheduleFollowUpButton
                  clientId={clientId}
                  buttonClassName="btn btn-secondary text-xs"
                  label="Schedule Follow-Up"
                  prefill={{
                    driverId: driver.id,
                    forLabel: reason,
                    action: `Follow up with client regarding ${reason.toLowerCase()}.`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <DeleteButton
          action={deleteDriver}
          hiddenFields={{ id: driver.id, clientId }}
          confirmMessage={`Remove driver ${driver.name}?`}
        />
      </div>
    </Disclosure>
  );
}
