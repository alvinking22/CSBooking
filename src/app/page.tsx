import { prisma } from "@/lib/prisma";
import { serializePrisma } from "@/lib/serialize";
import BookingFlow from "@/components/booking/BookingFlow";
import type { BookingService, BookingStudio } from "@/components/booking/booking-types";

export default async function BookingPage() {
  const [services, studios] = await Promise.all([
    prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.studio.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <BookingFlow
      initialServices={serializePrisma(services) as unknown as BookingService[]}
      initialStudios={serializePrisma(studios) as unknown as BookingStudio[]}
    />
  );
}
