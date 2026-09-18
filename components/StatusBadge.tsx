type Tone = "good" | "warn" | "bad" | "neutral";

const toneClass: Record<Tone, string> = {
  good: "badge-good",
  warn: "badge-warn",
  bad: "badge-bad",
  neutral: "badge-neutral",
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`badge ${toneClass[tone]}`}>{label}</span>;
}

export function documentStatusTone(status: string): Tone {
  if (status === "Received") return "good";
  if (status === "Requested") return "warn";
  return "bad";
}

export function clientStatusTone(status: string): Tone {
  if (status === "Active") return "good";
  if (status === "Waiting on Client") return "warn";
  if (status === "Closed") return "neutral";
  return "neutral";
}

export function marketStatusTone(status: string): Tone {
  if (status === "Quote Received" || status === "Bound") return "good";
  if (status === "Waiting" || status === "More Info Needed") return "warn";
  return "neutral";
}
