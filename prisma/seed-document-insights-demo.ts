import { PrismaClient } from "@prisma/client";
import { seedDemoDocumentInsights } from "./demoDocumentInsights";

// One-time backfill for databases seeded before the Documents-tab AI-analysis
// experiment existed (this app's own local/production DB included) — adds
// the same demo documents/insights to ABC Trucking LLC that a fresh
// `db:seed` now creates automatically. Safe to run more than once: it's a
// no-op once that client already has any demo document on file.

const prisma = new PrismaClient();

async function main() {
  const abc = await prisma.client.findFirst({ where: { companyName: "ABC Trucking LLC" } });
  if (!abc) {
    console.log('No "ABC Trucking LLC" client found — nothing to backfill.');
    return;
  }

  const vehicles = await prisma.vehicle.findMany({ where: { clientId: abc.id }, select: { vin: true } });
  const knownVins = vehicles.map((v) => v.vin).filter((v): v is string => !!v);

  const { created } = await seedDemoDocumentInsights(prisma, abc.id, knownVins);
  console.log(created > 0 ? `Created ${created} demo document(s) for ABC Trucking LLC.` : "Demo documents already present — nothing to do.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
