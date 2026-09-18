import { createClient } from "@/app/actions/clients";
import { SubmitButton } from "@/components/SubmitButton";
import { CLIENT_STATUSES } from "@/lib/constants";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Add Client</h1>
      <p className="mt-1 text-muted">
        After creating the client you&apos;ll be able to add required documents right away.
      </p>

      <form action={createClient} className="surface-card mt-6 space-y-5 p-6">
        <div>
          <label className="field-label">Company Name *</label>
          <input name="companyName" required className="input mt-1" placeholder="ABC Trucking" />
        </div>

        <div>
          <label className="field-label">Primary Contact / Owner</label>
          <input name="primaryContactName" className="input mt-1" placeholder="John Smith" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Email</label>
            <input type="email" name="email" className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input type="tel" name="phone" className="input mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Renewal Date</label>
            <input type="date" name="renewalDate" className="input mt-1" />
          </div>
          <div>
            <label className="field-label">Policy Expiration Date</label>
            <input type="date" name="policyExpirationDate" className="input mt-1" />
          </div>
        </div>

        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue="Active" className="input mt-1">
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Optional Notes</label>
          <textarea name="notes" rows={3} className="input mt-1" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <SubmitButton pendingLabel="Creating...">Create Client</SubmitButton>
        </div>
      </form>
    </div>
  );
}
