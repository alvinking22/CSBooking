import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function Login() {
  const { login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const primaryColor = config?.primaryColor || '#3B82F6';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('¡Bienvenido!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {config?.logo
            ? <img src={`http://localhost:5000${config.logo}`} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
            : <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: primaryColor }}>
                {(config?.businessName || 'S').charAt(0)}
              </div>
          }
          <h1 className="text-2xl font-bold text-gray-900">{config?.businessName || 'CS Booking'}</h1>
          <p className="text-gray-500 text-sm mt-1">Panel de Administración</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo Electrónico</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field pl-9" placeholder="admin@studio.com" required />
              </div>
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field pl-9 pr-9" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: primaryColor }}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">Acceso por defecto:</p>
            <p>Email: <code>admin@studio.com</code></p>
            <p>Password: <code>Admin123!</code></p>
            <p className="mt-1 text-orange-600">⚠️ Cambia estas credenciales después del primer login</p>
          </div>
        </div>
        <p className="text-center mt-4 text-sm text-gray-500">
          <a href="/" className="text-blue-600 hover:text-blue-700">← Ver página de reservas</a>
        </p>
      </div>
    </div>
  );
}
