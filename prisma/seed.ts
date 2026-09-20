import { PrismaClient } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { seedDemoDocumentInsights } from "./demoDocumentInsights";

const prisma = new PrismaClient();

const today = new Date();
const d = (offset: number) => addDays(today, offset);
const ago = (offset: number) => subDays(today, offset);

// ---------------------------------------------------------------------------
// Thin convenience wrappers around Prisma — no new models or behavior, just
// less repetition across ~10 fictional demo clients.
// ---------------------------------------------------------------------------

function addClient(data: Parameters<typeof prisma.client.create>[0]["data"]) {
  return prisma.client.create({ data });
}

function addContact(clientId: string, data: { name: string; role?: string; email?: string; phone?: string }) {
  return prisma.contact.create({ data: { clientId, ...data } });
}

function addDoc(
  clientId: string,
  name: string,
  status: "Missing" | "Requested" | "Received",
  opts: { receivedAt?: Date; note?: string; createdAt?: Date } = {}
) {
  return prisma.documentRequirement.create({
    data: {
      clientId,
      name,
      status,
      receivedAt: status === "Received" ? opts.receivedAt ?? ago(5) : null,
      note: opts.note,
      createdAt: opts.createdAt ?? ago(14),
    },
  });
}

function addDriver(
  clientId: string,
  data: {
    name: string;
    licenseNumber?: string;
    licenseState?: string;
    licenseIssueDate?: Date | null;
    licenseExpirationDate?: Date | null;
    requiredHistoryYears?: number;
    previousLicenseNeeded?: boolean;
  }
) {
  return prisma.driver.create({ data: { clientId, requiredHistoryYears: 3, ...data } });
}

function addMvr(driverId: string, data: { reportDate: Date; historyYears?: number; notes?: string }) {
  return prisma.mvr.create({ data: { driverId, ...data } });
}

function addViolation(
  mvrId: string,
  data: { type: string; date?: Date; severity: "Minor" | "Moderate" | "Severe"; description?: string }
) {
  return prisma.violation.create({ data: { mvrId, ...data } });
}

function addMedicalCert(driverId: string, data: { issueDate?: Date; expirationDate?: Date; notes?: string }) {
  return prisma.medicalCert.create({ data: { driverId, ...data } });
}

function addVehicle(
  clientId: string,
  data: {
    year?: number;
    make?: string;
    model?: string;
    vin?: string;
    value?: number | null;
    valueRecordedAt?: Date | null;
    registrationOwner?: string;
    registrationVin?: string;
    registrationAddress?: string;
    registrationExpiration?: Date;
    registrationReceived?: boolean;
  }
) {
  return prisma.vehicle.create({ data: { clientId, registrationReceived: false, ...data } });
}

function addMarket(
  clientId: string,
  data: {
    carrierName: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    submittedDate?: Date;
    status: string;
    notes?: string;
    requestedInfo?: string;
    premium?: number;
    effectiveDate?: Date;
    expirationDate?: Date;
    createdAt?: Date;
  }
) {
  return prisma.marketSubmission.create({ data: { clientId, ...data } });
}

function addActivity(
  clientId: string,
  type: string,
  description: string,
  occurredAt: Date,
  opts: { note?: string; contactId?: string } = {}
) {
  return prisma.activity.create({
    data: { clientId, type, description, occurredAt, note: opts.note, contactId: opts.contactId },
  });
}

function addNote(clientId: string, content: string, createdAt: Date) {
  return prisma.note.create({ data: { clientId, content, createdAt } });
}

function addFollowUp(
  clientId: string,
  forLabel: string,
  action: string,
  dueDate: Date,
  opts: {
    documentRequirementId?: string;
    contactId?: string;
    driverId?: string;
    vehicleId?: string;
    marketSubmissionId?: string;
    note?: string;
    completed?: boolean;
    completedAt?: Date;
    createdAt?: Date;
  } = {}
) {
  return prisma.followUp.create({
    data: {
      clientId,
      forLabel,
      action,
      dueDate,
      note: opts.note,
      documentRequirementId: opts.documentRequirementId,
      contactId: opts.contactId,
      driverId: opts.driverId,
      vehicleId: opts.vehicleId,
      marketSubmissionId: opts.marketSubmissionId,
      completed: opts.completed ?? false,
      completedAt: opts.completedAt,
      createdAt: opts.createdAt ?? ago(2),
    },
  });
}

async function main() {
  // -------------------------------------------------------------------
  // Safety guard: this script is also the one-time way to populate the
  // production database. It must never silently wipe real data, and
  // running it twice must never create duplicate demo records. Default
  // behavior is "only populate an empty database." Local dev can still
  // force a full reset with FORCE_RESEED=true.
  // -------------------------------------------------------------------
  const existingClients = await prisma.client.count();
  if (existingClients > 0 && process.env.FORCE_RESEED !== "true") {
    console.log(
      `Database already has ${existingClients} client(s) — skipping seed so existing data isn't touched.`
    );
    console.log("To wipe and re-seed the demo dataset anyway, run: FORCE_RESEED=true npm run db:seed");
    return;
  }

  console.log("Clearing existing data...");
  await prisma.followUp.deleteMany();
  await prisma.marketSubmission.deleteMany();
  await prisma.violation.deleteMany();
  await prisma.mvr.deleteMany();
  await prisma.medicalCert.deleteMany();
  await prisma.file.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.documentRequirement.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.client.deleteMany();

  // =====================================================================
  // 1. ABC Trucking LLC — the flagship demo account. Covers the entire
  //    RenewalIQ workflow end to end: missing/requested/received
  //    documents, four drivers spanning every license/MVR/medical
  //    scenario, five vehicles spanning every vehicle flag, five markets
  //    across the pipeline, notes, and ~three weeks of activity history.
  // =====================================================================
  const abc = await addClient({
    companyName: "ABC Trucking LLC",
    primaryContactName: "John Smith",
    email: "john.smith@abctruckingllc.example.com",
    phone: "(612) 555-0148",
    renewalDate: d(27),
    policyExpirationDate: d(30),
    status: "Waiting on Client",
    createdAt: ago(23),
  });
  const abcJohn = await addContact(abc.id, {
    name: "John Smith",
    role: "Owner",
    email: "john.smith@abctruckingllc.example.com",
    phone: "(612) 555-0148",
  });

  // Documents
  const abcLossRuns = await addDoc(abc.id, "Loss Runs", "Requested", { createdAt: ago(10) });
  const abcSignedApp = await addDoc(abc.id, "Signed Application", "Missing", { createdAt: ago(10) });
  await addDoc(abc.id, "Current Policy", "Received", { receivedAt: ago(20), createdAt: ago(22) });
  await addDoc(abc.id, "Application", "Received", { receivedAt: ago(19), createdAt: ago(22) });
  await addDoc(abc.id, "Driver List", "Received", { receivedAt: ago(15), createdAt: ago(20) });
  await addDoc(abc.id, "Vehicle Schedule", "Received", { receivedAt: ago(15), createdAt: ago(20) });
  await addDoc(abc.id, "VIN List", "Received", { receivedAt: ago(9), createdAt: ago(20) });

  // Drivers — one of each canonical scenario
  const abcD1 = await addDriver(abc.id, {
    name: "John Smith",
    licenseNumber: "S123-4567-8901",
    licenseState: "MN",
    licenseIssueDate: ago(900),
    licenseExpirationDate: d(400),
  });
  await addMvr(abcD1.id, { reportDate: ago(10), historyYears: 4, notes: "Clean record overall." });
  await addMedicalCert(abcD1.id, { issueDate: ago(300), expirationDate: d(300) });

  const abcD2 = await addDriver(abc.id, {
    name: "Marcus Bell",
    licenseNumber: "B778-2210-4456",
    licenseState: "MN",
    licenseIssueDate: ago(1500),
    licenseExpirationDate: d(20),
  });
  await addMvr(abcD2.id, { reportDate: ago(46), historyYears: 3, notes: "No violations, but report is aging." });
  await addMedicalCert(abcD2.id, { issueDate: ago(200), expirationDate: d(165) });

  const abcD3 = await addDriver(abc.id, {
    name: "Derek Yang",
    licenseNumber: "Y440-9981-2237",
    licenseState: "WI",
    licenseIssueDate: ago(370),
    licenseExpirationDate: d(720),
    previousLicenseNeeded: true,
  });
  await addMvr(abcD3.id, { reportDate: ago(8), historyYears: 1 });
  await addMedicalCert(abcD3.id, { issueDate: ago(100), expirationDate: d(260) });

  const abcD4 = await addDriver(abc.id, {
    name: "Priya Chandra",
    licenseNumber: "C990-1123-7789",
    licenseState: "MN",
    licenseIssueDate: ago(2000),
    licenseExpirationDate: d(500),
  });
  await addMvr(abcD4.id, { reportDate: ago(12), historyYears: 5, notes: "No violations." });
  await addMedicalCert(abcD4.id, { issueDate: ago(500), expirationDate: ago(5) });

  // Vehicles — one of each canonical scenario
  await addVehicle(abc.id, {
    year: 2022,
    make: "Freightliner",
    model: "Cascadia",
    vin: "1FUJGHDV8NLAA1234",
    value: 85000,
    valueRecordedAt: ago(20),
    registrationOwner: "ABC Trucking LLC",
    registrationVin: "1FUJGHDV8NLAA1234",
    registrationAddress: "4400 Freight Way, Minneapolis, MN",
    registrationExpiration: d(200),
    registrationReceived: true,
  });
  await addVehicle(abc.id, {
    year: 2021,
    make: "Volvo",
    model: "VNL",
    vin: "4V4NC9EH5MN123456",
    value: 78000,
    valueRecordedAt: ago(20),
    registrationOwner: "ABC Trucking LLC",
    registrationVin: "4V4NC9EH5MN654321",
    registrationAddress: "4400 Freight Way, Minneapolis, MN",
    registrationExpiration: d(180),
    registrationReceived: true,
  });
  await addVehicle(abc.id, {
    year: 2020,
    make: "Kenworth",
    model: "T680",
    vin: "1XKYD49X1LJ778899",
    registrationOwner: "ABC Trucking LLC",
    registrationVin: "1XKYD49X1LJ778899",
    registrationAddress: "4400 Freight Way, Minneapolis, MN",
    registrationExpiration: d(90),
    registrationReceived: true,
  });
  const abcV4 = await addVehicle(abc.id, {
    year: 2019,
    make: "Peterbilt",
    model: "579",
    vin: "1XPBD49X0KD112233",
    value: 61000,
    valueRecordedAt: ago(20),
    registrationReceived: false,
  });
  await addVehicle(abc.id, {
    year: 2023,
    make: "Mack",
    model: "Anthem",
    vin: "1M1AN07Y7PM998877",
    value: 99000,
    valueRecordedAt: ago(6),
    registrationOwner: "ABC Trucking LLC",
    registrationVin: "1M1AN07Y7PM998877",
    registrationAddress: "4400 Freight Way, Minneapolis, MN",
    registrationExpiration: d(300),
    registrationReceived: true,
  });

  // Documents tab AI-analysis experiment — a few clearly-labeled demo
  // documents/insights so the feature is visible with zero configuration.
  await seedDemoDocumentInsights(prisma, abc.id, [
    "1FUJGHDV8NLAA1234",
    "4V4NC9EH5MN123456",
    "1XKYD49X1LJ778899",
    "1XPBD49X0KD112233",
    "1M1AN07Y7PM998877",
  ]);

  // Markets — full pipeline spread
  const abcProgressive = await addMarket(abc.id, {
    carrierName: "Progressive",
    contactName: "Sarah Miller",
    contactEmail: "sarah.miller@progressive.example.com",
    contactPhone: "(800) 555-0142",
    submittedDate: ago(3),
    status: "Waiting",
    notes: "Waiting for updated MVR before underwriting can continue.",
    createdAt: ago(6),
  });
  const abcTravelers = await addMarket(abc.id, {
    carrierName: "Travelers",
    contactName: "Mark Ito",
    contactEmail: "mark.ito@travelers.example.com",
    submittedDate: ago(5),
    status: "More Info Needed",
    requestedInfo: "Updated MVR for Marcus Bell\nCurrent registration for the 2021 Volvo VNL",
    createdAt: ago(8),
  });
  await addMarket(abc.id, {
    carrierName: "IAT",
    contactName: "Priya Nair",
    contactEmail: "priya.nair@iat.example.com",
    submittedDate: ago(12),
    status: "Quote Received",
    premium: 42500,
    effectiveDate: d(13),
    expirationDate: d(378),
    notes: "Competitive premium — worth presenting to the client alongside Progressive.",
    createdAt: ago(14),
  });
  await addMarket(abc.id, {
    carrierName: "Liberty Mutual",
    contactName: "Dan Reyes",
    submittedDate: ago(15),
    status: "Declined",
    notes: "Declined due to loss history.",
    createdAt: ago(16),
  });
  await addMarket(abc.id, {
    carrierName: "Nationwide",
    contactName: "Grace Feldman",
    contactEmail: "grace.feldman@nationwide.example.com",
    submittedDate: ago(2),
    status: "Submitted",
    createdAt: ago(2),
  });

  // Notes
  await addNote(abc.id, "Client said updated MVR should arrive Friday.", ago(2));
  await addNote(abc.id, "Underwriter at Travelers asked for clarification on vehicle radius of operation.", ago(4));
  await addNote(abc.id, "Owner prefers communication by email over phone.", ago(9));
  await addNote(abc.id, "Client added two trucks this month — fleet now at 5 power units.", ago(6));

  // Follow-ups
  await addFollowUp(abc.id, "Loss Runs", "Follow up with John regarding loss runs.", d(0), {
    documentRequirementId: abcLossRuns.id,
    contactId: abcJohn.id,
    note: "John said documents should arrive Friday.",
    createdAt: ago(3),
  });
  await addFollowUp(abc.id, "Follow up with Progressive", "Follow up with Sarah Miller regarding Progressive quote.", d(0), {
    marketSubmissionId: abcProgressive.id,
    createdAt: ago(1),
  });
  await addFollowUp(
    abc.id,
    "Previous License Needed — Derek Yang",
    "Follow up with client for previous driver's license.",
    ago(2),
    { driverId: abcD3.id, createdAt: ago(5) }
  );
  await addFollowUp(abc.id, "Send missing information to Travelers", "Send missing information to Travelers.", d(1), {
    marketSubmissionId: abcTravelers.id,
    createdAt: ago(1),
  });
  await addFollowUp(
    abc.id,
    "Vehicle Value Missing — 2019 Peterbilt 579",
    "Follow up with client regarding vehicle value missing.",
    d(4),
    { vehicleId: abcV4.id, createdAt: ago(1) }
  );
  await addFollowUp(abc.id, "Signed Application", "Follow up regarding signed application.", d(6), {
    documentRequirementId: abcSignedApp.id,
    createdAt: ago(1),
  });
  await addFollowUp(abc.id, "Driver List", "Confirm updated driver list was received.", d(0), {
    completed: true,
    completedAt: d(0),
    createdAt: ago(4),
  });
  await addFollowUp(abc.id, "Application", "Follow up to confirm signed application status.", ago(9), {
    completed: true,
    completedAt: ago(9),
    createdAt: ago(11),
  });

  // Activity log — roughly three weeks of history
  await addActivity(abc.id, "Client Created", "Client created.", ago(23));
  await addActivity(abc.id, "Document Received", "Current Policy uploaded.", ago(20));
  await addActivity(abc.id, "Document Received", "Application uploaded.", ago(19));
  await addActivity(abc.id, "Driver Added", "Driver added — John Smith.", ago(19));
  await addActivity(abc.id, "Driver Added", "Driver added — Marcus Bell.", ago(19));
  await addActivity(abc.id, "Driver Added", "Driver added — Derek Yang.", ago(19));
  await addActivity(abc.id, "Driver Added", "Driver added — Priya Chandra.", ago(19));
  await addActivity(abc.id, "Vehicle Added", "Vehicle added — 2022 Freightliner Cascadia.", ago(19));
  await addActivity(abc.id, "Vehicle Added", "Vehicle added — 2021 Volvo VNL.", ago(19));
  await addActivity(abc.id, "Vehicle Added", "Vehicle added — 2020 Kenworth T680.", ago(19));
  await addActivity(abc.id, "Vehicle Added", "Vehicle added — 2019 Peterbilt 579.", ago(19));
  await addActivity(abc.id, "Document Received", "Driver List uploaded.", ago(15));
  await addActivity(abc.id, "Document Received", "Vehicle Schedule uploaded.", ago(15));
  await addActivity(abc.id, "Market Added", "IAT added as market.", ago(14));
  await addActivity(abc.id, "Market Added", "Liberty Mutual added as market.", ago(16));
  await addActivity(abc.id, "Market Status Changed", "Liberty Mutual declined.", ago(15));
  await addActivity(abc.id, "Market Added", "Travelers added as market.", ago(8));
  await addActivity(abc.id, "Market Added", "Progressive added as market.", ago(6));
  await addActivity(abc.id, "Document Requested", "Loss Runs requested from client.", ago(10));
  await addActivity(abc.id, "Market Status Changed", "Submission sent to Progressive.", ago(3));
  await addActivity(abc.id, "Vehicle Added", "Vehicle added — 2023 Mack Anthem.", ago(6));
  await addActivity(abc.id, "Document Received", "VIN List uploaded.", ago(9));
  await addActivity(abc.id, "Medical Cert Uploaded", "Medical certificate uploaded — Priya Chandra.", ago(500));
  await addActivity(abc.id, "Market Status Changed", "Travelers requested more information.", ago(2));
  await addActivity(abc.id, "Quote Received", "Quote received from IAT.", ago(4));
  await addActivity(abc.id, "Follow-Up", "Follow-up completed", ago(9), {
    note: "Confirmed signed application was still pending — re-requested from client.",
  });
  await addActivity(abc.id, "Market Status Changed", "Submission sent to Nationwide.", ago(2));
  await addActivity(abc.id, "Follow-Up", "Follow-up scheduled — Loss Runs — " + formatShort(d(0)), ago(3));
  await addActivity(abc.id, "Follow-Up", `Follow-up scheduled with Progressive for ${formatShort(d(0))}.`, ago(1));
  await addActivity(abc.id, "Follow-Up", `Follow-up scheduled with Travelers for ${formatShort(d(1))}.`, ago(1));

  // =====================================================================
  // 2. Metro Freight Solutions — carrier quote awaiting review, one
  //    driver with a flagged MVR (multiple violations of varying severity)
  // =====================================================================
  const metro = await addClient({
    companyName: "Metro Freight Solutions",
    primaryContactName: "Dana Whitcombe",
    email: "dana.whitcombe@metrofreightsolutions.example.com",
    phone: "(414) 555-0177",
    renewalDate: d(40),
    policyExpirationDate: d(43),
    status: "On Track",
    createdAt: ago(30),
  });
  await addContact(metro.id, {
    name: "Dana Whitcombe",
    role: "Fleet Manager",
    email: "dana.whitcombe@metrofreightsolutions.example.com",
    phone: "(414) 555-0177",
  });
  const metroDriverList = await addDoc(metro.id, "Driver List", "Requested", { createdAt: ago(6) });
  await addDoc(metro.id, "Current Policy", "Received", { receivedAt: ago(28), createdAt: ago(30) });
  await addDoc(metro.id, "Loss Runs", "Received", { receivedAt: ago(25), createdAt: ago(30) });
  await addDoc(metro.id, "Application", "Received", { receivedAt: ago(24), createdAt: ago(30) });

  const metroClean = await addDriver(metro.id, {
    name: "Renata Osei",
    licenseNumber: "O221-8834-0091",
    licenseState: "WI",
    licenseIssueDate: ago(1800),
    licenseExpirationDate: d(600),
  });
  await addMvr(metroClean.id, { reportDate: ago(9), historyYears: 5 });
  await addMedicalCert(metroClean.id, { issueDate: ago(150), expirationDate: d(400) });

  const metroCarl = await addDriver(metro.id, {
    name: "Carl Odom",
    licenseNumber: "O554-2298-1147",
    licenseState: "WI",
    licenseIssueDate: ago(2200),
    licenseExpirationDate: d(500),
  });
  const metroCarlMvr = await addMvr(metroCarl.id, { reportDate: ago(11), historyYears: 6 });
  await addViolation(metroCarlMvr.id, { type: "Speeding", date: ago(200), severity: "Minor" });
  await addViolation(metroCarlMvr.id, {
    type: "Following Too Closely",
    date: ago(120),
    severity: "Moderate",
  });
  await addViolation(metroCarlMvr.id, {
    type: "Reckless Driving",
    date: ago(45),
    severity: "Severe",
    description: "Cited after a following-distance incident reported by another motorist.",
  });
  await addMedicalCert(metroCarl.id, { issueDate: ago(100), expirationDate: d(265) });

  await addVehicle(metro.id, {
    year: 2022,
    make: "International",
    model: "LT",
    vin: "3HSDJAPR9NN445566",
    value: 88000,
    valueRecordedAt: ago(30),
    registrationOwner: "Metro Freight Solutions",
    registrationVin: "3HSDJAPR9NN445566",
    registrationAddress: "220 Dockside Ave, Milwaukee, WI",
    registrationExpiration: d(250),
    registrationReceived: true,
  });
  await addVehicle(metro.id, {
    year: 2020,
    make: "Freightliner",
    model: "Cascadia",
    vin: "1FUJGLDR2LLAA7788",
    value: 69000,
    valueRecordedAt: ago(30),
    registrationReceived: false,
  });

  const metroIat = await addMarket(metro.id, {
    carrierName: "IAT",
    contactName: "Ben Ochoa",
    contactEmail: "ben.ochoa@iat.example.com",
    submittedDate: ago(9),
    status: "Quote Received",
    premium: 51000,
    effectiveDate: d(10),
    expirationDate: d(375),
    createdAt: ago(11),
  });
  await addMarket(metro.id, { carrierName: "Great West Casualty", status: "Not Contacted", createdAt: ago(4) });

  await addNote(metro.id, "Owner prefers communication by email.", ago(7));

  await addFollowUp(metro.id, "Review quote from IAT", "Review quote received from IAT with client.", d(0), {
    marketSubmissionId: metroIat.id,
    createdAt: ago(2),
  });
  await addFollowUp(metro.id, "Driver List", "Follow up on updated driver list request.", d(2), {
    documentRequirementId: metroDriverList.id,
    createdAt: ago(2),
  });
  await addFollowUp(metro.id, "Loss Runs", "Confirm loss runs were received in good order.", ago(20), {
    completed: true,
    completedAt: ago(20),
    createdAt: ago(23),
  });
  await addFollowUp(metro.id, "Quote Review", "Confirm client reviewed the IAT quote.", d(0), {
    completed: true,
    completedAt: d(0),
    createdAt: ago(1),
  });

  await addActivity(metro.id, "Client Created", "Client created.", ago(30));
  await addActivity(metro.id, "Document Received", "Current Policy uploaded.", ago(28));
  await addActivity(metro.id, "Driver Added", "Driver added — Renata Osei.", ago(27));
  await addActivity(metro.id, "Driver Added", "Driver added — Carl Odom.", ago(27));
  await addActivity(metro.id, "Vehicle Added", "Vehicle added — 2022 International LT.", ago(27));
  await addActivity(metro.id, "Vehicle Added", "Vehicle added — 2020 Freightliner Cascadia.", ago(27));
  await addActivity(metro.id, "Document Received", "Loss Runs uploaded.", ago(25));
  await addActivity(metro.id, "Market Added", "IAT added as market.", ago(11));
  await addActivity(metro.id, "Market Status Changed", "Submission sent to IAT.", ago(9));
  await addActivity(metro.id, "Other", "Violation added — Reckless Driving (Severe).", ago(45));
  await addActivity(metro.id, "Quote Received", "Quote received from IAT.", ago(1));
  await addActivity(metro.id, "Document Requested", "Driver List requested from client.", ago(6));
  await addActivity(metro.id, "Market Added", "Great West Casualty added as market.", ago(4));

  // =====================================================================
  // 3. Hudson Logistics Inc. — waiting on client, many missing items,
  //    stale documents, expired vehicle registration.
  // =====================================================================
  const hudson = await addClient({
    companyName: "Hudson Logistics Inc.",
    primaryContactName: "Renee Ostrander",
    email: "renee.ostrander@hudsonlogistics.example.com",
    phone: "(201) 555-0193",
    renewalDate: d(18),
    policyExpirationDate: d(21),
    status: "Waiting on Client",
    createdAt: ago(60),
  });
  const hudsonContact = await addContact(hudson.id, {
    name: "Renee Ostrander",
    role: "Office Manager",
    email: "renee.ostrander@hudsonlogistics.example.com",
    phone: "(201) 555-0193",
  });
  const hudsonLossRuns = await addDoc(hudson.id, "Loss Runs", "Missing", { createdAt: ago(15) });
  await addDoc(hudson.id, "Application", "Missing", { createdAt: ago(15) });
  await addDoc(hudson.id, "Vehicle Schedule", "Missing", { createdAt: ago(15) });
  await addDoc(hudson.id, "Current Policy", "Received", { receivedAt: ago(58), createdAt: ago(60) });

  const hudsonDriver = await addDriver(hudson.id, {
    name: "Walter Ng",
    licenseNumber: "N221-7789-3345",
    licenseState: "NJ",
    licenseIssueDate: ago(1600),
    licenseExpirationDate: d(450),
  });
  await addMvr(hudsonDriver.id, { reportDate: ago(52), historyYears: 4, notes: "Report is stale, needs refresh." });
  await addMedicalCert(hudsonDriver.id, { issueDate: ago(200), expirationDate: d(165) });

  const hudsonV1 = await addVehicle(hudson.id, {
    year: 2018,
    make: "Volvo",
    model: "VNL",
    vin: "4V4NC9EJ8JN556677",
    value: 52000,
    valueRecordedAt: ago(60),
    registrationOwner: "Hudson Logistics Inc.",
    registrationVin: "4V4NC9EJ8JN556677",
    registrationAddress: "88 Harbor Loop, Newark, NJ",
    registrationExpiration: ago(15),
    registrationReceived: true,
  });
  await addVehicle(hudson.id, {
    year: 2021,
    make: "Freightliner",
    model: "Cascadia",
    vin: "1FUJGHDV3MLBB9911",
    value: 76000,
    valueRecordedAt: ago(60),
    registrationOwner: "Hudson Logistics Inc.",
    registrationVin: "1FUJGHDV3MLBB9911",
    registrationAddress: "88 Harbor Loop, Newark, NJ",
    registrationExpiration: d(220),
    registrationReceived: true,
  });

  await addMarket(hudson.id, { carrierName: "Sentinel Insurance", status: "Not Contacted", createdAt: ago(5) });

  await addNote(hudson.id, "Waiting for accountant to send loss runs.", ago(4));

  await addFollowUp(hudson.id, "Vehicle Registration", "Confirm renewed registration for the 2018 Volvo VNL.", d(0), {
    vehicleId: hudsonV1.id,
    createdAt: ago(2),
  });
  await addFollowUp(hudson.id, "Loss Runs", "Follow up with Renee — loss runs still missing.", ago(1), {
    documentRequirementId: hudsonLossRuns.id,
    contactId: hudsonContact.id,
    createdAt: ago(6),
  });

  await addActivity(hudson.id, "Client Created", "Client created.", ago(60));
  await addActivity(hudson.id, "Document Received", "Current Policy uploaded.", ago(58));
  await addActivity(hudson.id, "Driver Added", "Driver added — Walter Ng.", ago(55));
  await addActivity(hudson.id, "Vehicle Added", "Vehicle added — 2018 Volvo VNL.", ago(55));
  await addActivity(hudson.id, "Vehicle Added", "Vehicle added — 2021 Freightliner Cascadia.", ago(55));
  await addActivity(hudson.id, "Document Requested", "Loss Runs requested from client.", ago(15));
  await addActivity(hudson.id, "Document Requested", "Application requested from client.", ago(15));
  await addActivity(hudson.id, "Phone Call", "Called Renee regarding outstanding loss runs.", ago(6), {
    contactId: hudsonContact.id,
  });
  await addActivity(hudson.id, "Market Added", "Sentinel Insurance added as market.", ago(5));

  // =====================================================================
  // 4. BlueLine Transport LLC — healthy, nearly complete account with a
  //    bound market (won business).
  // =====================================================================
  const blueline = await addClient({
    companyName: "BlueLine Transport LLC",
    primaryContactName: "Marcus Doyle",
    email: "marcus.doyle@bluelinetransport.example.com",
    phone: "(312) 555-0166",
    renewalDate: d(75),
    policyExpirationDate: d(78),
    status: "Completed",
    createdAt: ago(90),
  });
  await addContact(blueline.id, {
    name: "Marcus Doyle",
    role: "Owner",
    email: "marcus.doyle@bluelinetransport.example.com",
    phone: "(312) 555-0166",
  });
  await addDoc(blueline.id, "Current Policy", "Received", { receivedAt: ago(85), createdAt: ago(90) });
  await addDoc(blueline.id, "Loss Runs", "Received", { receivedAt: ago(80), createdAt: ago(90) });
  await addDoc(blueline.id, "Application", "Received", { receivedAt: ago(78), createdAt: ago(90) });
  await addDoc(blueline.id, "Driver List", "Received", { receivedAt: ago(78), createdAt: ago(90) });

  const bluelineD1 = await addDriver(blueline.id, {
    name: "Marcus Doyle",
    licenseNumber: "D110-4432-8871",
    licenseState: "IL",
    licenseIssueDate: ago(2500),
    licenseExpirationDate: d(700),
  });
  await addMvr(bluelineD1.id, { reportDate: ago(15), historyYears: 7 });
  await addMedicalCert(bluelineD1.id, { issueDate: ago(120), expirationDate: d(430) });

  const bluelineD2 = await addDriver(blueline.id, {
    name: "Ivan Petrov",
    licenseNumber: "P667-1123-9042",
    licenseState: "IL",
    licenseIssueDate: ago(1900),
    licenseExpirationDate: d(560),
  });
  await addMvr(bluelineD2.id, { reportDate: ago(6), historyYears: 5 });
  await addMedicalCert(bluelineD2.id, { issueDate: ago(90), expirationDate: d(440) });

  await addVehicle(blueline.id, {
    year: 2023,
    make: "Kenworth",
    model: "T680",
    vin: "1XKYD49X6PJ221144",
    value: 101000,
    valueRecordedAt: ago(90),
    registrationOwner: "BlueLine Transport LLC",
    registrationVin: "1XKYD49X6PJ221144",
    registrationAddress: "900 Lakeshore Dr, Chicago, IL",
    registrationExpiration: d(310),
    registrationReceived: true,
  });
  await addVehicle(blueline.id, {
    year: 2022,
    make: "Peterbilt",
    model: "579",
    vin: "1XPBD49X2ND667788",
    value: 93000,
    valueRecordedAt: ago(90),
    registrationOwner: "BlueLine Transport LLC",
    registrationVin: "1XPBD49X2ND667788",
    registrationAddress: "900 Lakeshore Dr, Chicago, IL",
    registrationExpiration: d(300),
    registrationReceived: true,
  });

  await addMarket(blueline.id, {
    carrierName: "Sentry Insurance",
    contactName: "Alicia Fenn",
    contactEmail: "alicia.fenn@sentry.example.com",
    submittedDate: ago(35),
    status: "Bound",
    premium: 46200,
    effectiveDate: d(5),
    expirationDate: d(370),
    createdAt: ago(38),
  });

  await addNote(blueline.id, "Client added two trucks this month — fleet growing steadily.", ago(10));

  await addFollowUp(blueline.id, "Routine Check-In", "Quick check-in ahead of renewal season.", d(10), {
    createdAt: ago(2),
  });
  await addFollowUp(blueline.id, "Bound Confirmation", "Confirm bound policy documents were sent to client.", d(0), {
    completed: true,
    completedAt: d(0),
    createdAt: ago(1),
  });

  await addActivity(blueline.id, "Client Created", "Client created.", ago(90));
  await addActivity(blueline.id, "Document Received", "Current Policy uploaded.", ago(85));
  await addActivity(blueline.id, "Driver Added", "Driver added — Marcus Doyle.", ago(84));
  await addActivity(blueline.id, "Driver Added", "Driver added — Ivan Petrov.", ago(84));
  await addActivity(blueline.id, "Vehicle Added", "Vehicle added — 2023 Kenworth T680.", ago(84));
  await addActivity(blueline.id, "Vehicle Added", "Vehicle added — 2022 Peterbilt 579.", ago(84));
  await addActivity(blueline.id, "Market Added", "Sentry Insurance added as market.", ago(38));
  await addActivity(blueline.id, "Market Status Changed", "Submission sent to Sentry Insurance.", ago(35));
  await addActivity(blueline.id, "Quote Received", "Quote received from Sentry Insurance.", ago(20));
  await addActivity(blueline.id, "Market Status Changed", "Sentry Insurance marked Bound.", ago(12));

  // =====================================================================
  // 5. Empire Cargo Group — waiting on client, upcoming follow-up on a
  //    missing application.
  // =====================================================================
  const empire = await addClient({
    companyName: "Empire Cargo Group",
    primaryContactName: "Talia Fitzgerald",
    email: "talia.fitzgerald@empirecargogroup.example.com",
    phone: "(917) 555-0122",
    renewalDate: d(33),
    policyExpirationDate: d(36),
    status: "Waiting on Client",
    createdAt: ago(19),
  });
  await addContact(empire.id, {
    name: "Talia Fitzgerald",
    role: "Owner",
    email: "talia.fitzgerald@empirecargogroup.example.com",
    phone: "(917) 555-0122",
  });
  const empireApp = await addDoc(empire.id, "Application", "Missing", { createdAt: ago(6) });
  await addDoc(empire.id, "Loss Runs", "Requested", { createdAt: ago(6) });
  await addDoc(empire.id, "Current Policy", "Received", { receivedAt: ago(17), createdAt: ago(19) });

  const empireD1 = await addDriver(empire.id, {
    name: "Bianca Suarez",
    licenseNumber: "S225-6612-0087",
    licenseState: "NY",
    licenseIssueDate: ago(1200),
    licenseExpirationDate: d(600),
  });
  await addMvr(empireD1.id, { reportDate: ago(14), historyYears: 4 });
  await addMedicalCert(empireD1.id, { issueDate: ago(150), expirationDate: d(215) });

  await addVehicle(empire.id, {
    year: 2021,
    make: "International",
    model: "LT",
    vin: "3HSDJAPR3MN889900",
    registrationOwner: "Empire Cargo Group",
    registrationVin: "3HSDJAPR3MN889900",
    registrationAddress: "77 Pier Ave, Queens, NY",
    registrationExpiration: d(140),
    registrationReceived: true,
  });

  await addMarket(empire.id, {
    carrierName: "National Interstate",
    contactName: "Owen Marsh",
    contactEmail: "owen.marsh@nationalinterstate.example.com",
    submittedDate: ago(4),
    status: "Submitted",
    createdAt: ago(4),
  });

  await addFollowUp(empire.id, "Application", "Follow up with client for missing application.", d(3), {
    documentRequirementId: empireApp.id,
    createdAt: ago(2),
  });

  await addActivity(empire.id, "Client Created", "Client created.", ago(19));
  await addActivity(empire.id, "Document Received", "Current Policy uploaded.", ago(17));
  await addActivity(empire.id, "Driver Added", "Driver added — Bianca Suarez.", ago(16));
  await addActivity(empire.id, "Vehicle Added", "Vehicle added — 2021 International LT.", ago(16));
  await addActivity(empire.id, "Document Requested", "Loss Runs requested from client.", ago(6));
  await addActivity(empire.id, "Market Added", "National Interstate added as market.", ago(4));
  await addActivity(empire.id, "Market Status Changed", "Submission sent to National Interstate.", ago(4));

  // =====================================================================
  // 6. Northeast Hauling LLC — vehicle-flag-focused account (VIN mismatch
  //    + missing value), market waiting.
  // =====================================================================
  const northeast = await addClient({
    companyName: "Northeast Hauling LLC",
    primaryContactName: "Colin Brannigan",
    email: "colin.brannigan@northeasthauling.example.com",
    phone: "(617) 555-0110",
    renewalDate: d(22),
    policyExpirationDate: d(25),
    status: "Action Required",
    createdAt: ago(35),
  });
  await addContact(northeast.id, {
    name: "Colin Brannigan",
    role: "Operations Manager",
    email: "colin.brannigan@northeasthauling.example.com",
    phone: "(617) 555-0110",
  });
  await addDoc(northeast.id, "Current Policy", "Received", { receivedAt: ago(33), createdAt: ago(35) });
  await addDoc(northeast.id, "Application", "Received", { receivedAt: ago(30), createdAt: ago(35) });

  const northeastDriver = await addDriver(northeast.id, {
    name: "Faith Okonkwo",
    licenseNumber: "O112-7734-4498",
    licenseState: "MA",
    licenseIssueDate: ago(2100),
    licenseExpirationDate: d(650),
  });
  await addMvr(northeastDriver.id, { reportDate: ago(7), historyYears: 6 });
  await addMedicalCert(northeastDriver.id, { issueDate: ago(80), expirationDate: d(450) });

  const northeastV1 = await addVehicle(northeast.id, {
    year: 2019,
    make: "International",
    model: "LT",
    vin: "3HSDJAPR9KN112233",
    value: 62000,
    valueRecordedAt: ago(35),
    registrationOwner: "Northeast Hauling LLC",
    registrationVin: "3HSDJAPR9KN112200",
    registrationAddress: "12 Bayview St, Boston, MA",
    registrationExpiration: d(120),
    registrationReceived: true,
  });
  await addVehicle(northeast.id, {
    year: 2020,
    make: "Volvo",
    model: "VNL",
    vin: "4V4NC9EH1LN334455",
    registrationOwner: "Northeast Hauling LLC",
    registrationVin: "4V4NC9EH1LN334455",
    registrationAddress: "12 Bayview St, Boston, MA",
    registrationExpiration: d(160),
    registrationReceived: true,
  });

  const northeastMarket = await addMarket(northeast.id, {
    carrierName: "Canal Insurance",
    contactName: "Priscilla Wong",
    contactEmail: "priscilla.wong@canal.example.com",
    submittedDate: ago(6),
    status: "Waiting",
    createdAt: ago(7),
  });

  await addNote(northeast.id, "Client confirmed all trucks are garaged at the same address.", ago(8));

  await addFollowUp(
    northeast.id,
    "VIN Mismatch — 2019 International LT",
    "Confirm correct VIN with client and request updated registration.",
    d(0),
    { vehicleId: northeastV1.id, createdAt: ago(1) }
  );
  await addFollowUp(northeast.id, "Follow up with Canal Insurance", "Follow up with Priscilla Wong regarding Canal Insurance quote.", d(5), {
    marketSubmissionId: northeastMarket.id,
    createdAt: ago(1),
  });

  await addActivity(northeast.id, "Client Created", "Client created.", ago(35));
  await addActivity(northeast.id, "Document Received", "Current Policy uploaded.", ago(33));
  await addActivity(northeast.id, "Driver Added", "Driver added — Faith Okonkwo.", ago(32));
  await addActivity(northeast.id, "Vehicle Added", "Vehicle added — 2019 International LT.", ago(32));
  await addActivity(northeast.id, "Vehicle Added", "Vehicle added — 2020 Volvo VNL.", ago(32));
  await addActivity(northeast.id, "Market Added", "Canal Insurance added as market.", ago(7));
  await addActivity(northeast.id, "Market Status Changed", "Submission sent to Canal Insurance.", ago(6));

  // =====================================================================
  // 7. Atlantic Freight Services — driver-flag-focused account (expired
  //    license + expired medical), waiting on client.
  // =====================================================================
  const atlantic = await addClient({
    companyName: "Atlantic Freight Services",
    primaryContactName: "Naomi Castellano",
    email: "naomi.castellano@atlanticfreightservices.example.com",
    phone: "(757) 555-0135",
    renewalDate: d(16),
    policyExpirationDate: d(19),
    status: "Action Required",
    createdAt: ago(28),
  });
  await addContact(atlantic.id, {
    name: "Naomi Castellano",
    role: "Owner",
    email: "naomi.castellano@atlanticfreightservices.example.com",
    phone: "(757) 555-0135",
  });
  const atlanticDriverList = await addDoc(atlantic.id, "Driver List", "Requested", { createdAt: ago(7) });
  await addDoc(atlantic.id, "Current Policy", "Received", { receivedAt: ago(26), createdAt: ago(28) });
  await addDoc(atlantic.id, "Loss Runs", "Received", { receivedAt: ago(24), createdAt: ago(28) });

  const atlanticD1 = await addDriver(atlantic.id, {
    name: "Wayne Kessler",
    licenseNumber: "K330-7712-9954",
    licenseState: "VA",
    licenseIssueDate: ago(2400),
    licenseExpirationDate: ago(10),
  });
  await addMvr(atlanticD1.id, { reportDate: ago(18), historyYears: 6 });
  await addMedicalCert(atlanticD1.id, { issueDate: ago(600), expirationDate: ago(20) });

  const atlanticD2 = await addDriver(atlantic.id, {
    name: "Grace Holloway",
    licenseNumber: "H441-2298-6631",
    licenseState: "VA",
    licenseIssueDate: ago(1400),
    licenseExpirationDate: d(35),
  });
  await addMvr(atlanticD2.id, { reportDate: ago(40), historyYears: 4 });
  await addMedicalCert(atlanticD2.id, { issueDate: ago(90), expirationDate: d(380) });

  await addVehicle(atlantic.id, {
    year: 2022,
    make: "Freightliner",
    model: "Cascadia",
    vin: "1FUJGHDV1NLCC5566",
    value: 87000,
    valueRecordedAt: ago(28),
    registrationOwner: "Atlantic Freight Services",
    registrationVin: "1FUJGHDV1NLCC5566",
    registrationAddress: "500 Tidewater Blvd, Norfolk, VA",
    registrationExpiration: d(230),
    registrationReceived: true,
  });

  await addMarket(atlantic.id, { carrierName: "Zurich North America", status: "Not Contacted", createdAt: ago(3) });

  await addFollowUp(
    atlantic.id,
    "Driver: Wayne Kessler",
    "Follow up with client regarding expired medical certification.",
    d(0),
    { driverId: atlanticD1.id, createdAt: ago(2) }
  );
  await addFollowUp(atlantic.id, "Driver List", "Follow up on updated driver list request.", d(3), {
    documentRequirementId: atlanticDriverList.id,
    createdAt: ago(2),
  });

  await addActivity(atlantic.id, "Client Created", "Client created.", ago(28));
  await addActivity(atlantic.id, "Document Received", "Current Policy uploaded.", ago(26));
  await addActivity(atlantic.id, "Driver Added", "Driver added — Wayne Kessler.", ago(25));
  await addActivity(atlantic.id, "Driver Added", "Driver added — Grace Holloway.", ago(25));
  await addActivity(atlantic.id, "Vehicle Added", "Vehicle added — 2022 Freightliner Cascadia.", ago(25));
  await addActivity(atlantic.id, "Document Received", "Loss Runs uploaded.", ago(24));
  await addActivity(atlantic.id, "Document Requested", "Driver List requested from client.", ago(7));
  await addActivity(atlantic.id, "Other", "Medical certificate marked expired — Wayne Kessler.", ago(1));
  await addActivity(atlantic.id, "Market Added", "Zurich North America added as market.", ago(3));

  // =====================================================================
  // 8. Liberty Trucking Co. — one declined market, one submitted,
  //    re-shop follow-up.
  // =====================================================================
  const liberty = await addClient({
    companyName: "Liberty Trucking Co.",
    primaryContactName: "Sam Whitaker",
    email: "sam.whitaker@libertytruckingco.example.com",
    phone: "(704) 555-0159",
    renewalDate: d(24),
    policyExpirationDate: d(27),
    status: "Waiting for Quote",
    createdAt: ago(26),
  });
  await addContact(liberty.id, {
    name: "Sam Whitaker",
    role: "Owner",
    email: "sam.whitaker@libertytruckingco.example.com",
    phone: "(704) 555-0159",
  });
  await addDoc(liberty.id, "Current Policy", "Received", { receivedAt: ago(24), createdAt: ago(26) });
  await addDoc(liberty.id, "Application", "Received", { receivedAt: ago(20), createdAt: ago(26) });

  const libertyDriver = await addDriver(liberty.id, {
    name: "Ray Dawson",
    licenseNumber: "R771-4432-1290",
    licenseState: "NC",
    licenseIssueDate: ago(2000),
    licenseExpirationDate: d(500),
  });
  await addMvr(libertyDriver.id, { reportDate: ago(10), historyYears: 5 });
  await addMedicalCert(libertyDriver.id, { issueDate: ago(200), expirationDate: d(160) });

  await addVehicle(liberty.id, {
    year: 2021,
    make: "Peterbilt",
    model: "579",
    vin: "1XPBD49X8MD556677",
    value: 79000,
    valueRecordedAt: ago(26),
    registrationOwner: "Liberty Trucking Co.",
    registrationVin: "1XPBD49X8MD556677",
    registrationAddress: "310 Trade St, Charlotte, NC",
    registrationExpiration: d(200),
    registrationReceived: true,
  });

  await addMarket(liberty.id, {
    carrierName: "Old Dominion Insurance Group",
    contactName: "Felix Bramwell",
    submittedDate: ago(14),
    status: "Declined",
    notes: "Declined — radius of operation exceeded carrier appetite.",
    createdAt: ago(16),
  });
  await addMarket(liberty.id, {
    carrierName: "Sentry Insurance",
    contactName: "Alicia Fenn",
    contactEmail: "alicia.fenn@sentry.example.com",
    submittedDate: ago(2),
    status: "Submitted",
    createdAt: ago(2),
  });

  await addFollowUp(liberty.id, "Re-Shop After Decline", "Follow up with client after Old Dominion decline — reviewing next markets.", d(7), {
    createdAt: ago(2),
  });

  await addActivity(liberty.id, "Client Created", "Client created.", ago(26));
  await addActivity(liberty.id, "Document Received", "Current Policy uploaded.", ago(24));
  await addActivity(liberty.id, "Driver Added", "Driver added — Ray Dawson.", ago(23));
  await addActivity(liberty.id, "Vehicle Added", "Vehicle added — 2021 Peterbilt 579.", ago(23));
  await addActivity(liberty.id, "Market Added", "Old Dominion Insurance Group added as market.", ago(16));
  await addActivity(liberty.id, "Market Status Changed", "Old Dominion Insurance Group declined.", ago(14));
  await addActivity(liberty.id, "Market Added", "Sentry Insurance added as market.", ago(2));
  await addActivity(liberty.id, "Market Status Changed", "Submission sent to Sentry Insurance.", ago(2));

  // =====================================================================
  // 9. Summit Transportation LLC — healthy account with a quote awaiting
  //    client decision.
  // =====================================================================
  const summit = await addClient({
    companyName: "Summit Transportation LLC",
    primaryContactName: "Nina Patel",
    email: "nina.patel@summittransportationllc.example.com",
    phone: "(720) 555-0184",
    renewalDate: d(55),
    policyExpirationDate: d(58),
    status: "On Track",
    createdAt: ago(70),
  });
  await addContact(summit.id, {
    name: "Nina Patel",
    role: "Owner",
    email: "nina.patel@summittransportationllc.example.com",
    phone: "(720) 555-0184",
  });
  await addDoc(summit.id, "Current Policy", "Received", { receivedAt: ago(68), createdAt: ago(70) });
  await addDoc(summit.id, "Loss Runs", "Received", { receivedAt: ago(65), createdAt: ago(70) });
  await addDoc(summit.id, "Application", "Received", { receivedAt: ago(63), createdAt: ago(70) });

  const summitDriver = await addDriver(summit.id, {
    name: "Nina Patel",
    licenseNumber: "N112-2233-9987",
    licenseState: "CO",
    licenseIssueDate: ago(2200),
    licenseExpirationDate: d(800),
  });
  await addMvr(summitDriver.id, { reportDate: ago(3), historyYears: 6 });
  await addMedicalCert(summitDriver.id, { issueDate: ago(60), expirationDate: d(670) });

  await addVehicle(summit.id, {
    year: 2024,
    make: "Freightliner",
    model: "Cascadia",
    vin: "3AKJHHDR4RSAB9988",
    value: 105000,
    valueRecordedAt: ago(70),
    registrationOwner: "Summit Transportation LLC",
    registrationVin: "3AKJHHDR4RSAB9988",
    registrationAddress: "10 Peak Ave, Denver, CO",
    registrationExpiration: d(400),
    registrationReceived: true,
  });
  await addVehicle(summit.id, {
    year: 2023,
    make: "Kenworth",
    model: "T680",
    vin: "1XKYD49X4PJ334422",
    value: 97000,
    valueRecordedAt: ago(70),
    registrationOwner: "Summit Transportation LLC",
    registrationVin: "1XKYD49X4PJ334422",
    registrationAddress: "10 Peak Ave, Denver, CO",
    registrationExpiration: d(280),
    registrationReceived: true,
  });

  const summitMarket = await addMarket(summit.id, {
    carrierName: "Sentry Insurance",
    contactName: "Alicia Fenn",
    contactEmail: "alicia.fenn@sentry.example.com",
    submittedDate: ago(16),
    status: "Quote Received",
    premium: 37800,
    effectiveDate: d(20),
    expirationDate: d(385),
    createdAt: ago(18),
  });

  await addFollowUp(summit.id, "Review Quote With Client", "Review Sentry Insurance quote with Nina before renewal.", d(8), {
    marketSubmissionId: summitMarket.id,
    createdAt: ago(2),
  });
  await addFollowUp(summit.id, "Loss Runs", "Confirm loss runs received in good order.", ago(64), {
    completed: true,
    completedAt: ago(64),
    createdAt: ago(66),
  });
  await addFollowUp(summit.id, "Quote Follow-Up", "Check in with Nina on Sentry Insurance quote decision.", d(0), {
    completed: true,
    completedAt: d(0),
    createdAt: ago(1),
  });

  await addActivity(summit.id, "Client Created", "Client created.", ago(70));
  await addActivity(summit.id, "Document Received", "Current Policy uploaded.", ago(68));
  await addActivity(summit.id, "Driver Added", "Driver added — Nina Patel.", ago(67));
  await addActivity(summit.id, "Vehicle Added", "Vehicle added — 2024 Freightliner Cascadia.", ago(67));
  await addActivity(summit.id, "Vehicle Added", "Vehicle added — 2023 Kenworth T680.", ago(67));
  await addActivity(summit.id, "Follow-Up", "Follow-up completed", ago(64), {
    note: "Confirmed loss runs received in good order.",
  });
  await addActivity(summit.id, "Market Added", "Sentry Insurance added as market.", ago(18));
  await addActivity(summit.id, "Market Status Changed", "Submission sent to Sentry Insurance.", ago(16));
  await addActivity(summit.id, "Quote Received", "Quote received from Sentry Insurance.", ago(6));

  // =====================================================================
  // 10. Interstate Cargo Solutions — brand-new client, onboarding not yet
  //     underway; no MVR/medical on file yet (flags itself automatically).
  // =====================================================================
  const interstate = await addClient({
    companyName: "Interstate Cargo Solutions",
    primaryContactName: "Ellis Monroe",
    email: "ellis.monroe@interstatecargosolutions.example.com",
    phone: "(602) 555-0171",
    renewalDate: d(60),
    policyExpirationDate: d(63),
    status: "Action Required",
    createdAt: ago(4),
  });
  await addContact(interstate.id, {
    name: "Ellis Monroe",
    role: "Owner",
    email: "ellis.monroe@interstatecargosolutions.example.com",
    phone: "(602) 555-0171",
  });
  await addDoc(interstate.id, "Application", "Missing", { createdAt: ago(4) });
  await addDoc(interstate.id, "Current Policy", "Missing", { createdAt: ago(4) });
  await addDoc(interstate.id, "Loss Runs", "Missing", { createdAt: ago(4) });

  await addDriver(interstate.id, {
    name: "Ellis Monroe",
    licenseNumber: "M556-8871-2209",
    licenseState: "AZ",
    licenseIssueDate: ago(1000),
    licenseExpirationDate: d(550),
  });

  await addVehicle(interstate.id, {
    year: 2020,
    make: "Volvo",
    model: "VNL",
    vin: "4V4NC9EH7LN667711",
    value: 58000,
    valueRecordedAt: ago(4),
    registrationReceived: false,
  });

  await addMarket(interstate.id, { carrierName: "Progressive", status: "Not Contacted", createdAt: ago(4) });
  await addMarket(interstate.id, { carrierName: "Travelers", status: "Not Contacted", createdAt: ago(4) });

  await addNote(interstate.id, "New client — onboarding in progress, awaiting first documents.", ago(4));

  await addFollowUp(
    interstate.id,
    "Begin Submission",
    "Follow up with Ellis to begin collecting submission documents.",
    ago(1),
    { createdAt: ago(4) }
  );

  await addActivity(interstate.id, "Client Created", "Client created.", ago(4));
  await addActivity(interstate.id, "Driver Added", "Driver added — Ellis Monroe.", ago(4));
  await addActivity(interstate.id, "Vehicle Added", "Vehicle added — 2020 Volvo VNL.", ago(4));
  await addActivity(interstate.id, "Market Added", "Progressive added as market.", ago(4));
  await addActivity(interstate.id, "Market Added", "Travelers added as market.", ago(4));

  console.log("Seed complete.");
  console.log("10 clients created — ABC Trucking LLC is the flagship demo account.");
}

function formatShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
