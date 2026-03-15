import { notFound, redirect } from "next/navigation";
import { getBookingById } from "@/actions/bookings";
import { auth } from "@/lib/auth";
import EditBookingClient from "../EditBookingClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBookingPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const booking = await getBookingById(id);

  if (!booking) notFound();

  // Only allow editing non-terminal bookings
  if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status)) {
    redirect(`/admin/bookings/${id}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <EditBookingClient booking={booking as any} />;
}
