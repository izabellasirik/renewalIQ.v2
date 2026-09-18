export const CLIENT_STATUSES = [
  "Action Required",
  "Waiting on Client",
  "Waiting for Quote",
  "On Track",
  "Completed",
] as const;

export const DOCUMENT_STATUSES = ["Missing", "Requested", "Received"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const VIOLATION_SEVERITIES = ["Minor", "Moderate", "Severe"] as const;
export type ViolationSeverity = (typeof VIOLATION_SEVERITIES)[number];

export const MARKET_STATUSES = [
  "Not Contacted",
  "Submitted",
  "Waiting",
  "More Info Needed",
  "Quote Received",
  "Declined",
  "Bound",
] as const;
export type MarketStatus = (typeof MARKET_STATUSES)[number];

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];
