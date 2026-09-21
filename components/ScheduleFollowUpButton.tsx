"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { scheduleFollowUp } from "@/lib/localdb/repository";
import { toDateInputValue } from "@/lib/format";
import { addDays } from "date-fns";

type Contact = { id: string; name: string };

export type FollowUpPrefill = {
  forLabel?: string;
  action?: string;
  documentRequirementId?: string;
  contactId?: string;
  driverId?: string;
  vehicleId?: string;
  marketSubmissionId?: string;
};

export function ScheduleFollowUpButton({
  clientId,
  contacts,
  prefill,
  label = "Schedule Follow-Up",
  buttonClassName = "btn btn-primary",
}: {
  clientId: string;
  contacts?: Contact[];
  prefill?: FollowUpPrefill;
  label?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await scheduleFollowUp(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Schedule Follow-Up">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          {prefill?.documentRequirementId && (
            <input type="hidden" name="documentRequirementId" value={prefill.documentRequirementId} />
          )}
          {prefill?.driverId && <input type="hidden" name="driverId" value={prefill.driverId} />}
          {prefill?.vehicleId && <input type="hidden" name="vehicleId" value={prefill.vehicleId} />}
          {prefill?.marketSubmissionId && (
            <input type="hidden" name="marketSubmissionId" value={prefill.marketSubmissionId} />
          )}

          <div>
            <label className="field-label">Follow-Up For</label>
            <input
              name="forLabel"
              defaultValue={prefill?.forLabel ?? ""}
              required
              className="input mt-1"
              placeholder="Updated Loss Runs"
            />
          </div>

          <div>
            <label className="field-label">Action</label>
            <input
              name="action"
              defaultValue={prefill?.action ?? "Follow up with client"}
              required
              className="input mt-1"
            />
          </div>

          {contacts && contacts.length > 0 && (
            <div>
              <label className="field-label">Contact</label>
              <select name="contactId" defaultValue={prefill?.contactId ?? ""} className="input mt-1">
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="field-label">Date</label>
            <input
              type="date"
              name="dueDate"
              required
              defaultValue={toDateInputValue(addDays(new Date(), 3))}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="field-label">Optional Note</label>
            <textarea name="note" rows={2} className="input mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Scheduling..." : "Schedule"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
