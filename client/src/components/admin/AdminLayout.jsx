import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
const NAV = [
  { path: '/admin/dashboard', label: 'Dashboard' },
  { path: '/admin/bookings', label: 'Reservas' },
  { path: '/admin/services', label: 'Servicios' },
  { path: '/admin/equipment', label: 'Equipos' },
  { path: '/admin/payments', label: 'Pagos' },
  { path: '/admin/settings', label: 'Configuración' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pc = config?.primaryColor || '#3B82F6';

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {config?.logo
            ? <img src={`http://localhost:5000${config.logo}`} alt="Logo" className="h-8 w-auto object-contain" />
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: pc }}>
                {(config?.businessName || 'S').charAt(0)}
              </div>
          }
          <div>
            <p className="font-bold text-gray-900 text-sm">{config?.businessName || 'CS Booking'}</p>
            <p className="text-xs text-gray-500">Panel de Administración</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(item => (
          <NavLink key={item.path} to={item.path} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            style={({ isActive }) => isActive ? { background: pc } : {}}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100 space-y-1">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
          Ver página pública
        </a>
        <div className="px-4 py-2 text-sm">
          <p className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden lg:flex lg:w-64 bg-white border-r border-gray-100 flex-col fixed inset-y-0 z-30">
        <SidebarContent />
      </aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-white shadow-xl z-50">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-xl leading-none">&times;</button>
            <SidebarContent />
          </aside>
        </div>
      )}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 text-xl leading-none">&#9776;</button>
          <span className="font-semibold text-gray-900">{config?.businessName || 'CS Booking'}</span>
        </header>
        <div className="flex-1 p-4 lg:p-6"><Outlet /></div>
      </main>
    </div>
  );
}
