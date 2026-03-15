"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useConfig } from "@/contexts/ConfigContext";
import { formatMoney } from "@/utils/formatMoney";
import { StatusBadge } from "@/components/ui/status-badge";
import { CalendarDays, DollarSign, Clock, CreditCard } from "lucide-react";

// recharts (~500KB) cargado solo cuando el componente es visible — bundle-dynamic-imports
const RevenueChart = dynamic(() => import("./RevenueChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm animate-pulse">
      Cargando gráfico…
    </div>
  ),
});

// Hoistear fuera del componente para evitar recreación en cada render — rendering-hoist-jsx
const STAT_ICONS = [CalendarDays, DollarSign, Clock, CreditCard] as const;

interface Booking {
  id: string;
  clientName: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: unknown;
  serviceType?: { name: string } | null;
  studio?: { name: string; color?: string | null } | null;
}

interface Props {
  stats: {
    thisMonthBookings: number;
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    upcomingBookings: Booking[];
    revenueByDay: { date: string; revenue: number }[];
  };
  monthRevenue: number;
  totalRevenue: number;
  pendingPayments: number;
}

export default function DashboardClient({
  stats,
  monthRevenue,
  totalRevenue,
  pendingPayments,
}: Props) {
  const { config } = useConfig();
  const pc = config?.primaryColor || "#3B82F6";

  // Valores dinámicos separados de los íconos/colores estáticos (ya hoisteados arriba)
  const cards = [
    { label: "Reservas Este Mes", value: stats.thisMonthBookings, color: pc,        sub: `${stats.totalBookings} en total` },
    { label: "Ingresos del Mes",  value: `$${formatMoney(monthRevenue)}`,            color: "#10B981", sub: `$${formatMoney(totalRevenue)} histórico` },
    { label: "Pendientes",        value: stats.pendingBookings,  color: "#F59E0B",   sub: "Esperando confirmación" },
    { label: "Pagos Pendientes",  value: pendingPayments,        color: "#EF4444",   sub: "Por registrar" },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBookings = stats.upcomingBookings.filter((b) => {
    const d = new Date(b.sessionDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = STAT_ICONS[i];
          return (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200"
            >
              <div
                className="p-2 rounded-xl w-fit mb-3"
                style={{ background: `${c.color}18` }}
                aria-hidden="true"
              >
                <Icon className="w-5 h-5" style={{ color: c.color }} aria-hidden="true" />
              </div>
              <dl>
                <dd className="text-xl sm:text-2xl font-bold text-gray-900">
                  {c.value}
                </dd>
                <dt className="text-sm font-medium text-gray-600 mt-0.5">{c.label}</dt>
                <dd className="text-xs text-gray-400 mt-1">{c.sub}</dd>
              </dl>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart + Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.revenueByDay.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">
              Ingresos (30 días)
            </h2>
            <div role="img" aria-label="Gráfico de barras: ingresos de los últimos 30 días">
              <RevenueChart data={stats.revenueByDay} primaryColor={pc} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Ocupación de Hoy</h2>
          {!todayBookings.length ? (
            <div className="flex flex-col items-center justify-center h-44 gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${pc}12` }}>
                <CalendarDays className="w-5 h-5" style={{ color: pc }} aria-hidden="true" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Sin reservas por hoy</p>
              <p className="text-gray-400 text-xs">Disfruta el día tranquilo 🎵</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {todayBookings.map((b) => {
                const startH = parseInt(b.startTime?.split(":")[0] || "0");
                const endH = parseInt(b.endTime?.split(":")[0] || "0");
                const hours = endH - startH;
                return (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ background: b.studio?.color || pc }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {b.clientName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {b.studio?.name} · {b.startTime} - {b.endTime} ({hours}h)
                      </p>
                    </div>
                    <StatusBadge status={b.status.toLowerCase()} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Próximas Reservas</h2>
          <Link
            href="/admin/bookings"
            className="text-sm font-medium hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded transition-opacity"
            style={{ color: pc }}
          >
            Ver todas las reservas
          </Link>
        </div>
        {!stats.upcomingBookings.length ? (
          <div className="p-8 text-center text-gray-400">
            <p>No hay reservas próximas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.upcomingBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0"
                  style={{ background: pc }}
                >
                  <span className="text-xs font-bold">
                    {format(
                      new Date(b.sessionDate.toString().slice(0, 10) + "T12:00:00"),
                      "MMM",
                      { locale: es }
                    ).toUpperCase()}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {format(
                      new Date(b.sessionDate.toString().slice(0, 10) + "T12:00:00"),
                      "d"
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {b.clientName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {b.startTime?.slice(0, 5)} - {b.endTime?.slice(0, 5)}
                    {b.serviceType && ` · ${b.serviceType.name}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={b.status.toLowerCase()} />
                  <span className="text-sm font-semibold">
                    ${formatMoney(Number(b.totalPrice))}
                  </span>
                </div>
                <span className="text-gray-400">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
