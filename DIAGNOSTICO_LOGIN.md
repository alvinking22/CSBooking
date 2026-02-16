# Diagnóstico: No puedo iniciar el panel de control

## Pasos para diagnosticar el problema

### 1️⃣ ¿Puedes acceder a la página de login?

**URL esperada:** `https://tu-app.onrender.com/admin/login`

- ✅ **Sí puedo acceder** → Ve al paso 2
- ❌ **No puedo acceder (404 o error)** → Problema de routing o build
  - **Solución:** Verifica que el build del cliente se haya completado correctamente en Render

---

### 2️⃣ ¿Qué sucede cuando intentas hacer login?

Presiona **F12** para abrir la consola del navegador y ve a la pestaña **Network**.

Ingresa las credenciales:
- Email: `admin@studio.com`
- Password: `Admin123!`

Haz clic en **"Iniciar Sesión"** y observa qué pasa:

#### Caso A: Error de red / No hay respuesta del servidor
```
❌ POST https://tu-api.onrender.com/api/auth/login → Failed / ERR_CONNECTION_REFUSED
```

**Problema:** El backend no está corriendo o no está accesible

**Soluciones:**
1. Ve a tu servicio backend en Render Dashboard
2. Verifica que el servicio esté "Live" (verde)
3. Revisa los logs del backend para ver si hay errores
4. Verifica que el `CLIENT_URL` en las variables de entorno del backend incluya tu URL de frontend

---

#### Caso B: Error 500 (Internal Server Error)
```
❌ POST /api/auth/login → 500 Internal Server Error
Response: { "success": false, "message": "Database error" }
```

**Problema:** La base de datos no está conectada o no tiene las tablas

**Soluciones:**

1. **Verifica la conexión a la base de datos:**
   - Ve a Render Dashboard → Tu servicio backend → Shell
   - Ejecuta:
   ```bash
   node -e "const {sequelize} = require('./models'); sequelize.authenticate().then(() => console.log('✅ Conectado')).catch(err => console.error('❌', err))"
   ```

2. **Si la conexión falla:**
   - Verifica que `DATABASE_URL` esté configurado correctamente en las variables de entorno
   - Copia el DATABASE_URL desde el dashboard de tu base de datos PostgreSQL en Render
   - Formato esperado: `postgresql://user:password@host:5432/database`

3. **Si la conexión funciona pero el login falla:**
   - Las tablas no existen → Ejecuta el script de setup:
   ```bash
   cd server
   node scripts/setupDatabase.js
   ```

---

#### Caso C: Error 401 (Unauthorized)
```
❌ POST /api/auth/login → 401 Unauthorized
Response: { "success": false, "message": "Invalid credentials" }
```

**Problema:** El usuario no existe en la base de datos o las credenciales son incorrectas

**Soluciones:**

1. **Crear el usuario admin:**
   - Ve a Render Dashboard → Tu servicio backend → Shell
   - Ejecuta:
   ```bash
   cd server
   node scripts/setupDatabase.js
   ```
   - ⚠️ **IMPORTANTE:** Este comando borra todas las reservas existentes. Si tienes datos importantes, NO lo ejecutes.

2. **Crear usuario admin manualmente sin borrar datos:**
   - Ve a Render Shell y ejecuta:
   ```bash
   cd server
   node -e "const {User} = require('./models'); User.create({email: 'admin@studio.com', password: 'Admin123!', firstName: 'Admin', lastName: 'User', role: 'admin', isActive: true}).then(() => {console.log('✅ Admin creado'); process.exit(0)}).catch(err => {console.error('❌ Error:', err.message); process.exit(1)})"
   ```

---

#### Caso D: Error 401 - "Account is inactive"
```
❌ POST /api/auth/login → 401 Unauthorized
Response: { "success": false, "message": "Account is inactive. Please contact administrator." }
```

**Problema:** El usuario existe pero está desactivado (`isActive = false`)

**Solución:**
```bash
cd server
node -e "const {User} = require('./models'); User.update({isActive: true}, {where: {email: 'admin@studio.com'}}).then(() => {console.log('✅ Usuario activado'); process.exit(0)})"
```

---

#### Caso E: CORS Error
```
❌ Access to XMLHttpRequest at 'https://api.onrender.com/api/auth/login'
   from origin 'https://frontend.onrender.com' has been blocked by CORS policy
```

**Problema:** El backend no está permitiendo requests desde el frontend

**Solución:**
1. Ve a las variables de entorno del backend en Render
2. Asegúrate de que `CLIENT_URL` esté configurado correctamente:
   ```
   CLIENT_URL=https://tu-frontend.onrender.com
   ```
3. **NO incluyas** barra final `/` en la URL
4. Reinicia el servicio backend después de cambiar variables de entorno

---

### 3️⃣ ¿El frontend está apuntando al backend correcto?

**Verifica la variable de entorno del frontend:**

En Render Dashboard → Tu servicio frontend → Environment:

```
REACT_APP_API_URL=https://tu-backend.onrender.com/api
```

**IMPORTANTE:** Debe incluir `/api` al final

Si cambias esta variable:
1. Guarda los cambios
2. Render automáticamente hará un nuevo deploy
3. Espera a que termine el build
4. Prueba nuevamente

---

## Checklist Rápido

Marca cada item que hayas verificado:

### Backend:
- [ ] Servicio backend está "Live" (verde) en Render
- [ ] `DATABASE_URL` está configurado correctamente
- [ ] `JWT_SECRET` está configurado (32+ caracteres)
- [ ] `CLIENT_URL` apunta al frontend correcto (sin `/` al final)
- [ ] `PORT` está configurado (usualmente 5001 o 10000)
- [ ] `NODE_ENV=production`
- [ ] Logs del backend no muestran errores críticos

### Base de Datos:
- [ ] Servicio PostgreSQL está "Available" en Render
- [ ] DATABASE_URL copiado correctamente
- [ ] Script setupDatabase.js ejecutado exitosamente
- [ ] Usuario admin existe (comprobado con el comando)
- [ ] Usuario admin está activo (`isActive = true`)

### Frontend:
- [ ] Servicio frontend está "Live" (verde) en Render
- [ ] `REACT_APP_API_URL` apunta al backend correcto (con `/api`)
- [ ] Puedo acceder a `/admin/login` sin errores
- [ ] No hay errores CORS en la consola del navegador

---

## Comando Todo-en-Uno para Setup Inicial

Si tu base de datos está vacía y quieres hacer el setup completo, ejecuta esto en Render Shell:

```bash
cd server && node scripts/setupDatabase.js
```

Esto creará:
- ✅ Todas las tablas necesarias
- ✅ Usuario admin (admin@studio.com / Admin123!)
- ✅ Configuración inicial del negocio

⚠️ **ADVERTENCIA:** Borra todas las tablas existentes. Solo úsalo en bases de datos vacías o para reiniciar completamente.

---

## ¿Qué información necesito para ayudarte más?

Si ninguna de estas soluciones funciona, comparte:

1. **Captura de pantalla** de la consola del navegador (F12 → Console + Network)
2. **Logs del backend** desde Render (últimas 50 líneas)
3. **Variables de entorno** configuradas (oculta las contraseñas)
4. **Mensaje de error exacto** que ves en pantalla

Con esta información puedo darte una solución más específica.
