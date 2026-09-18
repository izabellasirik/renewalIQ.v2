"use client";

import { useState } from "react";
import { Modal } from "./Modal";

const BROKER_NAME = "Roman";

export function DraftEmailButton({
  companyName,
  contactName,
  documentName,
}: {
  companyName: string;
  contactName: string | null;
  documentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const firstName = contactName?.split(" ")[0] ?? "there";
  const subject = `${documentName} — ${companyName}`;
  const body = `Hi ${firstName},\n\nFollowing up regarding the ${documentName.toLowerCase()} for ${companyName}. Please send them when available so we can continue working on the account.\n\nThank you,\n${BROKER_NAME}`;

  const [editedSubject, setEditedSubject] = useState(subject);
  const [editedBody, setEditedBody] = useState(body);

  function handleOpen() {
    setEditedSubject(subject);
    setEditedBody(body);
    setCopied(false);
    setOpen(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={handleOpen}>
        Draft Follow-Up
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Draft Follow-Up Email" wide>
        <div className="space-y-3">
          <div>
            <label className="field-label">Subject</label>
            <input
              className="input mt-1"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Message</label>
            <textarea
              className="input mt-1 font-sans"
              rows={9}
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            {copied && <span className="text-sm text-muted">Copied</span>}
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCopy}>
              Copy
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
