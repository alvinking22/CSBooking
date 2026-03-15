# CLAUDE.md — CSBooking Next

## Proyecto

Sistema de reservas para estudios de grabación. Next.js 16 App Router con panel admin y flujo público de booking.

## Stack

- **Framework**: Next.js 16 · React 19 · TypeScript (strict)
- **Estilos**: Tailwind CSS v4 (OKLCH) · shadcn/ui · Radix UI · Lucide icons
- **DB**: Neon PostgreSQL vía Prisma 7 (serverless adapter)
- **Auth**: next-auth v5 beta (JWT, Credentials provider)
- **Validación**: Zod
- **Fuentes**: Geist Sans + Mono
- **Email**: resend + react-email
- **Charts**: recharts (lazy-loaded)
- **Notificaciones**: react-hot-toast

## Comandos

```bash
npm run dev        # Servidor de desarrollo
npm run build      # prisma generate && next build
npm run start      # Producción
```

## Estructura del Proyecto

```
src/
├── actions/        # Server actions ("use server") — lógica de negocio
├── app/            # App Router: rutas, layouts, páginas
│   ├── admin/      # Panel administrativo (protegido por auth)
│   ├── api/        # API routes (auth, config, bookings)
│   ├── booking/    # Página pública de reservas
│   └── login/      # Autenticación
├── components/
│   ├── admin/      # Componentes del admin (AdminLayout, etc.)
│   ├── booking/    # Flujo de booking público
│   ├── common/     # Componentes compartidos
│   └── ui/         # shadcn/ui (badge, button, dialog, etc.)
├── contexts/       # ConfigContext (theming dinámico)
├── lib/            # Utilidades core
│   ├── auth.ts     # Configuración NextAuth
│   ├── config.ts   # getPublicConfig() con React.cache()
│   ├── prisma.ts   # Cliente Prisma con Neon adapter
│   ├── utils.ts    # cn() + hexToForeground()
│   └── serialize.ts # Prisma Decimal → number
├── types/          # Tipos TypeScript compartidos
└── proxy.ts        # Middleware (auth + routing por rol)
```

## Convenciones de Código

### Imports

- Path alias: `@/*` → `./src/*` — usar siempre en lugar de rutas relativas largas
- Componentes UI: `import { Button } from "@/components/ui/button"`

### Color de Marca Dinámico (`pc`)

Todos los componentes admin usan el color primario dinámico. Seguir este patrón exacto:

```tsx
const { config } = useConfig();
const pc = config?.primaryColor || "#3B82F6";

// Aplicar en estilos inline
style={{ color: pc }}
style={{ background: `${pc}12` }}  // Con opacidad hex
style={{ borderColor: pc }}
```

NO usar clases de Tailwind para el color primario — siempre `style` con `pc`.

### Server Actions

- Ubicarlas en `src/actions/` con `"use server"` al inicio
- Siempre validar auth: `requireAuth()` o `requireAdmin()`
- Validar inputs con Zod antes de procesar
- Serializar con `serializePrisma()` antes de retornar al cliente
- Revalidar paths después de mutaciones: `revalidatePath("/admin/...")`

### Componentes

- Páginas admin: `NombreClient.tsx` como Client Component, `page.tsx` como Server Component
- Empty states: icono con fondo `${pc}12` + texto descriptivo
- Tablas: incluir color indicator del estudio (`w-1 h-10 rounded-full`)
- Lazy loading para componentes pesados: `dynamic(() => import(...), { ssr: false })`

### Base de Datos

- Fechas de sesión: `DateTime @db.Date` (solo fecha, sin hora)
- Horarios: `String @db.VarChar(5)` formato `"HH:mm"`
- Precios: `Decimal(10, 2)` — convertir con `serializePrisma()` antes de pasar a cliente
- JSON fields para datos flexibles: `availableHours`, `blockedDates`, `specifications`

### Estilos

- Usar `cn()` de `@/lib/utils` para combinar clases (clsx + tailwind-merge)
- Colores del sistema en OKLCH via CSS variables (ver `globals.css`)
- Badge variants: `default | success | warning | danger | info | muted | orange | outline`
- `hexToForeground(hex)` para calcular texto blanco/oscuro según contraste WCAG

## Autenticación y Roles

- **ADMIN**: Acceso completo a todas las rutas `/admin/*`
- **STAFF**: Solo acceso a `/admin/calendar` y `/admin/bookings/[id]`
- Middleware en `src/proxy.ts` controla acceso en Edge Runtime
- Auth config separado en `src/lib/auth.config.ts` para compatibilidad Edge

## Reglas Importantes

1. **No modificar** `src/generated/` — es auto-generado por Prisma
2. **Siempre usar `serializePrisma()`** al pasar datos de Prisma a Client Components
3. **Idioma de la UI**: Español (labels, mensajes, placeholders)
4. **Date-fns locale**: Siempre usar `{ locale: es }` para formateo de fechas
5. **No instalar ESLint/Prettier** — el proyecto usa los defaults de Next.js
6. **Prisma migrations**: Usar `DIRECT_URL` (no pooler) — configurado en `prisma.config.ts`
7. **Variables de entorno**: Nunca commitear `.env` — contiene secrets de Neon, NextAuth, Resend
8. **Imágenes remotas**: Solo permitidas desde `*.public.blob.vercel-storage.com`

## Testing y Verificación

- Correr `npm run build` para verificar errores de TypeScript y compilación
- Probar flujo de booking público en `/`
- Probar panel admin en `/admin/dashboard` (login: admin@studio.com / Admin123!)
- Verificar que los Server Actions retornan datos serializados correctamente
