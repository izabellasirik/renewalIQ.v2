import { prisma } from "@/lib/db";
import { AddDriverButton } from "@/components/AddDriverButton";
import { AddVehicleButton } from "@/components/AddVehicleButton";
import { DriverCard } from "@/components/DriverCard";
import { VehicleCard } from "@/components/VehicleCard";

export async function DriversVehiclesTab({ clientId }: { clientId: string }) {
  const [drivers, vehicles] = await Promise.all([
    prisma.driver.findMany({
      where: { clientId },
      include: {
        files: true,
        mvrs: { include: { violations: true, files: true }, orderBy: { reportDate: "desc" } },
        medicalCerts: { include: { files: true }, orderBy: { expirationDate: "desc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { clientId },
      include: { files: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Drivers</h2>
          <AddDriverButton clientId={clientId} />
        </div>
        {drivers.length === 0 ? (
          <div className="surface-card p-8 text-center text-muted">No drivers added yet.</div>
        ) : (
          <div className="space-y-3">
            {drivers.map((d) => (
              <DriverCard key={d.id} driver={d} clientId={clientId} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Vehicles</h2>
          <AddVehicleButton clientId={clientId} />
        </div>
        {vehicles.length === 0 ? (
          <div className="surface-card p-8 text-center text-muted">No vehicles added yet.</div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} clientId={clientId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
