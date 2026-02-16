# ⚡ Comandos Rápidos para Render

## 🎯 Configuración en 3 Pasos

### 1️⃣ BASE DE DATOS (PostgreSQL)
Crea en Render:
- **New +** → **PostgreSQL**
- **Name:** `csbooking-db`
- **Database:** `cs_booking`
- **Plan:** Free
- **Copia el DATABASE_URL** cuando esté lista

---

### 2️⃣ BACKEND (API)
Crea en Render:
- **New +** → **Web Service** → Conecta GitHub → Selecciona CSBooking

**Configuración:**
```
Name: csbooking-api
Region: Oregon (USA)
Branch: main
Root Directory: server
Environment: Node
Build Command: npm install
Start Command: npm start
Plan: Free
```

**Variables de Entorno (copiar y pegar):**
```
NODE_ENV=production
PORT=10000
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

**Variables que DEBES personalizar:**
```
JWT_SECRET=[ejecuta en Mac: openssl rand -hex 32]
DATABASE_URL=[pega la URL de PostgreSQL que copiaste]
CLIENT_URL=[dejar vacío por ahora, lo actualizaremos después]
```

**Después de que el backend esté desplegado:**
1. Ve a **Shell** en el servicio backend
2. Ejecuta:
```bash
node scripts/setupDatabase.js
```

Deberías ver:
```
✅ Database schema created
✅ Default admin user created
   Email: admin@studio.com
   Password: Admin123!
```

---

### 3️⃣ FRONTEND
Crea en Render:
- **New +** → **Static Site** → Conecta GitHub → Selecciona CSBooking

**Configuración:**
```
Name: csbooking-frontend
Region: Oregon (USA)
Branch: main
Root Directory: client
Build Command: npm install && npm run build
Publish Directory: build
```

**Variable de Entorno:**
```
REACT_APP_API_URL=https://[tu-backend-url].onrender.com/api
```
⚠️ Reemplaza `[tu-backend-url]` con la URL REAL de tu backend

**Después de que el frontend esté desplegado:**
1. Copia la URL del frontend (ej: `https://csbooking-frontend.onrender.com`)
2. Ve al servicio **backend** → **Environment**
3. Actualiza `CLIENT_URL` con la URL del frontend (sin `/` al final)
4. Guarda cambios (se reiniciará automáticamente)

---

## ✅ Verificación Rápida

### Verificar Backend:
```
https://tu-backend.onrender.com/api/auth/setup-status
```
Deberías ver: `{"success":true,"data":{"hasUsers":true,"setupComplete":true}}`

### Verificar Frontend:
```
https://tu-frontend.onrender.com
```
Deberías ver la página de reservas

### Login Admin:
```
URL: https://tu-frontend.onrender.com/admin/login
Email: admin@studio.com
Password: Admin123!
```

---

## 🔧 Comandos de Troubleshooting

### Si no puedes hacer login:

**1. Verificar que el usuario admin existe:**
```bash
# En Render Shell del backend
node -e "const {User} = require('./models'); User.findOne({where: {email: 'admin@studio.com'}}).then(u => console.log(u ? '✅ Usuario existe' : '❌ No existe')).catch(e => console.error(e)).finally(() => process.exit())"
```

**2. Crear usuario admin manualmente (sin borrar datos):**
```bash
# En Render Shell del backend
node -e "const {User} = require('./models'); User.create({email: 'admin@studio.com', password: 'Admin123!', firstName: 'Admin', lastName: 'User', role: 'admin', isActive: true}).then(() => console.log('✅ Admin creado')).catch(err => console.error('❌', err.message)).finally(() => process.exit())"
```

**3. Activar usuario admin si está inactivo:**
```bash
# En Render Shell del backend
node -e "const {User} = require('./models'); User.update({isActive: true}, {where: {email: 'admin@studio.com'}}).then(() => console.log('✅ Activado')).catch(e => console.error(e)).finally(() => process.exit())"
```

**4. Verificar conexión a base de datos:**
```bash
# En Render Shell del backend
node -e "const {sequelize} = require('./models'); sequelize.authenticate().then(() => console.log('✅ DB conectada')).catch(err => console.error('❌', err.message)).finally(() => process.exit())"
```

---

## 🚨 Si nada funciona - Reset Completo

⚠️ **ADVERTENCIA:** Esto borra TODA la base de datos

```bash
# En Render Shell del backend
node scripts/setupDatabase.js
```

---

## 📋 Checklist Rápido

```
Backend:
□ Servicio creado y "Live" (verde)
□ DATABASE_URL configurado
□ JWT_SECRET configurado (32+ caracteres)
□ CLIENT_URL configurado (después de crear frontend)
□ setupDatabase.js ejecutado exitosamente
□ URL del backend copiada

Frontend:
□ Servicio creado y "Live" (verde)
□ REACT_APP_API_URL configurado con /api al final
□ Build completado sin errores
□ URL del frontend copiada
□ CLIENT_URL actualizado en backend

Verificación:
□ Puedo acceder a /admin/login
□ Puedo hacer login con admin@studio.com
□ Aparece el dashboard después de login
□ No hay errores CORS en la consola (F12)
□ Calendario público carga correctamente
```

---

## 💡 Generar JWT_SECRET

En tu Mac:
```bash
openssl rand -hex 32
```

Ejemplo de resultado:
```
f3148984393d7264c9d33a16687dfbe102917dc2083a9326db123adda6699b80
```

Copia ese resultado y úsalo como `JWT_SECRET`

---

## 🔗 URLs Importantes

Después del deploy, tendrás 3 URLs:

1. **Database:** `postgresql://user:pass@host.render.com/db` (interno)
2. **Backend API:** `https://csbooking-api-xxxx.onrender.com`
3. **Frontend:** `https://csbooking-frontend-xxxx.onrender.com`

---

## ⏰ Tiempos Estimados

- Database: 2-3 minutos
- Backend: 3-5 minutos (primer deploy)
- Frontend: 3-5 minutos (primer build)
- **Total:** ~10-15 minutos

---

## 🎯 Orden de Ejecución

1. ✅ Crear base de datos → Esperar → Copiar URL
2. ✅ Crear backend → Configurar variables → Deploy → Ejecutar setupDatabase.js
3. ✅ Crear frontend → Configurar REACT_APP_API_URL → Deploy
4. ✅ Actualizar CLIENT_URL en backend
5. ✅ Probar login
6. ✅ Completar setup wizard
7. ✅ Configurar horarios
8. ✅ ¡Listo! 🎉

---

## 📞 Soporte

Si algo falla:
1. Revisa los **Logs** del servicio en Render
2. Abre **F12** en el navegador para ver errores
3. Ejecuta los comandos de troubleshooting
4. Comparte el error exacto que ves
