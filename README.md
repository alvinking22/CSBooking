# 🎬 Studio Booking App - Sistema de Reservas para Estudio de Grabación

Sistema completo de reservas online para estudios de grabación, podcast y contenido digital.

## 🚀 Características

### Para Clientes:
- ✅ Reserva de espacios por fecha y hora
- ✅ Personalización del set de grabación
- ✅ Cálculo automático de precios
- ✅ Confirmación por email
- ✅ Interfaz responsive (móvil, tablet, desktop)

### Para Administradores:
- ✅ Wizard de configuración inicial
- ✅ Panel de administración completo
- ✅ Gestión de reservas (confirmar, modificar, cancelar)
- ✅ Configuración de horarios y precios
- ✅ Gestión de equipos y elementos del set
- ✅ Registro de pagos
- ✅ Preparado para integración con Azul (pasarela de pago)

## 🛠️ Stack Tecnológico

**Frontend:**
- React 18
- Tailwind CSS
- React Router
- Axios
- React Calendar
- React Hook Form

**Backend:**
- Node.js
- Express
- PostgreSQL
- JWT Authentication
- Nodemailer (emails)
- Multer (upload de imágenes)

## 📦 Instalación

### Requisitos Previos:
- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone <tu-repo>
cd studio-booking-app
```

### 2. Instalar dependencias del servidor
```bash
cd server
npm install
```

### 3. Instalar dependencias del cliente
```bash
cd ../client
npm install
```

### 4. Configurar variables de entorno

Crear archivo `.env` en la carpeta `server`:
```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/studio_booking

# JWT
JWT_SECRET=tu_secret_key_muy_segura_aqui

# Email (Gmail)
EMAIL_USER=tuemail@gmail.com
EMAIL_PASS=tu_app_password

# Puerto
PORT=5000

# URL del cliente (para CORS)
CLIENT_URL=http://localhost:3000
```

Crear archivo `.env` en la carpeta `client`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Inicializar la base de datos
```bash
cd server
npm run db:setup
```

### 6. Iniciar el servidor (desarrollo)
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🚀 Despliegue en Producción

### Opción 1: Railway (Recomendada)

1. Crear cuenta en [Railway.app](https://railway.app)
2. Conectar tu repositorio de GitHub
3. Agregar PostgreSQL desde Railway
4. Configurar variables de entorno
5. Deploy automático

### Opción 2: Render

1. Crear cuenta en [Render.com](https://render.com)
2. Crear PostgreSQL database
3. Crear Web Service para el backend
4. Crear Static Site para el frontend
5. Configurar variables de entorno

### Opción 3: VPS (DigitalOcean, AWS, etc)

Ver guía detallada en `docs/DEPLOYMENT.md`

## 📁 Estructura del Proyecto

```
studio-booking-app/
├── client/                 # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── contexts/      # Context API
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API calls
│   │   ├── utils/         # Utilidades
│   │   └── App.jsx
│   └── package.json
│
├── server/                # Backend Node.js
│   ├── config/           # Configuraciones
│   ├── controllers/      # Lógica de negocio
│   ├── models/           # Modelos de base de datos
│   ├── routes/           # Rutas de la API
│   ├── middleware/       # Middleware personalizado
│   ├── utils/            # Utilidades
│   ├── server.js         # Punto de entrada
│   └── package.json
│
├── docs/                 # Documentación adicional
└── README.md
```

## 🔐 Usuario Administrador por Defecto

Al inicializar la base de datos, se crea un usuario admin:
- **Email:** admin@studio.com
- **Password:** Admin123!

⚠️ **IMPORTANTE:** Cambia estas credenciales inmediatamente después del primer login.

## 📧 Configuración de Emails

### Gmail:
1. Habilitar "Verificación en 2 pasos" en tu cuenta de Gmail
2. Generar "Contraseña de aplicación" en configuración de Google
3. Usar esa contraseña en `EMAIL_PASS`

### Otro proveedor SMTP:
Modificar la configuración en `server/config/email.js`

## 🎨 Personalización

### Colores y Branding:
Todo se configura desde el panel de administración en "Mi Negocio"

### Modificar código:
- Estilos: `client/src/index.css` y componentes con Tailwind
- Lógica de negocio: `server/controllers/`
- Base de datos: `server/models/`

## 🐛 Solución de Problemas

### Error de conexión a la base de datos:
- Verificar que PostgreSQL está corriendo
- Verificar credenciales en `.env`
- Verificar que la base de datos existe

### Error de CORS:
- Verificar que `CLIENT_URL` en `.env` del servidor coincida con la URL del frontend