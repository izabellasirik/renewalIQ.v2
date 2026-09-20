import type { File as PrismaFile, Vehicle } from "@prisma/client";
import { Disclosure } from "./Disclosure";
import { StatusBadge } from "./StatusBadge";
import { UploadFileForm } from "./UploadFileForm";
import { DeleteButton } from "./DeleteButton";
import { ScheduleFollowUpButton } from "./ScheduleFollowUpButton";
import { SubmitButton } from "./SubmitButton";
import { assessVehicle } from "@/lib/status";
import { updateVehicle, uploadVehicleFile, deleteVehicle } from "@/app/actions/vehicles";
import { formatCurrency, formatShortDate, toDateInputValue } from "@/lib/format";

type VehicleFull = Vehicle & { files: PrismaFile[] };

function icon(ok: boolean) {
  return ok ? "✓" : "⚠";
}

export function VehicleCard({ vehicle, clientId }: { vehicle: VehicleFull; clientId: string }) {
  const assessment = assessVehicle(vehicle);
  const registrationFile = vehicle.files.find((f) => f.purpose === "registration");
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";

  return (
    <Disclosure
      summary={
        <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-base font-semibold text-foreground">{title}</span>
          <span className="text-muted">VIN {icon(!!vehicle.vin && !assessment.vinMismatch)}</span>
          <span className="text-muted">Value {assessment.valueMissing ? "Missing" : "✓"}</span>
          <span className="text-muted">Registration {icon(vehicle.registrationReceived)}</span>
          <StatusBadge
            label={assessment.overall}
            tone={assessment.overall === "Complete" ? "good" : "warn"}
          />
        </div>
      }
    >
      <form action={updateVehicle} className="grid grid-cols-2 gap-3">
        <input type="hidden" name="id" value={vehicle.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <div>
          <label className="field-label">Year</label>
          <input type="number" name="year" defaultValue={vehicle.year ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Make</label>
          <input name="make" defaultValue={vehicle.make ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Model</label>
          <input name="model" defaultValue={vehicle.model ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">VIN</label>
          <input name="vin" defaultValue={vehicle.vin ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Vehicle Value ($)</label>
          <input type="number" min={0} name="value" defaultValue={vehicle.value ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Value Note</label>
          <input name="valueNote" defaultValue={vehicle.valueNote ?? ""} className="input mt-1" />
        </div>

        <hr className="col-span-2 border-border" />
        <p className="field-label col-span-2">Registration</p>

        <div>
          <label className="field-label">Registered Owner</label>
          <input name="registrationOwner" defaultValue={vehicle.registrationOwner ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Registration VIN</label>
          <input name="registrationVin" defaultValue={vehicle.registrationVin ?? ""} className="input mt-1" />
        </div>
        <div className="col-span-2">
          <label className="field-label">Registration Address</label>
          <input name="registrationAddress" defaultValue={vehicle.registrationAddress ?? ""} className="input mt-1" />
        </div>
        <div>
          <label className="field-label">Registration Expiration</label>
          <input
            type="date"
            name="registrationExpiration"
            defaultValue={toDateInputValue(vehicle.registrationExpiration)}
            className="input mt-1"
          />
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="registrationReceived" defaultChecked={vehicle.registrationReceived} />
          Registration received
        </label>

        <div className="col-span-2 flex justify-end">
          <SubmitButton className="btn btn-secondary text-xs">Save Vehicle Info</SubmitButton>
        </div>
      </form>

      <div>
        <p className="field-label mb-1">Vehicle Value</p>
        <p className="text-lg font-semibold text-foreground">{formatCurrency(vehicle.value)}</p>
        {vehicle.valueRecordedAt && (
          <p className="text-xs text-muted">Recorded {formatShortDate(vehicle.valueRecordedAt)}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <UploadFileForm
          action={uploadVehicleFile}
          hiddenFields={{ vehicleId: vehicle.id, clientId, purpose: "registration" }}
          label="Upload Registration"
        />
        {registrationFile && (
          <a href={`/api/files/${registrationFile.id}`} target="_blank" className="text-xs text-accent hover:underline">
            {registrationFile.filename}
          </a>
        )}
      </div>

      {assessment.overall === "Needs Attention" && (
        <div className="space-y-2 rounded-lg bg-[var(--status-warn-bg)] p-3">
          {assessment.reasons.map((reason) => (
            <div key={reason} className="flex items-center justify-between gap-3 text-sm text-[var(--status-warn)]">
              <span>Needs Attention — {reason}</span>
              <ScheduleFollowUpButton
                clientId={clientId}
                buttonClassName="btn btn-secondary text-xs"
                label="Schedule Follow-Up"
                prefill={{
                  vehicleId: vehicle.id,
                  forLabel: `${reason} — ${title}`,
                  action: `Follow up with client regarding ${reason.toLowerCase()}.`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <DeleteButton
          action={deleteVehicle}
          hiddenFields={{ id: vehicle.id, clientId }}
          confirmMessage={`Remove ${title}?`}
        />
      </div>
    </Disclosure>
  );
}
