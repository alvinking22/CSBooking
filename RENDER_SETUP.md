# Solución de Problemas en Render

## Problema 1: No puedo acceder al panel de admin

La base de datos en Render necesita ser inicializada con el usuario admin.

### Solución - Ejecutar setupDatabase en Render:

1. **Ve a tu servicio en Render Dashboard**
2. **Ve a la pestaña "Shell"** (o accede por SSH)
3. **Ejecuta el script de inicialización:**
   ```bash
   cd server
   node scripts/setupDatabase.js
   ```

Esto creará:
- ✅ Usuario admin: `admin@studio.com` / `Admin123!`
- ✅ Configuración inicial del negocio

**⚠️ IMPORTANTE:** Este comando borra todas las tablas y las recrea. Solo úsalo si la base de datos está vacía o si quieres reiniciarla.

---

## Problema 2: No aparecen horarios disponibles

El calendario necesita que configures los horarios de operación.

### Solución - Configurar horarios:

1. **Inicia sesión en el panel admin** con `admin@studio.com` / `Admin123!`

2. **Ve a Configuración** (Settings)

3. **Completa el "Setup Wizard"** o ve a la sección de horarios

4. **Configura los horarios de operación** para cada día:
   ```
   Ejemplo:
   - Lunes a Viernes: 9:00 AM - 6:00 PM (habilitado ✓)
   - Sábado: 10:00 AM - 2:00 PM (habilitado ✓)
   - Domingo: Cerrado (deshabilitado)
   ```

5. **Guarda los cambios**

Una vez configurados los horarios, el calendario público mostrará los slots disponibles.

---

## Variables de Entorno Importantes en Render

Asegúrate de tener estas variables configuradas en Render:

### Variables Requeridas:
```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=<tu-secreto-aleatorio-largo>
PORT=5001
NODE_ENV=production
CLIENT_URL=<tu-url-de-frontend-en-render>
```

### Variables Opcionales (Email):
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<tu-email>
EMAIL_PASSWORD=<tu-app-password>
```

---

## Verificación Paso a Paso

### 1. Verificar Base de Datos:
```bash
# En Render Shell
cd server
node -e "require('./models').syncDatabase().then(() => console.log('DB OK'))"
```

### 2. Verificar Usuario Admin existe:
Intenta hacer login en `/admin/login` con:
- Email: `admin@studio.com`
- Password: `Admin123!`

### 3. Verificar Configuración:
Una vez dentro del admin, ve a Settings y verifica:
- ✅ Nombre del negocio configurado
- ✅ Tarifa por hora configurada
- ✅ Horarios de operación configurados (al menos un día habilitado)
- ✅ "Setup Completed" marcado como completado

### 4. Verificar Horarios Públicos:
- Ve a la página pública de booking
- Selecciona una fecha dentro de un día habilitado
- Deberían aparecer los slots de tiempo disponibles

---

## Troubleshooting

### "No aparecen slots incluso después de configurar horarios"

Revisa la consola del navegador (F12). Si ves errores de CORS:

1. En Render, verifica que `CLIENT_URL` apunte a tu frontend correcto
2. Ejemplo: `CLIENT_URL=https://tu-app.onrender.com`

### "Error 401 al intentar acceder al admin"

1. Verifica que el JWT_SECRET en Render sea el mismo que usaste localmente
2. O cierra sesión y vuelve a iniciar sesión
3. O genera un nuevo JWT_SECRET y vuelve a hacer login

### "Base de datos no se conecta"

1. Verifica que Render haya creado la base de datos PostgreSQL
2. Copia el DATABASE_URL correcto desde Render Database dashboard
3. Pégalo en las variables de entorno del servicio web

---

## Comandos Útiles en Render Shell

```bash
# Ver logs del servidor
npm run dev

# Reiniciar base de datos (⚠️ borra todo)
node scripts/setupDatabase.js

# Verificar conexión a base de datos
node -e "const {sequelize} = require('./models'); sequelize.authenticate().then(() => console.log('Connected')).catch(err => console.error(err))"

# Ver variables de entorno
env | grep -E 'DATABASE|JWT|PORT'
```

---

## Checklist Final

- [ ] Base de datos PostgreSQL creada en Render
- [ ] DATABASE_URL configurado correctamente
- [ ] JWT_SECRET configurado (mínimo 32 caracteres)
- [ ] Script setupDatabase.js ejecutado
- [ ] Login admin funciona (admin@studio.com / Admin123!)
- [ ] Horarios de operación configurados en Settings
- [ ] Setup Wizard completado
- [ ] CLIENT_URL apunta al frontend correcto
- [ ] Calendario público muestra horarios disponibles

---

## Próximos Pasos Recomendados

Una vez que todo funcione:

1. **Cambiar contraseña admin** (Settings → Perfil → Cambiar Contraseña)
2. **Configurar emails** (para notificaciones de reservas)
3. **Personalizar negocio** (nombre, teléfono, colores)
4. **Agregar equipamiento** (Settings → Equipment)
5. **Probar una reserva** desde la página pública

---

¿Necesitas ayuda con alguno de estos pasos? Déjame saber qué error específico ves.
