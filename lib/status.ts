import {
  differenceInCalendarDays,
  isPast,
  isToday as dateFnsIsToday,
  isTomorrow,
  startOfDay,
} from "date-fns";
import type {
  Driver,
  File as PrismaFile,
  MedicalCert,
  Mvr,
  Vehicle,
  Violation,
} from "@prisma/client";

// Everything in this file is workflow / document-tracking status only.
// None of it is (or should ever become) a carrier eligibility or
// underwriting decision — it only tells the broker what to look at.

export const EXPIRING_SOON_DAYS = 30;
export const MVR_STALE_AFTER_DAYS = 30;
export const DEFAULT_REQUIRED_MVR_YEARS = 3;

export type DocStatus = "Current" | "Expiring Soon" | "Expired" | "Unknown";

export function expirationStatus(expirationDate: Date | null): DocStatus {
  if (!expirationDate) return "Unknown";
  const days = differenceInCalendarDays(startOfDay(expirationDate), startOfDay(new Date()));
  if (days < 0) return "Expired";
  if (days <= EXPIRING_SOON_DAYS) return "Expiring Soon";
  return "Current";
}

export function daysAgo(date: Date): number {
  return differenceInCalendarDays(startOfDay(new Date()), startOfDay(date));
}

type MvrWithViolations = Mvr & { violations: Violation[]; files: PrismaFile[] };
type MedicalCertWithFiles = MedicalCert & { files: PrismaFile[] };
type DriverWithRelations = Driver & {
  mvrs: MvrWithViolations[];
  medicalCerts: MedicalCertWithFiles[];
  files: PrismaFile[];
};

export type LicenseAssessment = {
  status: DocStatus;
  needsAttention: boolean;
  reasons: string[];
};

export function assessLicense(driver: Pick<Driver, "licenseExpirationDate" | "previousLicenseNeeded">): LicenseAssessment {
  const status = expirationStatus(driver.licenseExpirationDate);
  const reasons: string[] = [];
  if (status === "Expired") reasons.push("Driver's license expired");
  if (driver.previousLicenseNeeded) {
    reasons.push("Previous license/history may be required");
  }
  return { status, needsAttention: reasons.length > 0, reasons };
}

export type MvrAssessment = {
  latest: MvrWithViolations | null;
  ageDays: number | null;
  isStale: boolean;
  hasEnoughHistory: boolean | null;
  requiredYears: number;
  violationCounts: { minor: number; moderate: number; severe: number; total: number };
  needsAttention: boolean;
  reasons: string[];
};

export function assessMvr(
  mvrs: MvrWithViolations[],
  requiredHistoryYears: number | null | undefined
): MvrAssessment {
  const requiredYears = requiredHistoryYears ?? DEFAULT_REQUIRED_MVR_YEARS;
  const latest = mvrs[0] ?? null;
  const reasons: string[] = [];

  if (!latest) {
    return {
      latest: null,
      ageDays: null,
      isStale: true,
      hasEnoughHistory: null,
      requiredYears,
      violationCounts: { minor: 0, moderate: 0, severe: 0, total: 0 },
      needsAttention: true,
      reasons: ["MVR not yet on file"],
    };
  }

  const ageDays = daysAgo(latest.reportDate);
  const isStale = ageDays > MVR_STALE_AFTER_DAYS;
  const hasEnoughHistory =
    latest.historyYears != null ? latest.historyYears >= requiredYears : null;

  const violationCounts = latest.violations.reduce(
    (acc, v) => {
      acc.total += 1;
      if (v.severity === "Severe") acc.severe += 1;
      else if (v.severity === "Moderate") acc.moderate += 1;
      else acc.minor += 1;
      return acc;
    },
    { minor: 0, moderate: 0, severe: 0, total: 0 }
  );

  if (isStale) reasons.push("MVR may need updating");
  if (hasEnoughHistory === false) {
    reasons.push(`Less than ${requiredYears} years of history available`);
  }
  if (violationCounts.total > 0) {
    reasons.push("MVR contains violations requiring broker review");
  }

  return {
    latest,
    ageDays,
    isStale,
    hasEnoughHistory,
    requiredYears,
    violationCounts,
    needsAttention: isStale || hasEnoughHistory === false || violationCounts.total > 0,
    reasons,
  };
}

export type MedicalAssessment = {
  latest: MedicalCertWithFiles | null;
  status: DocStatus;
  needsAttention: boolean;
  reasons: string[];
};

export function assessMedical(certs: MedicalCertWithFiles[]): MedicalAssessment {
  const latest = certs[0] ?? null;
  if (!latest) {
    return { latest: null, status: "Unknown", needsAttention: true, reasons: ["Medical certificate not on file"] };
  }
  const status = expirationStatus(latest.expirationDate);
  const reasons: string[] = [];
  if (status === "Expired") reasons.push("Medical certification expired");
  if (status === "Expiring Soon") reasons.push("Medical certification expiring soon");
  return { status, latest, needsAttention: status === "Expired", reasons };
}

export type DriverAssessment = {
  license: LicenseAssessment;
  mvr: MvrAssessment;
  medical: MedicalAssessment;
  overall: "Complete" | "Needs Attention";
  reasons: string[];
};

export function assessDriver(driver: DriverWithRelations): DriverAssessment {
  const sortedMvrs = [...driver.mvrs].sort(
    (a, b) => b.reportDate.getTime() - a.reportDate.getTime()
  );
  const sortedCerts = [...driver.medicalCerts].sort((a, b) => {
    const ad = a.expirationDate?.getTime() ?? 0;
    const bd = b.expirationDate?.getTime() ?? 0;
    return bd - ad;
  });

  const license = assessLicense(driver);
  const mvr = assessMvr(sortedMvrs, driver.requiredHistoryYears);
  const medical = assessMedical(sortedCerts);

  const reasons = [...license.reasons, ...mvr.reasons, ...medical.reasons];
  const overall = reasons.length > 0 ? "Needs Attention" : "Complete";

  return { license, mvr, medical, overall, reasons };
}

export type VehicleAssessment = {
  vinMismatch: boolean;
  valueMissing: boolean;
  registrationMissing: boolean;
  overall: "Complete" | "Needs Attention";
  reasons: string[];
};

export function assessVehicle(vehicle: Vehicle): VehicleAssessment {
  const reasons: string[] = [];
  const vinMismatch = !!(
    vehicle.vin &&
    vehicle.registrationVin &&
    vehicle.vin.trim().toUpperCase() !== vehicle.registrationVin.trim().toUpperCase()
  );
  const valueMissing = vehicle.value == null;
  const registrationMissing = !vehicle.registrationReceived;

  if (vinMismatch) reasons.push("VIN does not match registration");
  if (valueMissing) reasons.push("Vehicle value missing");
  if (registrationMissing) reasons.push("Registration missing");

  return {
    vinMismatch,
    valueMissing,
    registrationMissing,
    overall: reasons.length > 0 ? "Needs Attention" : "Complete",
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Today's Plate grouping
// ---------------------------------------------------------------------------

export function isDueToday(dueDate: Date): boolean {
  return dateFnsIsToday(dueDate) || isPast(startOfDay(dueDate));
}

export function isTomorrowDate(dueDate: Date): boolean {
  return isTomorrow(dueDate);
}
