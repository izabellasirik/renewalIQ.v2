"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";
import { addVehicle } from "@/app/actions/vehicles";

export function AddVehicleButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addVehicle(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Add Vehicle
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Vehicle" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Year</label>
              <input type="number" name="year" autoFocus className="input mt-1" placeholder="2022" />
            </div>
            <div>
              <label className="field-label">Make</label>
              <input name="make" className="input mt-1" placeholder="Freightliner" />
            </div>
            <div>
              <label className="field-label">Model</label>
              <input name="model" className="input mt-1" placeholder="Cascadia" />
            </div>
          </div>
          <div>
            <label className="field-label">VIN</label>
            <input name="vin" className="input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Vehicle Value ($)</label>
              <input type="number" name="value" min={0} className="input mt-1" placeholder="85000" />
            </div>
            <div>
              <label className="field-label">Value Note</label>
              <input name="valueNote" className="input mt-1" />
            </div>
          </div>
          <hr className="border-border" />
          <p className="field-label">Registration</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Registered Owner</label>
              <input name="registrationOwner" className="input mt-1" />
            </div>
            <div>
              <label className="field-label">Registration VIN</label>
              <input name="registrationVin" className="input mt-1" />
            </div>
          </div>
          <div>
            <label className="field-label">Registration Address</label>
            <input name="registrationAddress" className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Registration Expiration</label>
            <input type="date" name="registrationExpiration" className="input mt-1" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="registrationReceived" />
            Registration received
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? "Adding..." : "Add Vehicle"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
