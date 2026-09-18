import { PrismaClient } from "@prisma/client";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

const today = new Date();
const d = (offset: number) => addDays(today, offset);
const ago = (offset: number) => subDays(today, offset);

async function main() {
  console.log("Clearing existing data...");
  await prisma.followUp.deleteMany();
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

  // ---------------------------------------------------------------------
  // 1. ABC Trucking — waiting on client, follow-up due today, MVR stale
  // ---------------------------------------------------------------------
  const abcTrucking = await prisma.client.create({
    data: {
      companyName: "ABC Trucking",
      primaryContactName: "John Smith",
      email: "john@abctrucking.com",
      phone: "(555) 201-3344",
      renewalDate: d(27),
      policyExpirationDate: d(30),
      status: "Waiting on Client",
      createdAt: ago(21),
    },
  });
  const abcJohn = await prisma.contact.create({
    data: { clientId: abcTrucking.id, name: "John Smith", role: "Owner", email: "john@abctrucking.com", phone: "(555) 201-3344" },
  });
  const abcLossRuns = await prisma.documentRequirement.create({
    data: { clientId: abcTrucking.id, name: "Updated Loss Runs", status: "Requested", createdAt: ago(9) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: abcTrucking.id, name: "Signed Application", status: "Missing", createdAt: ago(9) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: abcTrucking.id, name: "Current Policy", status: "Received", receivedAt: ago(10), createdAt: ago(20) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: abcTrucking.id, name: "Driver Schedule", status: "Received", receivedAt: ago(8), createdAt: ago(20) },
  });
  await prisma.activity.create({
    data: { clientId: abcTrucking.id, type: "Client Created", description: "Client created.", occurredAt: ago(21) },
  });
  await prisma.activity.create({
    data: { clientId: abcTrucking.id, type: "Document Received", description: "Vehicle Schedule uploaded.", occurredAt: ago(8) },
  });
  await prisma.activity.create({
    data: { clientId: abcTrucking.id, contactId: abcJohn.id, type: "Email Sent", description: "Requested updated loss runs.", occurredAt: ago(5) },
  });
  await prisma.activity.create({
    data: {
      clientId: abcTrucking.id,
      contactId: abcJohn.id,
      type: "Follow-Up",
      description: "Follow-up completed",
      note: "Called John regarding loss runs. Client said they should be available Friday.",
      occurredAt: ago(3),
    },
  });
  await prisma.note.create({
    data: { clientId: abcTrucking.id, content: "John said updated loss runs should arrive Friday.", createdAt: ago(3) },
  });
  await prisma.note.create({
    data: { clientId: abcTrucking.id, content: "Client prefers phone communication.", createdAt: ago(12) },
  });
  await prisma.followUp.create({
    data: {
      clientId: abcTrucking.id,
      documentRequirementId: abcLossRuns.id,
      contactId: abcJohn.id,
      forLabel: "Updated Loss Runs",
      action: "Follow up with John regarding updated loss runs.",
      dueDate: d(0),
      note: "John said documents should arrive Friday.",
      createdAt: ago(3),
    },
  });

  // ABC drivers & vehicles
  const abcJohnDriver = await prisma.driver.create({
    data: {
      clientId: abcTrucking.id,
      name: "John Smith Jr.",
      licenseNumber: "S123-4567-8901",
      licenseState: "NY",
      licenseIssueDate: ago(900),
      licenseExpirationDate: d(400),
      requiredHistoryYears: 3,
    },
  });
  await prisma.mvr.create({
    data: {
      driverId: abcJohnDriver.id,
      reportDate: ago(46),
      historyYears: 3,
      notes: "Clean record overall.",
    },
  });
  await prisma.medicalCert.create({
    data: { driverId: abcJohnDriver.id, issueDate: ago(300), expirationDate: d(370) },
  });

  const abcMaria = await prisma.driver.create({
    data: {
      clientId: abcTrucking.id,
      name: "Maria Lopez",
      licenseNumber: "L998-2231-0087",
      licenseState: "NY",
      licenseIssueDate: ago(1500),
      licenseExpirationDate: d(500),
      requiredHistoryYears: 3,
    },
  });
  await prisma.mvr.create({
    data: { driverId: abcMaria.id, reportDate: ago(12), historyYears: 4, notes: "No violations." },
  });
  await prisma.medicalCert.create({
    data: { driverId: abcMaria.id, issueDate: ago(200), expirationDate: d(165) },
  });

  await prisma.vehicle.create({
    data: {
      clientId: abcTrucking.id,
      year: 2022,
      make: "Freightliner",
      model: "Cascadia",
      vin: "1FUJGHDV8NLAA1234",
      value: 85000,
      valueRecordedAt: ago(20),
      registrationOwner: "ABC Trucking LLC",
      registrationVin: "1FUJGHDV8NLAA1234",
      registrationAddress: "123 Main Street, Brooklyn, NY",
      registrationExpiration: d(200),
      registrationReceived: true,
    },
  });
  await prisma.vehicle.create({
    data: {
      clientId: abcTrucking.id,
      year: 2021,
      make: "Volvo",
      model: "VNL",
      vin: "4V4NC9EH5MN123456",
      registrationOwner: "ABC Trucking LLC",
      registrationVin: "4V4NC9EH5MN654321",
      registrationAddress: "123 Main Street, Brooklyn, NY",
      registrationReceived: true,
    },
  });

  // ---------------------------------------------------------------------
  // 2. XYZ Logistics — waiting on client, follow-up due today, previous license needed
  // ---------------------------------------------------------------------
  const xyz = await prisma.client.create({
    data: {
      companyName: "XYZ Logistics",
      primaryContactName: "Sarah Johnson",
      email: "sarah@xyzlogistics.com",
      phone: "(555) 402-9981",
      renewalDate: d(45),
      policyExpirationDate: d(48),
      status: "Waiting on Client",
      createdAt: ago(15),
    },
  });
  const xyzSarah = await prisma.contact.create({
    data: { clientId: xyz.id, name: "Sarah Johnson", role: "Fleet Manager", email: "sarah@xyzlogistics.com", phone: "(555) 402-9981" },
  });
  const xyzDriverSchedule = await prisma.documentRequirement.create({
    data: { clientId: xyz.id, name: "Driver Schedule", status: "Requested", createdAt: ago(6) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: xyz.id, name: "Current Policy", status: "Received", receivedAt: ago(14), createdAt: ago(15) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: xyz.id, name: "Vehicle List", status: "Missing", createdAt: ago(6) },
  });
  await prisma.activity.create({
    data: { clientId: xyz.id, type: "Client Created", description: "Client created.", occurredAt: ago(15) },
  });
  await prisma.activity.create({
    data: { clientId: xyz.id, contactId: xyzSarah.id, type: "Phone Call", description: "Called regarding driver schedule.", occurredAt: ago(6) },
  });
  await prisma.followUp.create({
    data: {
      clientId: xyz.id,
      documentRequirementId: xyzDriverSchedule.id,
      contactId: xyzSarah.id,
      forLabel: "Driver Schedule",
      action: "Follow up with Sarah regarding driver schedule.",
      dueDate: d(0),
      createdAt: ago(6),
    },
  });

  const xyzCarlos = await prisma.driver.create({
    data: {
      clientId: xyz.id,
      name: "Carlos Ramirez",
      licenseNumber: "C445-1120-9987",
      licenseState: "NJ",
      licenseIssueDate: ago(700),
      licenseExpirationDate: d(18),
      requiredHistoryYears: 3,
    },
  });
  await prisma.mvr.create({ data: { driverId: xyzCarlos.id, reportDate: ago(10), historyYears: 3 } });
  await prisma.medicalCert.create({ data: { driverId: xyzCarlos.id, issueDate: ago(100), expirationDate: d(260) } });

  const xyzTom = await prisma.driver.create({
    data: {
      clientId: xyz.id,
      name: "Tom Baker",
      licenseNumber: "T220-0091-7743",
      licenseState: "NJ",
      licenseIssueDate: ago(300),
      licenseExpirationDate: d(600),
      requiredHistoryYears: 3,
      previousLicenseNeeded: true,
    },
  });
  const xyzTomMvr = await prisma.mvr.create({
    data: { driverId: xyzTom.id, reportDate: ago(9), historyYears: 1 },
  });
  await prisma.violation.create({
    data: { mvrId: xyzTomMvr.id, type: "Speeding", date: ago(120), severity: "Minor" },
  });
  await prisma.violation.create({
    data: { mvrId: xyzTomMvr.id, type: "Following too closely", date: ago(60), severity: "Severe" },
  });
  await prisma.medicalCert.create({ data: { driverId: xyzTom.id, issueDate: ago(400), expirationDate: d(-10) } });
  await prisma.activity.create({
    data: { clientId: xyz.id, type: "Driver Added", description: "Driver added — Tom Baker.", occurredAt: ago(9) },
  });
  await prisma.followUp.create({
    data: {
      clientId: xyz.id,
      driverId: xyzTom.id,
      forLabel: "Previous License Needed — Tom Baker",
      action: "Follow up with client for previous driver's license.",
      dueDate: d(4),
      createdAt: ago(2),
    },
  });

  await prisma.vehicle.create({
    data: {
      clientId: xyz.id,
      year: 2023,
      make: "Kenworth",
      model: "T680",
      vin: "1XKYD49X1PJ445566",
      value: 92000,
      valueRecordedAt: ago(14),
      registrationOwner: "XYZ Logistics Inc",
      registrationVin: "1XKYD49X1PJ445566",
      registrationAddress: "88 Harbor Blvd, Newark, NJ",
      registrationExpiration: d(150),
      registrationReceived: true,
    },
  });

  // ---------------------------------------------------------------------
  // 3. Metro Transport — follow-up due today: review received documents
  // ---------------------------------------------------------------------
  const metroTransport = await prisma.client.create({
    data: {
      companyName: "Metro Transport",
      primaryContactName: "Diane Wells",
      email: "diane@metrotransport.com",
      phone: "(555) 118-2299",
      renewalDate: d(60),
      policyExpirationDate: d(63),
      status: "In Review",
      createdAt: ago(18),
    },
  });
  const mtReq = await prisma.documentRequirement.create({
    data: { clientId: metroTransport.id, name: "Application", status: "Received", receivedAt: ago(1), createdAt: ago(18) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: metroTransport.id, name: "Current Policy", status: "Received", receivedAt: ago(17), createdAt: ago(18) },
  });
  await prisma.activity.create({
    data: { clientId: metroTransport.id, type: "Client Created", description: "Client created.", occurredAt: ago(18) },
  });
  await prisma.activity.create({
    data: { clientId: metroTransport.id, type: "Document Received", description: "Application uploaded.", occurredAt: ago(1) },
  });
  await prisma.followUp.create({
    data: {
      clientId: metroTransport.id,
      documentRequirementId: mtReq.id,
      forLabel: "Application Review",
      action: "Review documents received from client.",
      dueDate: d(0),
      createdAt: ago(1),
    },
  });

  // ---------------------------------------------------------------------
  // 4. Liberty Freight — waiting on client, follow-up due today, expired license
  // ---------------------------------------------------------------------
  const liberty = await prisma.client.create({
    data: {
      companyName: "Liberty Freight",
      primaryContactName: "Marcus Webb",
      email: "marcus@libertyfreight.com",
      phone: "(555) 776-4410",
      renewalDate: d(20),
      policyExpirationDate: d(22),
      status: "Waiting on Client",
      createdAt: ago(25),
    },
  });
  const libertyMarcus = await prisma.contact.create({
    data: { clientId: liberty.id, name: "Marcus Webb", role: "Operations Manager", email: "marcus@libertyfreight.com", phone: "(555) 776-4410" },
  });
  const libertySchedule = await prisma.documentRequirement.create({
    data: { clientId: liberty.id, name: "Driver Schedule", status: "Requested", createdAt: ago(7) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: liberty.id, name: "Loss Runs", status: "Missing", createdAt: ago(7) },
  });
  await prisma.activity.create({
    data: { clientId: liberty.id, type: "Client Created", description: "Client created.", occurredAt: ago(25) },
  });
  await prisma.followUp.create({
    data: {
      clientId: liberty.id,
      documentRequirementId: libertySchedule.id,
      contactId: libertyMarcus.id,
      forLabel: "Driver Schedule",
      action: "Follow up with Marcus regarding driver schedule.",
      dueDate: d(0),
      createdAt: ago(7),
    },
  });

  const libertyDriver = await prisma.driver.create({
    data: {
      clientId: liberty.id,
      name: "Ray Dawson",
      licenseNumber: "R771-4432-1290",
      licenseState: "PA",
      licenseIssueDate: ago(2000),
      licenseExpirationDate: ago(15),
      requiredHistoryYears: 3,
    },
  });
  await prisma.mvr.create({ data: { driverId: libertyDriver.id, reportDate: ago(20), historyYears: 5 } });
  await prisma.medicalCert.create({ data: { driverId: libertyDriver.id, issueDate: ago(500), expirationDate: d(90) } });

  await prisma.vehicle.create({
    data: {
      clientId: liberty.id,
      year: 2020,
      make: "Peterbilt",
      model: "579",
      vin: "1XPBD49X0LD123789",
      value: 71000,
      valueRecordedAt: ago(25),
      registrationReceived: false,
    },
  });

  // ---------------------------------------------------------------------
  // 5. Pioneer Hauling — follow-up due today: signed application
  // ---------------------------------------------------------------------
  const pioneer = await prisma.client.create({
    data: {
      companyName: "Pioneer Hauling",
      primaryContactName: "Angela Price",
      email: "angela@pioneerhauling.com",
      phone: "(555) 903-1187",
      renewalDate: d(35),
      policyExpirationDate: d(38),
      status: "Waiting on Client",
      createdAt: ago(11),
    },
  });
  const pioneerApp = await prisma.documentRequirement.create({
    data: { clientId: pioneer.id, name: "Signed Application", status: "Requested", createdAt: ago(4) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: pioneer.id, name: "Current Policy", status: "Received", receivedAt: ago(10), createdAt: ago(11) },
  });
  await prisma.activity.create({
    data: { clientId: pioneer.id, type: "Client Created", description: "Client created.", occurredAt: ago(11) },
  });
  await prisma.followUp.create({
    data: {
      clientId: pioneer.id,
      documentRequirementId: pioneerApp.id,
      forLabel: "Signed Application",
      action: "Follow up regarding signed application.",
      dueDate: d(0),
      createdAt: ago(4),
    },
  });

  // ---------------------------------------------------------------------
  // 6. ABC Logistics — upcoming tomorrow
  // ---------------------------------------------------------------------
  const abcLogistics = await prisma.client.create({
    data: {
      companyName: "ABC Logistics",
      primaryContactName: "Renee Fox",
      email: "renee@abclogistics.com",
      phone: "(555) 220-6634",
      renewalDate: d(50),
      policyExpirationDate: d(53),
      status: "Waiting on Client",
      createdAt: ago(9),
    },
  });
  const abcLogApp = await prisma.documentRequirement.create({
    data: { clientId: abcLogistics.id, name: "Signed Application", status: "Requested", createdAt: ago(3) },
  });
  await prisma.activity.create({
    data: { clientId: abcLogistics.id, type: "Client Created", description: "Client created.", occurredAt: ago(9) },
  });
  await prisma.followUp.create({
    data: {
      clientId: abcLogistics.id,
      documentRequirementId: abcLogApp.id,
      forLabel: "Signed Application",
      action: "Follow up for signed application.",
      dueDate: d(1),
      createdAt: ago(3),
    },
  });

  // ---------------------------------------------------------------------
  // 7. Smith Transport — upcoming Sep 20 style (2 days out), otherwise healthy
  // ---------------------------------------------------------------------
  const smithTransport = await prisma.client.create({
    data: {
      companyName: "Smith Transport",
      primaryContactName: "Derek Smith",
      email: "derek@smithtransport.com",
      phone: "(555) 552-7788",
      renewalDate: d(40),
      policyExpirationDate: d(43),
      status: "Active",
      createdAt: ago(30),
    },
  });
  const smithLossRuns = await prisma.documentRequirement.create({
    data: { clientId: smithTransport.id, name: "Loss Runs", status: "Requested", createdAt: ago(5) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: smithTransport.id, name: "Current Policy", status: "Received", receivedAt: ago(28), createdAt: ago(30) },
  });
  await prisma.activity.create({
    data: { clientId: smithTransport.id, type: "Client Created", description: "Client created.", occurredAt: ago(30) },
  });
  await prisma.followUp.create({
    data: {
      clientId: smithTransport.id,
      documentRequirementId: smithLossRuns.id,
      forLabel: "Loss Runs",
      action: "Follow up for loss runs.",
      dueDate: d(2),
      createdAt: ago(5),
    },
  });

  const smithDriver = await prisma.driver.create({
    data: {
      clientId: smithTransport.id,
      name: "Derek Smith Jr.",
      licenseNumber: "D556-7789-0012",
      licenseState: "OH",
      licenseIssueDate: ago(1800),
      licenseExpirationDate: d(600),
      requiredHistoryYears: 3,
    },
  });
  await prisma.mvr.create({ data: { driverId: smithDriver.id, reportDate: ago(5), historyYears: 4 } });
  await prisma.medicalCert.create({ data: { driverId: smithDriver.id, issueDate: ago(100), expirationDate: d(500) } });
  await prisma.vehicle.create({
    data: {
      clientId: smithTransport.id,
      year: 2023,
      make: "Mack",
      model: "Anthem",
      vin: "1M1AN07Y7NM123321",
      value: 98000,
      valueRecordedAt: ago(30),
      registrationOwner: "Smith Transport LLC",
      registrationVin: "1M1AN07Y7NM123321",
      registrationAddress: "45 Freight Way, Columbus, OH",
      registrationExpiration: d(300),
      registrationReceived: true,
    },
  });

  // ---------------------------------------------------------------------
  // 8. Metro Cargo — upcoming Sep 22 style (4 days out)
  // ---------------------------------------------------------------------
  const metroCargo = await prisma.client.create({
    data: {
      companyName: "Metro Cargo",
      primaryContactName: "Felicia Grant",
      email: "felicia@metrocargo.com",
      phone: "(555) 664-2210",
      renewalDate: d(55),
      policyExpirationDate: d(58),
      status: "In Review",
      createdAt: ago(14),
    },
  });
  const metroCargoDoc = await prisma.documentRequirement.create({
    data: { clientId: metroCargo.id, name: "Vehicle Schedule", status: "Received", receivedAt: ago(2), createdAt: ago(14) },
  });
  await prisma.activity.create({
    data: { clientId: metroCargo.id, type: "Client Created", description: "Client created.", occurredAt: ago(14) },
  });
  await prisma.activity.create({
    data: { clientId: metroCargo.id, type: "Document Received", description: "Vehicle Schedule uploaded.", occurredAt: ago(2) },
  });
  await prisma.followUp.create({
    data: {
      clientId: metroCargo.id,
      documentRequirementId: metroCargoDoc.id,
      forLabel: "Documentation Review",
      action: "Check documentation.",
      dueDate: d(4),
      createdAt: ago(2),
    },
  });

  // ---------------------------------------------------------------------
  // 9. Northstar Cargo — renewal scheduled, VIN mismatch + expired medical
  // ---------------------------------------------------------------------
  const northstar = await prisma.client.create({
    data: {
      companyName: "Northstar Cargo",
      primaryContactName: "Wendy Park",
      email: "wendy@northstarcargo.com",
      phone: "(555) 330-8842",
      renewalDate: d(15),
      policyExpirationDate: d(18),
      status: "Renewal Scheduled",
      createdAt: ago(40),
    },
  });
  await prisma.documentRequirement.create({
    data: { clientId: northstar.id, name: "Current Policy", status: "Received", receivedAt: ago(38), createdAt: ago(40) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: northstar.id, name: "Loss Runs", status: "Received", receivedAt: ago(20), createdAt: ago(40) },
  });
  await prisma.activity.create({
    data: { clientId: northstar.id, type: "Client Created", description: "Client created.", occurredAt: ago(40) },
  });

  const northstarDriver = await prisma.driver.create({
    data: {
      clientId: northstar.id,
      name: "Kevin Ortiz",
      licenseNumber: "K990-1123-4456",
      licenseState: "IL",
      licenseIssueDate: ago(1200),
      licenseExpirationDate: d(300),
      requiredHistoryYears: 3,
    },
  });
  await prisma.mvr.create({ data: { driverId: northstarDriver.id, reportDate: ago(6), historyYears: 4 } });
  await prisma.medicalCert.create({ data: { driverId: northstarDriver.id, issueDate: ago(500), expirationDate: ago(5) } });
  await prisma.activity.create({
    data: { clientId: northstar.id, type: "Medical Cert Uploaded", description: "Medical certificate uploaded — Kevin Ortiz.", occurredAt: ago(500) },
  });
  const northstarVehicle = await prisma.vehicle.create({
    data: {
      clientId: northstar.id,
      year: 2019,
      make: "International",
      model: "LT",
      vin: "3HSDJAPR9KN112233",
      value: 62000,
      valueRecordedAt: ago(40),
      registrationOwner: "Northstar Cargo Inc",
      registrationVin: "3HSDJAPR9KN112200",
      registrationAddress: "77 Lakeshore Dr, Chicago, IL",
      registrationExpiration: d(120),
      registrationReceived: true,
    },
  });
  await prisma.followUp.create({
    data: {
      clientId: northstar.id,
      vehicleId: northstarVehicle.id,
      forLabel: "VIN Mismatch — 2019 International LT",
      action: "Confirm correct VIN with client and request updated registration.",
      dueDate: d(3),
      createdAt: ago(1),
    },
  });

  // ---------------------------------------------------------------------
  // 10. Greenway Distribution — healthy, closed loop, one future check-in
  // ---------------------------------------------------------------------
  const greenway = await prisma.client.create({
    data: {
      companyName: "Greenway Distribution",
      primaryContactName: "Oliver Chen",
      email: "oliver@greenwaydist.com",
      phone: "(555) 440-1123",
      renewalDate: d(90),
      policyExpirationDate: d(93),
      status: "Active",
      createdAt: ago(60),
    },
  });
  await prisma.documentRequirement.create({
    data: { clientId: greenway.id, name: "Current Policy", status: "Received", receivedAt: ago(58), createdAt: ago(60) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: greenway.id, name: "Loss Runs", status: "Received", receivedAt: ago(55), createdAt: ago(60) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: greenway.id, name: "Application", status: "Received", receivedAt: ago(50), createdAt: ago(60) },
  });
  await prisma.activity.create({
    data: { clientId: greenway.id, type: "Client Created", description: "Client created.", occurredAt: ago(60) },
  });
  await prisma.activity.create({
    data: { clientId: greenway.id, type: "Follow-Up", description: "Follow-up completed", note: "Confirmed all documents in order for renewal.", occurredAt: ago(50) },
  });
  await prisma.note.create({
    data: { clientId: greenway.id, content: "Waiting for accountant to provide financials next cycle.", createdAt: ago(50) },
  });
  await prisma.followUp.create({
    data: {
      clientId: greenway.id,
      forLabel: "Routine Check-In",
      action: "Quick check-in ahead of renewal season.",
      dueDate: d(7),
      createdAt: ago(2),
    },
  });
  // completed historical follow-up for Greenway
  await prisma.followUp.create({
    data: {
      clientId: greenway.id,
      forLabel: "Application",
      action: "Follow up to confirm application received.",
      dueDate: ago(50),
      completed: true,
      completedAt: ago(50),
      createdAt: ago(55),
    },
  });

  // ---------------------------------------------------------------------
  // 11. Summit Freightways — healthy, a couple more completed follow-ups
  // ---------------------------------------------------------------------
  const summit = await prisma.client.create({
    data: {
      companyName: "Summit Freightways",
      primaryContactName: "Nina Patel",
      email: "nina@summitfreightways.com",
      phone: "(555) 810-3392",
      renewalDate: d(75),
      policyExpirationDate: d(78),
      status: "Active",
      createdAt: ago(70),
    },
  });
  await prisma.documentRequirement.create({
    data: { clientId: summit.id, name: "Current Policy", status: "Received", receivedAt: ago(68), createdAt: ago(70) },
  });
  await prisma.documentRequirement.create({
    data: { clientId: summit.id, name: "Loss Runs", status: "Received", receivedAt: ago(65), createdAt: ago(70) },
  });
  await prisma.activity.create({
    data: { clientId: summit.id, type: "Client Created", description: "Client created.", occurredAt: ago(70) },
  });
  await prisma.followUp.create({
    data: {
      clientId: summit.id,
      forLabel: "Loss Runs",
      action: "Follow up to confirm loss runs received.",
      dueDate: ago(64),
      completed: true,
      completedAt: ago(64),
      createdAt: ago(66),
    },
  });
  await prisma.activity.create({
    data: { clientId: summit.id, type: "Follow-Up", description: "Follow-up completed", note: "Confirmed loss runs received in good order.", occurredAt: ago(64) },
  });

  const summitDriver = await prisma.driver.create({
    data: {
      clientId: summit.id,
      name: "Nina Patel",
      licenseNumber: "N112-2233-9987",
      licenseState: "CO",
      licenseIssueDate: ago(2200),
      licenseExpirationDate: d(800),
      requiredHistoryYears: 3,
    },
  });
  await prisma.mvr.create({ data: { driverId: summitDriver.id, reportDate: ago(3), historyYears: 6 } });
  await prisma.medicalCert.create({ data: { driverId: summitDriver.id, issueDate: ago(60), expirationDate: d(670) } });
  await prisma.vehicle.create({
    data: {
      clientId: summit.id,
      year: 2024,
      make: "Freightliner",
      model: "Cascadia",
      vin: "3AKJHHDR4RSAB9988",
      value: 105000,
      valueRecordedAt: ago(70),
      registrationOwner: "Summit Freightways LLC",
      registrationVin: "3AKJHHDR4RSAB9988",
      registrationAddress: "10 Peak Ave, Denver, CO",
      registrationExpiration: d(400),
      registrationReceived: true,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
