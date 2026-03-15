"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useConfig } from "@/contexts/ConfigContext";
import {
  LayoutDashboard, CalendarDays, BookOpen, Users, Layers,
  Mic2, Package, CreditCard, UserCog, Settings, ExternalLink,
  LogOut, Menu, X,
} from "lucide-react";

const NAV = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/calendar", label: "Calendario", icon: CalendarDays },
  { path: "/admin/bookings", label: "Reservas", icon: BookOpen },
  { path: "/admin/clients", label: "Clientes", icon: Users },
  { path: "/admin/services", label: "Servicios", icon: Layers },
  { path: "/admin/studios", label: "Estudios", icon: Mic2 },
  { path: "/admin/equipment", label: "Equipos", icon: Package },
  { path: "/admin/payments", label: "Pagos", icon: CreditCard },
  { path: "/admin/users", label: "Usuarios", icon: UserCog },
  { path: "/admin/settings", label: "Configuración", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { config } = useConfig();
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  const pc = config?.primaryColor || "#3B82F6";
  const isStaff = session?.user?.role === "STAFF";

  // Memoize filtered nav to avoid recomputing on every render — rerender-derived-state
  const navItems = useMemo(
    () => (isStaff ? NAV.filter((n) => n.path === "/admin/calendar") : NAV),
    [isStaff]
  );

  // Stable callback reference — rerender-functional-setstate
  const handleLogout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push("/login");
  }, [router]);

  // Focus trap for mobile drawer
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'textarea:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    const focusables = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelectors));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Focus first element when drawer opens
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }  // direct false is fine here
      if (e.key !== "Tab") return;
      if (focusables.length === 0) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const userInitial = ((session?.user?.firstName || session?.user?.email || "U").charAt(0)).toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className="p-6 border-b border-gray-100"
        style={{ background: `linear-gradient(135deg, ${pc}0d 0%, transparent 60%)` }}
      >
        <div className="flex items-center gap-3">
          {config?.logo ? (
            <Image src={config.logo} alt={`Logo de ${config.businessName}`} width={120} height={32} className="h-8 w-auto object-contain" />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: pc }}
              aria-hidden="true"
            >
              {(config?.businessName || "S").charAt(0)}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900 text-sm">
              {config?.businessName || "CS Booking"}
            </p>
            <p className="text-xs text-gray-500">Panel de Administración</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto" aria-label="Menú principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                isActive ? "text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              style={isActive ? { background: pc, outlineColor: pc } : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-colors"
          aria-label="Ver página pública (abre en nueva pestaña)"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          Ver página pública
        </a>
        <div className="flex items-center gap-3 px-4 py-2" aria-label="Usuario activo">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
            style={{ background: pc }}
            aria-hidden="true"
          >
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">
              {session?.user?.firstName} {session?.user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 bg-white border-r border-gray-100 flex-col fixed inset-y-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside ref={drawerRef} className="relative flex flex-col w-72 bg-white shadow-xl z-50">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900"
            aria-label="Abrir menú de navegación"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="font-semibold text-gray-900">
            {config?.businessName || "CS Booking"}
          </span>
        </header>
        <div className="flex-1 p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
