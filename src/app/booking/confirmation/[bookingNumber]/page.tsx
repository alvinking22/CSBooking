import { getBookingByNumber } from "@/actions/bookings";
import { notFound } from "next/navigation";
import BookingConfirmationClient from "./BookingConfirmationClient";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = await params;
  const booking = await getBookingByNumber(bookingNumber);
  if (!booking) notFound();
  return <BookingConfirmationClient booking={JSON.parse(JSON.stringify(booking))} />;
}
