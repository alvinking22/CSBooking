"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/ConfigContext";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { config } = useConfig();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Credenciales incorrectas");
        return;
      }

      // Fetch session to get role
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      toast.success("¡Bienvenido!");

      if (session?.user?.role === "STAFF") {
        router.push("/admin/calendar");
      } else {
        router.push("/admin/dashboard");
      }
      router.refresh();
    } catch {
      toast.error("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = config?.primaryColor || "#3B82F6";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {config?.logo ? (
            <img
              src={config.logo}
              alt="Logo"
              className="h-16 mx-auto mb-4 object-contain"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: primaryColor }}
            >
              {(config?.businessName || "S").charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {config?.businessName || "CS Booking"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Panel de Administración</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Iniciar Sesión
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="admin@studio.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: primaryColor }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">Acceso por defecto (solo dev):</p>
              <p>
                Email: <code>admin@studio.com</code>
              </p>
              <p>
                Password: <code>Admin123!</code>
              </p>
              <p className="mt-1 text-orange-600">
                ⚠️ Cambia estas credenciales después del primer login
              </p>
            </div>
          )}
        </div>
        <p className="text-center mt-4 text-sm text-gray-500">
          <a href="/" className="text-blue-600 hover:text-blue-700">
            ← Ver página de reservas
          </a>
        </p>
      </div>
    </div>
  );
}
