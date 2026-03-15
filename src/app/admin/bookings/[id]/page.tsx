import { getBookingById } from "@/actions/bookings";
import { notFound } from "next/navigation";
import BookingDetailClient from "./BookingDetailClient";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) notFound();
  return <BookingDetailClient booking={JSON.parse(JSON.stringify(booking))} />;
}
