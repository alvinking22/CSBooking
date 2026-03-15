import { getDashboardStats } from "@/actions/bookings";
import { getPayments } from "@/actions/payments";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const [stats, payments] = await Promise.all([
    getDashboardStats(),
    getPayments(),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthRevenue = payments
    .filter((p) => p.createdAt >= startOfMonth && p.status === "COMPLETED")
    .reduce((s, p) => s + Number(p.amount), 0);

  const totalRevenue = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + Number(p.amount), 0);

  const pendingPayments = payments.filter(
    (p) => p.status !== "COMPLETED"
  ).length;

  return (
    <DashboardClient
      stats={stats}
      monthRevenue={monthRevenue}
      totalRevenue={totalRevenue}
      pendingPayments={pendingPayments}
    />
  );
}
