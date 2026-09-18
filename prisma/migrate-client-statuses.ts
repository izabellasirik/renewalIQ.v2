import { PrismaClient } from "@prisma/client";

// One-time data fix for the client status vocabulary change:
//   Active            -> Action Required
//   Renewal Scheduled -> Waiting for Quote
//   In Review         -> On Track
//   Closed            -> Completed
//   Waiting on Client -> unchanged
//
// Safe to run more than once: each run only touches rows still holding one
// of the old status strings, so a second run is a no-op.

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, string> = {
  Active: "Action Required",
  "Renewal Scheduled": "Waiting for Quote",
  "In Review": "On Track",
  Closed: "Completed",
};

async function main() {
  let totalUpdated = 0;
  for (const [oldStatus, newStatus] of Object.entries(STATUS_MAP)) {
    const { count } = await prisma.client.updateMany({
      where: { status: oldStatus },
      data: { status: newStatus },
    });
    if (count > 0) {
      console.log(`${oldStatus} -> ${newStatus}: updated ${count} client(s)`);
      totalUpdated += count;
    }
  }
  console.log(totalUpdated > 0 ? `Done — ${totalUpdated} client(s) updated.` : "Nothing to update.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
