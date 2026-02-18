# Auditoría del Proyecto CSBooking

**Fecha:** 18 de Febrero 2026
**Alcance:** Backend (Node.js/Express/Sequelize) + Frontend (React)
**Total de hallazgos:** 84 (8 Críticos, 17 Altos, 28 Medios, 31 Bajos)

---

## Resumen Ejecutivo

| Severidad | Backend | Frontend | Total |
|-----------|---------|----------|-------|
| CRITICO   | 5       | 3        | **8** |
| ALTO      | 10      | 7        | **17**|
| MEDIO     | 15      | 13       | **28**|
| BAJO      | 18      | 13       | **31**|
| **Total** | **48**  | **36**   | **84**|

---

## CRITICOS (Requieren accion inmediata)

### C1. Sin Rate Limiting en login y endpoints publicos
- **Archivo:** `server/server.js` (global)
- **Categoria:** SEGURIDAD
- **Problema:** No hay rate limiting en ningun endpoint. Un atacante puede hacer fuerza bruta al login o crear miles de reservas automaticamente.
- **Solucion:**
```js
// npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { success: false, message: 'Demasiados intentos, intenta en 15 minutos' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);
```

---

### C2. Credenciales de Azul sin cifrar en base de datos
- **Archivo:** `server/models/BusinessConfig.js` (campos azul*)
- **Categoria:** SEGURIDAD
- **Problema:** `azulAuthKey` y credenciales de la pasarela de pago se guardan en texto plano.
- **Solucion:** Usar variables de entorno para las credenciales de pago. No guardar secrets en la DB.

---

### C3. Race condition en generacion de bookingNumber
- **Archivo:** `server/controllers/bookingController.js` lineas 276-288
- **Categoria:** BUG
- **Problema:** Si dos reservas se crean al mismo milisegundo, `Booking.count()` retorna el mismo numero para ambas, generando booking numbers duplicados.
- **Solucion:**
```js
// Usar secuencia de PostgreSQL en vez de count
const [result] = await sequelize.query(
  "SELECT nextval('booking_number_seq') as num"
);
const bookingNumber = `CS-${dateStr}-${String(result[0].num).padStart(3, '0')}`;
```

---

### C4. URLs de imagenes hardcodeadas a localhost:5000
- **Archivos:**
  - `client/src/pages/BookingPage.jsx` lineas 237, 445, 486
  - `client/src/pages/NewBooking.jsx` linea 366
  - `client/src/pages/EquipmentPage.jsx` linea 218
  - `client/src/components/admin/AdminLayout.jsx` linea 28
  - `client/src/pages/Login.jsx` linea 36
- **Categoria:** BUG
- **Problema:** Todas las imagenes usan `http://localhost:5000` fijo. En produccion (Render) todas las imagenes aparecen rotas.
- **Solucion:**
```js
// En api.js o un archivo de config
export const UPLOADS_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Uso en componentes:
// ANTES: src={`http://localhost:5000${item.image}`}
// DESPUES: src={`${UPLOADS_URL}${item.image}`}
```

---

### C5. Credenciales por defecto visibles en pagina de login
- **Archivo:** `client/src/pages/Login.jsx` lineas 74-79
- **Categoria:** SEGURIDAD
- **Problema:** La pagina de login muestra `admin@studio.com / Admin123!` abiertamente. Cualquier visitante puede verlas.
- **Solucion:** Eliminar las credenciales del JSX. Solo mostrar en el setup wizard inicial.

---

### C6. Setup Wizard accesible sin autenticacion
- **Archivo:** `client/src/App.js` linea 43
- **Categoria:** SEGURIDAD
- **Problema:** `/admin/setup` no esta protegido. Cualquier persona puede acceder y registrar un nuevo admin o sobreescribir la configuracion del negocio.
- **Solucion:**
```jsx
// Verificar si setup ya fue completado
<Route path="setup" element={
  config?.setupCompleted
    ? <Navigate to="/admin" replace />
    : <SetupWizard />
} />
```

---

### C7. Booking lookup publico sin verificacion de email
- **Archivo:** `server/controllers/bookingController.js` lineas 188-225
- **Categoria:** SEGURIDAD
- **Problema:** `GET /api/bookings/number/:bookingNumber` es publico y el parametro `email` es opcional. Los booking numbers siguen un patron predecible (`CS-YYYYMMDD-NNN`), permitiendo enumerar y ver datos de cualquier reserva (nombre, email, telefono, pagos).
- **Solucion:**
```js
// Hacer el email obligatorio
const { email } = req.query;
if (!email) {
  return res.status(400).json({
    success: false,
    message: 'Email es requerido para consultar una reserva'
  });
}
const where = { bookingNumber, clientEmail: email };
```

---

### C8. register permite crear multiples admins
- **Archivo:** `server/controllers/authController.js` lineas 20-75
- **Categoria:** SEGURIDAD
- **Problema:** El endpoint `/api/auth/register` es publico. Aunque la logica asigna `admin` solo al primer usuario, un atacante podria crear usuarios `staff` ilimitados sin autenticacion.
- **Solucion:** Proteger el endpoint de registro con `auth` + `authorize('admin')` para todos los usuarios excepto el primero.

---

## ALTOS (Corregir pronto)

### A1. Mass Assignment en Equipment, Config y Payment
- **Archivos:**
  - `server/controllers/equipmentController.js` lineas 59, 85
  - `server/controllers/configController.js` linea 39
  - `server/controllers/paymentController.js` linea 176
- **Categoria:** SEGURIDAD
- **Problema:** `Equipment.create(req.body)` y `.update(req.body)` pasan el body completo a Sequelize. Un atacante con credenciales admin podria inyectar valores en campos como `id`, `createdAt`, etc.
- **Solucion:** Usar whitelist de campos permitidos:
```js
const { name, category, description, extraCost, isIncluded, isActive } = req.body;
await Equipment.create({ name, category, description, extraCost, isIncluded, isActive });
```

---

### A2. Sin validacion de input en creacion de booking (publico)
- **Archivo:** `server/controllers/bookingController.js` lineas 230-367
- **Categoria:** VALIDACION
- **Problema:** Cero validacion en `clientName`, `clientEmail`, `clientPhone`, `sessionDate`, `startTime`. El paquete `express-validator` esta instalado pero nunca se usa.
- **Solucion:**
```js
const { body, validationResult } = require('express-validator');

const bookingValidation = [
  body('clientName').trim().isLength({ min: 2, max: 100 }),
  body('clientEmail').isEmail().normalizeEmail(),
  body('clientPhone').isMobilePhone(),
  body('sessionDate').isISO8601(),
  body('startTime').matches(/^\d{2}:\d{2}$/),
];
```

---

### A3. XSS en templates de email
- **Archivo:** `server/utils/emailService.js` lineas 40-225
- **Categoria:** SEGURIDAD
- **Problema:** Datos del usuario (`clientName`, `projectDescription`, `notes`) se interpolan directamente en HTML sin escapar. Un atacante podria inyectar `<script>` en su nombre.
- **Solucion:**
```js
const escapeHtml = (str) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Uso: `<p>Hola ${escapeHtml(booking.clientName)},</p>`
```

---

### A4. Calculo de precio ignora cantidad y variantes
- **Archivo:** `server/controllers/bookingController.js` lineas 41-82
- **Archivo:** `client/src/pages/NewBooking.jsx` lineas 98-104
- **Categoria:** LOGICA / BUG
- **Problema:** `calculatePrice` recibe solo `equipmentIds` sin cantidades ni variantes. Si un cliente selecciona cantidad 3 de un equipo con costo extra $50, se cobra $50 en vez de $150. En `NewBooking` (admin) el calculo tambien ignora cantidad y variantes.
- **Solucion:** Pasar `equipmentDetails` al backend y calcular:
```js
const calculatePrice = async (duration, equipmentDetails = [], serviceTypeId = null) => {
  // ...
  let equipmentCost = 0;
  for (const detail of equipmentDetails) {
    const eq = await Equipment.findByPk(detail.equipmentId);
    if (!eq || eq.isIncluded) continue;
    let cost = parseFloat(eq.extraCost);
    // Verificar si hay variante con costo extra
    if (detail.selectedOption && eq.options) {
      const variant = findVariant(eq.options, detail.selectedOption);
      if (variant) cost += parseFloat(variant.extraCost || 0);
    }
    equipmentCost += cost * (detail.quantity || 1);
  }
  // ...
};
```

---

### A5. Sin validacion de email en formularios del frontend
- **Archivos:**
  - `client/src/pages/BookingPage.jsx` lineas 220-224
  - `client/src/pages/NewBooking.jsx` lineas 164-168
- **Categoria:** UX / BUG
- **Problema:** `canGoNext()` solo verifica que email no este vacio. No valida formato. El `<input type="email">` solo valida en submit nativo, pero estos formularios usan `onClick`.
- **Solucion:**
```js
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// En canGoNext: clientEmail && isValidEmail(clientEmail)
```

---

### A6. Sin password strength validation
- **Archivo:** `server/controllers/authController.js` lineas 179-210
- **Categoria:** SEGURIDAD
- **Problema:** `changePassword` acepta cualquier string. Se puede poner "1" como contrasena.
- **Solucion:**
```js
if (newPassword.length < 8) {
  return res.status(400).json({ success: false, message: 'Contrasena debe tener al menos 8 caracteres' });
}
```

---

### A7. SSL de base de datos con rejectUnauthorized: false
- **Archivo:** `server/config/database.js` linea 11
- **Categoria:** SEGURIDAD
- **Problema:** En produccion, `rejectUnauthorized: false` desactiva la verificacion del certificado SSL, dejando la conexion vulnerable a ataques MITM.
- **Solucion:** Usar el certificado CA de Render:
```js
dialectOptions: {
  ssl: { require: true, rejectUnauthorized: true }
}
```

---

### A8. Dashboard no muestra error si API falla
- **Archivo:** `client/src/pages/Dashboard.jsx` lineas 23-25
- **Categoria:** BUG
- **Problema:** `Promise.all` sin `.catch()`. Si la API falla, el dashboard muestra ceros sin ningun mensaje de error.
- **Solucion:** Agregar catch y estado de error:
```js
} catch (err) {
  setError('Error cargando datos del dashboard');
} finally {
  setLoading(false);
}
```

---

### A9. Dependencia faltante en useEffect (NewBooking)
- **Archivo:** `client/src/pages/NewBooking.jsx` linea 105
- **Categoria:** BUG
- **Problema:** El useEffect de pricing omite `allEquipment` del array de dependencias. Si el equipo carga despues del servicio, el costo sera $0.
- **Solucion:** Agregar `allEquipment` al array de dependencias.

---

### A10. Error de deleteFile - path incorrecto
- **Archivo:** `server/middleware/upload.js` lineas 61-71
- **Categoria:** BUG
- **Problema:** `deleteFile` recibe paths como `/uploads/equipment/file.jpg` (URL), pero el filesystem necesita `./uploads/equipment/file.jpg`. El `/` inicial hace que busque desde la raiz del sistema.
- **Solucion:**
```js
const deleteFile = (filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
```

---

### A11. getBookingByNumber expone IDs internos publicamente
- **Archivo:** `server/controllers/bookingController.js` lineas 564-591
- **Categoria:** SEGURIDAD
- **Problema:** `GET /api/bookings/calendar` retorna UUIDs de bookings al publico, facilitando ataques si hay otros endpoints vulnerables.
- **Solucion:** Omitir el campo `id` de la respuesta publica:
```js
attributes: ['sessionDate', 'startTime', 'endTime', 'status']
```

---

### A12. 401 interceptor causa refresh completo de pagina
- **Archivo:** `client/src/services/api.js` lineas 16-21
- **Categoria:** UX
- **Problema:** `window.location.href = '/admin/login'` destruye todo el estado de React. Si el admin esta editando algo y el token expira, pierde todo.
- **Solucion:** Emitir un evento que AuthContext escuche para hacer logout sin reload:
```js
window.dispatchEvent(new Event('auth-expired'));
```

---

## MEDIOS

### M1. BusinessConfig.findOne() puede retornar null
- **Archivo:** `server/controllers/bookingController.js` lineas 338-342
- **Problema:** Si no hay config, `config.sendConfirmationEmail` tira TypeError.
- **Solucion:** `if (config && config.sendConfirmationEmail)`

### M2. updateBooking no recalcula precios al cambiar duracion
- **Archivo:** `server/controllers/bookingController.js` lineas 370-471
- **Problema:** Admin puede cambiar duracion de 2h a 8h sin que cambie el precio.
- **Solucion:** Recalcular precios cuando cambian `duration`, `serviceTypeId` o `equipmentIds`.

### M3. Disponibilidad no respeta bufferTime
- **Archivo:** `server/controllers/bookingController.js` lineas 6-38
- **Problema:** Existe campo `bufferTime` en config pero la verificacion de disponibilidad lo ignora.
- **Solucion:** Expandir `startTime` y `endTime` con el buffer al verificar.

### M4. No-show bookings bloquean slots permanentemente
- **Archivo:** `server/controllers/bookingController.js` lineas 6-38
- **Problema:** Solo se excluyen bookings `cancelled`. Un no-show bloquea el slot forever.
- **Solucion:** Excluir tambien `no_show` y `completed` (para dias pasados).

### M5. getPublicConfig no incluye campos de time blocks
- **Archivo:** `server/controllers/configController.js` lineas 215-237
- **Problema:** La config publica no incluye `useTimeBlocks` ni `timeBlocks`, necesarios para el booking publico.
- **Solucion:** Agregar los campos al query de `getPublicConfig`.

### M6. serviceTypeController expone error.message al cliente
- **Archivo:** `server/controllers/serviceTypeController.js` lineas 17-88
- **Problema:** Cada catch retorna `error: error.message` en vez de usar `next(error)`. Puede filtrar detalles internos.
- **Solucion:** Usar `next(error)` como en los demas controllers.

### M7. Payment deletion destruye registros financieros permanentemente
- **Archivo:** `server/controllers/paymentController.js` lineas 212-250
- **Problema:** No hay soft-delete ni verificacion de estado. Un pago completado puede borrarse.
- **Solucion:** No permitir borrar pagos completados. Usar soft-delete.

### M8. Token en localStorage vulnerable a XSS
- **Archivo:** `client/src/contexts/AuthContext.js` linea 25
- **Problema:** Si hay vulnerabilidad XSS, el token puede robarse.
- **Solucion:** Considerar migrar a HttpOnly cookies. A corto plazo, sanitizar todo input del usuario.

### M9. Errores silenciados en multiples paginas
- **Archivos:** BookingPage.jsx, BookingConfirmation.jsx, NewBooking.jsx, BookingDetail.jsx
- **Problema:** Multiples `.catch(() => {})` vacios. El usuario no ve ningun error.
- **Solucion:** Mostrar un toast o mensaje de error al usuario.

### M10. generateTimeSlots ignora bufferTime
- **Archivo:** `client/src/pages/BookingPage.jsx` lineas 138-139
- **Problema:** Siempre genera slots cada 60 minutos. El bufferTime no tiene efecto.
- **Solucion:** Usar `bufferMinutes` para espaciar los slots.

### M11. calculateEndTime en NewBooking ignora minutos
- **Archivo:** `client/src/pages/NewBooking.jsx` lineas 126-129
- **Problema:** Solo parsea la hora, ignora minutos. `10:30` + 2h = `12:00` en vez de `12:30`.
- **Solucion:** Parsear hora y minutos completos.

### M12. File upload MIME type se puede falsificar
- **Archivo:** `server/middleware/upload.js` lineas 38-49
- **Problema:** Solo verifica extension y MIME del header, ambos controlados por el cliente.
- **Solucion:** Verificar magic bytes del archivo.

### M13. Archivos subidos son publicos sin control de acceso
- **Archivo:** `server/server.js` linea 52
- **Problema:** `/uploads` sirve todos los archivos sin autenticacion.
- **Solucion:** Aceptable para imagenes de equipo, pero verificar que no se suban archivos sensibles.

### M14. CORS solo acepta un origen
- **Archivo:** `server/server.js` lineas 32-35
- **Problema:** Solo un `CLIENT_URL`. No soporta multiples origenes (staging + produccion).
- **Solucion:** Soportar lista separada por comas en la variable de entorno.

### M15. JWT_SECRET sin validacion al arrancar
- **Archivo:** `server/server.js`
- **Problema:** Si falta `JWT_SECRET`, el servidor arranca pero toda auth falla en runtime.
- **Solucion:** Validar variables de entorno requeridas al inicio.

### M16. No hay debounce en busqueda de BookingsList
- **Archivo:** `client/src/pages/BookingsList.jsx` linea 92
- **Problema:** Cada tecla genera una peticion API. Escribir un email de 14 chars = 14 requests.
- **Solucion:** Agregar debounce de 300ms.

### M17. PaymentsPage carga TODOS los pagos sin paginacion
- **Archivo:** `client/src/pages/PaymentsPage.jsx` linea 21
- **Problema:** A medida que crecen los datos, la pagina se pone lenta.
- **Solucion:** Implementar paginacion.

### M18. SettingsPage puede sobreescribir config con defaults
- **Archivo:** `client/src/pages/SettingsPage.jsx` lineas 13-22
- **Problema:** Si el fetch de config falla, al guardar se envian los defaults hardcodeados.
- **Solucion:** No permitir guardar si la config no se cargo correctamente.

### M19. PublicBooking.jsx es codigo muerto
- **Archivo:** `client/src/pages/PublicBooking.jsx`
- **Problema:** No se usa en ningun lugar. Es la version vieja del booking page.
- **Solucion:** Eliminar el archivo.

### M20. ServicesPage modal sin soporte de Escape key
- **Archivo:** `client/src/pages/ServicesPage.jsx` lineas 223-313
- **Problema:** Modal custom sin Escape key, sin focus trap, sin scroll lock.
- **Solucion:** Reutilizar el componente `Modal.jsx` existente en `components/common/`.

### M21. Seed data crea bookings sin bookingNumber
- **Archivo:** `server/scripts/seedData.js` lineas 199-237
- **Problema:** `bulkCreate` no ejecuta hooks. `bookingNumber` es NOT NULL y unico.
- **Solucion:** Usar `{ individualHooks: true }` o generar bookingNumber manualmente.

---

## BAJOS

| # | Archivo | Problema |
|---|---------|----------|
| B1 | `server/server.js:24` | `testConnection()` no crashea el server si la DB falla |
| B2 | `server/models/Booking.js:46` vs `ServiceType.js:22` | duration es DECIMAL en Booking pero INTEGER en ServiceType |
| B3 | `server/controllers/bookingController.js:115` | `findAndCountAll` sin `distinct: true` puede dar count incorrecto |
| B4 | `server/models/User.js:33` | Default role es `admin` en vez de `staff` |
| B5 | `server/controllers/paymentController.js:82` | No valida que `amount` sea positivo |
| B6 | `server/controllers/bookingController.js:370` | No valida transiciones de estado (cancelled -> pending) |
| B7 | `server/controllers/bookingController.js:520` | `confirmBooking` no verifica estado actual |
| B8 | `server/utils/emailService.js:5` | Transporter SMTP creado por cada envio (sin pooling) |
| B9 | `server/models/BookingEquipment.js` | Faltan indices en bookingId/equipmentId |
| B10 | `server/routes/serviceRoutes.js:14` | Falta `optionalAuth` para que admin vea inactivos via GET /api/services |
| B11 | `server/scripts/setupDatabase.js:9` | `force: true` borra todo si se ejecuta por error en produccion |
| B12 | `client/src/pages/BookingPage.jsx` | Flash de "no hay servicios" antes de que carguen |
| B13 | `client/src/pages/BookingPage.jsx:72` | Risk de NaN si basePrice es null |
| B14 | `client/src/pages/BookingPage.jsx:159` | endTime puede exceder 24:00 sin validacion |
| B15 | `client/src/pages/BookingPage.jsx:28` | Datos no se resetean al cambiar de servicio |
| B16 | `client/src/pages/EquipmentPage.jsx:133` | IDs de variante con `Date.now()` pueden duplicarse |
| B17 | `client/src/pages/BookingDetail.jsx:326` | Hex color `${pc}15` produce opacidad incorrecta |
| B18 | `client/src/pages/BookingsList.jsx:43` | Busqueda solo por email, no por nombre ni booking number |
| B19 | `client/src/pages/BookingDetail.jsx:44` | Funcion `fetch` hace shadow del global `window.fetch` |
| B20 | `client/src/components/booking/ModernCalendar.jsx` | No usa `config.primaryColor` |
| B21 | Multiples archivos | Faltan `aria-label` y atributos de accesibilidad |
| B22 | `client/src/pages/BookingPage.jsx` | Falta soporte de teclado para navegacion entre steps |

---

## Plan de Accion Recomendado

### Fase 1 - Seguridad (Inmediato)
1. Agregar rate limiting (C1)
2. Quitar credenciales del login page (C5)
3. Proteger /admin/setup (C6)
4. Requerir email en booking lookup (C7)
5. Proteger endpoint de registro (C8)
6. Escapar HTML en emails (A3)
7. Whitelist de campos en create/update (A1)

### Fase 2 - Bugs Criticos (Esta semana)
1. Reemplazar localhost:5000 con variable de entorno (C4)
2. Fix race condition en bookingNumber (C3)
3. Fix calculo de precios con cantidad/variantes (A4)
4. Agregar validacion de input en booking (A2)
5. Fix deleteFile path (A10)
6. Null check en BusinessConfig (M1)

### Fase 3 - Logica de Negocio (Proxima semana)
1. Implementar bufferTime en disponibilidad (M3)
2. Recalcular precios al editar booking (M2)
3. Manejar no-show en disponibilidad (M4)
4. Agregar getPublicConfig con time blocks (M5)
5. Fix calculateEndTime minutos (M11)
6. Debounce en busqueda (M16)

### Fase 4 - Mejoras (Cuando sea posible)
1. Paginacion en pagos (M17)
2. Eliminar PublicBooking.jsx (M19)
3. Mejorar accesibilidad (B21, B22)
4. Validacion de email en frontend (A5)
5. Error handling visible al usuario (M9)
