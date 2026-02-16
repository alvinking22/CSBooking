# 🚀 Guía Completa de Instalación en Render

Esta guía te llevará paso a paso para desplegar **CS Booking** en Render correctamente.

---

## 📋 Prerequisitos

- Cuenta de GitHub con el repositorio CSBooking
- Cuenta de Render (gratis): https://render.com

---

## Parte 1: Preparar el Proyecto Localmente

### 1.1 Crear archivo de configuración para Render

Crea un archivo llamado `render.yaml` en la raíz del proyecto:

```bash
cd /Users/alvinking/Desktop/CSBooking
```

Crea el archivo con el siguiente contenido (te lo crearé después):

```yaml
services:
  # Backend API
  - type: web
    name: csbooking-api
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRE
        value: 7d
      - key: DATABASE_URL
        fromDatabase:
          name: csbooking-db
          property: connectionString
      - key: CLIENT_URL
        sync: false
      - key: EMAIL_HOST
        value: smtp.gmail.com
      - key: EMAIL_PORT
        value: 587

  # Frontend
  - type: web
    name: csbooking-frontend
    env: static
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: ./client/build
    envVars:
      - key: REACT_APP_API_URL
        sync: false

databases:
  - name: csbooking-db
    databaseName: cs_booking
    user: csbooking
```

### 1.2 Actualizar package.json del servidor

Asegúrate de que `server/package.json` tenga el script de start correcto:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### 1.3 Crear archivo para el cliente que maneje el routing

Crea `client/public/_redirects` para que React Router funcione:

```
/*    /index.html   200
```

### 1.4 Commit y push a GitHub

```bash
git add .
git commit -m "Configuración para deploy en Render"
git push origin main
```

---

## Parte 2: Crear la Base de Datos en Render

### 2.1 Acceder a Render Dashboard

1. Ve a https://dashboard.render.com
2. Inicia sesión con tu cuenta

### 2.2 Crear PostgreSQL Database

1. Haz clic en **"New +"** → **"PostgreSQL"**
2. Configura:
   - **Name:** `csbooking-db`
   - **Database:** `cs_booking`
   - **User:** `csbooking` (o déjalo automático)
   - **Region:** Elige la más cercana (ej: Oregon USA)
   - **Plan:** **Free** (suficiente para empezar)
3. Haz clic en **"Create Database"**
4. ⏳ Espera 2-3 minutos a que se cree

### 2.3 Copiar DATABASE_URL

1. Una vez creada, ve a la página de la base de datos
2. Busca **"Internal Database URL"** o **"External Database URL"**
3. Haz clic en **"Copy"** para copiar la URL
4. Se verá así:
   ```
   postgresql://user:password@hostname.region.render.com/database
   ```
5. **Guarda esta URL**, la necesitarás después

---

## Parte 3: Desplegar el Backend (API)

### 3.1 Crear Web Service para el Backend

1. En Render Dashboard, haz clic en **"New +"** → **"Web Service"**
2. Conecta con GitHub:
   - Si es primera vez, autoriza Render a acceder a tus repos
   - Busca y selecciona **"CSBooking"**
3. Haz clic en **"Connect"**

### 3.2 Configurar el Backend

**Configuración básica:**
- **Name:** `csbooking-api` (o el nombre que prefieras)
- **Region:** La misma que la base de datos
- **Branch:** `main`
- **Root Directory:** `server`
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** **Free**

### 3.3 Configurar Variables de Entorno

Haz scroll hasta **"Environment Variables"** y agrega:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | `[genera uno aleatorio]` ⚠️ Ver nota abajo |
| `JWT_EXPIRE` | `7d` |
| `DATABASE_URL` | `[pega la URL que copiaste en 2.3]` |
| `CLIENT_URL` | `https://csbooking-frontend.onrender.com` ⚠️ Ver nota abajo |
| `EMAIL_HOST` | `smtp.gmail.com` (opcional) |
| `EMAIL_PORT` | `587` (opcional) |
| `EMAIL_USER` | Tu email (opcional) |
| `EMAIL_PASSWORD` | Tu app password (opcional) |

**⚠️ NOTAS IMPORTANTES:**

**JWT_SECRET:** Genera uno aleatorio con este comando (en tu Mac):
```bash
openssl rand -hex 32
```
Copia el resultado y úsalo como valor.

**CLIENT_URL:**
- Si aún no has creado el frontend, usa un placeholder: `https://placeholder.com`
- Lo actualizaremos después con la URL real del frontend

### 3.4 Crear el Servicio

1. Haz clic en **"Create Web Service"**
2. ⏳ Espera 3-5 minutos a que se despliegue
3. Verás logs en tiempo real

### 3.5 Verificar que el Backend está corriendo

Una vez que termine el deploy:
1. Copia la URL del backend (ej: `https://csbooking-api.onrender.com`)
2. Ábrela en el navegador, deberías ver algo como:
   ```json
   {"message": "CS Booking API is running"}
   ```
   O un error 404 (normal si no hay ruta raíz definida)
3. Prueba la ruta de salud: `https://tu-backend.onrender.com/api/health`

### 3.6 Inicializar la Base de Datos

1. En la página de tu servicio backend, ve a **"Shell"** (pestaña superior)
2. Espera a que se abra la terminal
3. Ejecuta:
   ```bash
   node scripts/setupDatabase.js
   ```
4. Deberías ver:
   ```
   ✅ Database schema created
   ✅ Default admin user created
      Email: admin@studio.com
      Password: Admin123!
   ✅ Default business configuration created
   🎉 Database setup completed successfully!
   ```

**⚠️ Si hay error:** Verifica que `DATABASE_URL` esté correctamente configurado en las variables de entorno.

---

## Parte 4: Desplegar el Frontend

### 4.1 Crear Web Service para el Frontend

1. En Render Dashboard, haz clic en **"New +"** → **"Static Site"**
2. Conecta con GitHub:
   - Selecciona **"CSBooking"** otra vez
3. Haz clic en **"Connect"**

### 4.2 Configurar el Frontend

**Configuración básica:**
- **Name:** `csbooking-frontend` (o el nombre que prefieras)
- **Region:** La misma que el backend
- **Branch:** `main`
- **Root Directory:** `client`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `build`

### 4.3 Configurar Variables de Entorno

En **"Environment Variables"** agrega:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://csbooking-api.onrender.com/api` ⚠️ |

**⚠️ IMPORTANTE:**
- Usa la URL REAL de tu backend (la que copiaste en 3.5)
- **Debe terminar en `/api`**
- Ejemplo: `https://csbooking-api-xxxx.onrender.com/api`

### 4.4 Crear el Servicio

1. Haz clic en **"Create Static Site"**
2. ⏳ Espera 3-5 minutos a que se despliegue
3. Verás logs del build

### 4.5 Verificar que el Frontend está corriendo

Una vez que termine el deploy:
1. Copia la URL del frontend (ej: `https://csbooking-frontend.onrender.com`)
2. Ábrela en el navegador
3. Deberías ver la página de reservas del estudio

---

## Parte 5: Conectar Frontend y Backend (CORS)

### 5.1 Actualizar CLIENT_URL en el Backend

1. Ve a tu servicio **backend** en Render
2. Ve a **"Environment"** (en el menú lateral)
3. Busca la variable `CLIENT_URL`
4. Cámbiala a la URL REAL de tu frontend:
   ```
   https://csbooking-frontend.onrender.com
   ```
   (usa tu URL real, sin `/` al final)
5. Haz clic en **"Save Changes"**
6. El servicio se reiniciará automáticamente

### 5.2 Verificar la conexión

1. Abre tu frontend: `https://csbooking-frontend.onrender.com`
2. Abre la consola del navegador (F12)
3. No deberías ver errores CORS
4. El calendario debería cargar (aunque sin horarios aún)

---

## Parte 6: Configuración Inicial del Sistema

### 6.1 Acceder al Panel de Admin

1. Ve a: `https://tu-frontend.onrender.com/admin/login`
2. Ingresa las credenciales:
   - **Email:** `admin@studio.com`
   - **Password:** `Admin123!`
3. Haz clic en **"Iniciar Sesión"**

### 6.2 Completar el Setup Wizard

Si aparece el Setup Wizard:

1. **Paso 1 - Información del Negocio:**
   - Nombre: `Tu Estudio de Grabación`
   - Email: Tu email de contacto
   - Teléfono: Tu teléfono
   - Dirección: Tu dirección (opcional)

2. **Paso 2 - Configuración de Precios:**
   - Tarifa por hora: `50` (USD o tu moneda)
   - Duración mínima: `1` hora
   - Duración máxima: `8` horas
   - Tiempo de buffer: `30` minutos
   - Requiere depósito: `Sí` o `No` (a tu elección)
   - Si sí: Tipo `Porcentaje` → `50%`

3. **Paso 3 - Horarios de Operación:**
   Configura los días y horarios, ejemplo:
   ```
   Lunes:    ✓ Habilitado   09:00 - 18:00
   Martes:   ✓ Habilitado   09:00 - 18:00
   Miércoles: ✓ Habilitado   09:00 - 18:00
   Jueves:   ✓ Habilitado   09:00 - 18:00
   Viernes:  ✓ Habilitado   09:00 - 18:00
   Sábado:   ✓ Habilitado   10:00 - 14:00
   Domingo:  ✗ Cerrado
   ```

4. **Paso 4 - Colores y Marca:**
   - Color primario: `#3B82F6` (azul por defecto)
   - Color secundario: `#1E40AF` (azul oscuro)
   - Logo: Sube tu logo (opcional)

5. Haz clic en **"Completar Setup"**

### 6.3 Cambiar la Contraseña del Admin

**MUY IMPORTANTE - Hazlo ahora:**

1. En el panel de admin, ve a **Settings (Configuración)**
2. Ve a la pestaña **"Perfil"** o **"Profile"**
3. Busca **"Cambiar Contraseña"**
4. Ingresa:
   - Contraseña actual: `Admin123!`
   - Nueva contraseña: Tu contraseña segura
   - Confirmar contraseña: Tu contraseña segura
5. Haz clic en **"Cambiar Contraseña"**

---

## Parte 7: Verificación Final

### 7.1 Probar el Sistema Completo

#### Prueba 1: Página Pública
1. Ve a tu frontend: `https://tu-frontend.onrender.com`
2. Verifica:
   - ✅ Se carga la página
   - ✅ El calendario aparece
   - ✅ Los días habilitados se pueden seleccionar
   - ✅ Aparecen horarios disponibles cuando seleccionas una fecha
   - ✅ Puedes avanzar por los pasos de reserva

#### Prueba 2: Crear una Reserva de Prueba
1. Selecciona una fecha y hora
2. Completa el formulario con datos de prueba
3. Confirma la reserva
4. Deberías ver un número de reserva (ej: `CS-20250216-001`)

#### Prueba 3: Panel de Admin
1. Ve a `/admin/login`
2. Inicia sesión
3. Verifica:
   - ✅ Dashboard muestra estadísticas
   - ✅ Puedes ver la reserva de prueba en "Reservas"
   - ✅ Puedes acceder a Settings
   - ✅ Puedes agregar equipamiento

---

## 🎉 ¡Listo! Tu sistema está funcionando

### URLs Finales:

- **Frontend (público):** `https://tu-frontend.onrender.com`
- **Admin login:** `https://tu-frontend.onrender.com/admin/login`
- **Backend API:** `https://tu-backend.onrender.com/api`

### Credenciales Admin:
- **Email:** `admin@studio.com` (o el que configuraste)
- **Password:** Tu nueva contraseña segura

---

## 🔧 Solución de Problemas Comunes

### Problema: "No aparecen horarios disponibles"
**Causa:** No has configurado los horarios de operación

**Solución:**
1. Login en admin
2. Settings → Horarios de Operación
3. Habilita al menos un día con horarios

---

### Problema: "CORS Error" en la consola
**Causa:** `CLIENT_URL` mal configurado en el backend

**Solución:**
1. Backend en Render → Environment
2. Verifica `CLIENT_URL` = tu frontend SIN `/` al final
3. Ejemplo: `https://csbooking-frontend.onrender.com`
4. Save changes y espera que se reinicie

---

### Problema: "500 Internal Server Error" al hacer login
**Causa:** Base de datos no inicializada

**Solución:**
1. Backend en Render → Shell
2. Ejecuta: `node scripts/setupDatabase.js`
3. Espera el mensaje de éxito

---

### Problema: El frontend muestra página en blanco
**Causa:** Variable `REACT_APP_API_URL` mal configurada

**Solución:**
1. Frontend en Render → Environment
2. Verifica `REACT_APP_API_URL` termina en `/api`
3. Ejemplo: `https://csbooking-api-xxxx.onrender.com/api`
4. Save changes → Trigger deploy manual

---

### Problema: Backend no se conecta a la base de datos
**Causa:** `DATABASE_URL` incorrecta

**Solución:**
1. Ve a tu PostgreSQL database en Render
2. Copia la "Internal Database URL"
3. Backend → Environment → Pega en `DATABASE_URL`
4. Save changes

---

## 📝 Mantenimiento y Actualizaciones

### Hacer cambios al código:

1. Haz tus cambios localmente
2. Commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push origin main
   ```
3. Render detectará el push y hará auto-deploy
4. Espera 3-5 minutos a que termine

### Ver logs en tiempo real:

1. Ve a tu servicio en Render
2. Click en **"Logs"** (pestaña superior)
3. Verás logs en tiempo real

### Reiniciar servicios manualmente:

1. Ve a tu servicio en Render
2. Click en **"Manual Deploy"** → **"Clear build cache & deploy"**

---

## 💡 Próximos Pasos Recomendados

Una vez que todo funcione:

1. ✅ Personalizar la apariencia (colores, logo)
2. ✅ Agregar equipamiento disponible
3. ✅ Configurar notificaciones por email
4. ✅ Agregar un dominio personalizado (opcional)
5. ✅ Configurar backups de la base de datos

---

## 📞 ¿Necesitas Ayuda?

Si algo no funciona:
1. Revisa los logs del servicio en Render
2. Abre la consola del navegador (F12)
3. Comparte el error exacto que ves
4. Comparte capturas de pantalla si es necesario

---

## 🎯 Checklist de Instalación

Marca cada paso completado:

- [ ] Base de datos PostgreSQL creada
- [ ] DATABASE_URL copiada
- [ ] Backend desplegado y corriendo
- [ ] JWT_SECRET generado y configurado
- [ ] Script setupDatabase.js ejecutado exitosamente
- [ ] Admin user creado (admin@studio.com)
- [ ] Frontend desplegado y corriendo
- [ ] REACT_APP_API_URL configurado correctamente
- [ ] CLIENT_URL actualizado en el backend
- [ ] Login admin funciona
- [ ] Setup Wizard completado
- [ ] Horarios de operación configurados
- [ ] Contraseña admin cambiada
- [ ] Reserva de prueba creada exitosamente
- [ ] Sistema completamente funcional ✅

---

¡Éxito con tu sistema de reservas!
