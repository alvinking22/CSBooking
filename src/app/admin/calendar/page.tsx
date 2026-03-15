import { auth } from "@/lib/auth";
import { getCalendarBookings } from "@/actions/bookings";
import CalendarClient from "./CalendarClient";
import { format, startOfWeek, endOfWeek } from "date-fns";

export default async function CalendarPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  // Load current week (Monday start) as default view is "week"
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });

  const bookings = await getCalendarBookings(
    format(start, "yyyy-MM-dd"),
    format(end, "yyyy-MM-dd")
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CalendarClient initialBookings={bookings as any} isAdmin={isAdmin} />;
}
