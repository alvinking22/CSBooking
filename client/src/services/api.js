import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://csbooking-api.onrender.com/api';

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studio_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('studio_token');
      if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (d) => api.post('/auth/login', d),
  register: (d) => api.post('/auth/register', d),
  getMe: () => api.get('/auth/me'),
  updateProfile: (d) => api.put('/auth/profile', d),
  changePassword: (d) => api.put('/auth/password', d),
  checkSetupStatus: () => api.get('/auth/setup-status'),
};

export const configAPI = {
  // Métodos base
  getPublic: () => api.get('/config/public'),
  get: () => api.get('/config'),
  update: (d) => api.put('/config', d),
  uploadLogo: (fd) => api.post('/config/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateHours: (d) => api.put('/config/hours', d),
  updatePricing: (d) => api.put('/config/pricing', d),
  updateAzul: (d) => api.put('/config/azul', d),
  completeSetup: () => api.post('/config/complete-setup'),
  // Aliases para compatibilidad
  getPublicConfig: () => api.get('/config/public'),
  getConfig: () => api.get('/config'),
  updateConfig: (d) => api.put('/config', d),
  updateOperatingHours: (d) => api.put('/config/hours', d),
};

export const equipmentAPI = {
  getAll: (p) => api.get('/equipment', { params: p }),
  getById: (id) => api.get(`/equipment/${id}`),
  create: (d) => api.post('/equipment', d),
  update: (id, d) => api.put(`/equipment/${id}`, d),
  delete: (id) => api.delete(`/equipment/${id}`),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('equipment', file);
    return api.post(`/equipment/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const bookingAPI = {
  getAll: (p) => api.get('/bookings', { params: p }),
  getById: (id) => api.get(`/bookings/${id}`),
  getByNumber: (n, email) => api.get(`/bookings/number/${n}`, { params: { email } }),
  create: (d) => api.post('/bookings', d),
  update: (id, d) => api.put(`/bookings/${id}`, d),
  confirm: (id) => api.put(`/bookings/${id}/confirm`),
  cancel: (id, d) => api.put(`/bookings/${id}/cancel`, d),
  checkAvailability: (d) => api.post('/bookings/check-availability', d),
  getCalendar: (p) => api.get('/bookings/calendar', { params: p }),
  getDashboardStats: () => api.get('/bookings/stats/dashboard'),
};

export const paymentAPI = {
  getAll: (p) => api.get('/payments', { params: p }),
  getByBooking: (id) => api.get(`/payments/booking/${id}`),
  create: (d) => api.post('/payments', d),
  update: (id, d) => api.put(`/payments/${id}`, d),
  delete: (id) => api.delete(`/payments/${id}`),
  getStats: () => api.get('/payments/stats'),
};

export default api;
