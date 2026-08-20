# 01 — Autenticación

La autenticación la maneja **Better Auth 1.6.30** montado como middleware en `/api/auth/*`. Los endpoints de dominio (NestJS) validan la sesión con su propio guard.

## Flujo básico (SPA recomendado)

```
1. POST /api/auth/sign-up/email      → registrar (opcional, rol member por defecto)
2. POST /api/auth/sign-in/email      → login → { user, session }
3. Guarda session.token              → úsalo como Authorization: Bearer <token>
4. GET /auth/me                      → perfil actual (id, email, role, ...)
5. POST /api/auth/sign-out           → logout
```

> **Importante:** `session.token` **es** el token Bearer. No es un JWT: la API lo valida buscándolo en la tabla `session` (con `expiresAt > now()`). Mientras no caduque, funciona.

## Login

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{ "email": "admin@test.com", "password": "TuPassword" }
```

Respuesta:
```json
{
  "user": { "id": "32charshex...", "name": "...", "email": "...", "role": "admin", "banned": false },
  "session": { "id": "...", "token": "TOKEN_RAW_32CHARS", "userId": "...", "expiresAt": "..." }
}
```

Guarda `session.token` (localStorage o memory) y envíalo en cada request:

```http
Authorization: Bearer TOKEN_RAW_32CHARS
```

## Registro

```http
POST /api/auth/sign-up/email
Content-Type: application/json

{ "name": "Juan Pérez", "email": "juan@test.com", "password": "password123" }
```

- Crea el usuario con rol **`member`** por defecto.
- `password`: mínimo 8 caracteres.
- Para crear usuarios con rol específico desde el panel, usa `POST /users` (admin, ver `03-users.md`).

## Dos modos de autenticación

| Modo | Cómo | Uso recomendado |
|---|---|---|
| **Bearer** | Header `Authorization: Bearer <session.token>` | SPA con `localStorage` |
| **Cookie** | Cookie `better-auth.session_token` + `credentials: 'include'` | Apps que prefieren cookies |

Ambos funcionan en todos los endpoints de dominio. El guard normaliza el header (tolera `Bearer Bearer <t>`), así que siempre envía un solo `Bearer `.

## Endpoints de auth (todos bajo `/api/auth`, públicos)

| Método | Ruta | Body | Uso |
|---|---|---|---|
| POST | `/api/auth/sign-up/email` | `{ name, email, password }` | Registro |
| POST | `/api/auth/sign-in/email` | `{ email, password }` | Login → `{ user, session }` |
| POST | `/api/auth/sign-out` | — | Logout (requiere sesión) |
| GET | `/api/auth/get-session` | — | Sesión actual (solo cookie) |
| POST | `/api/auth/update-user` | `{ name?, image? }` | Actualizar perfil propio |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` | Cambiar contraseña |
| POST | `/api/auth/change-email` | `{ newEmail }` | Cambiar email |
| POST | `/api/auth/request-password-reset` | `{ email }` | Solicitar reset |
| POST | `/api/auth/reset-password` | `{ newPassword, token }` | Reset con token |

**Endpoints del plugin admin** (requieren rol `admin` en la sesión; la API Nest los usa internamente):

| Método | Ruta |
|---|---|
| POST | `/api/auth/admin/create-user` |
| POST | `/api/auth/admin/list-users` |
| POST | `/api/auth/admin/get-user` |
| POST | `/api/auth/admin/update-user` |
| POST | `/api/auth/admin/set-role` |
| POST | `/api/auth/admin/ban-user` / `unban-user` |
| POST | `/api/auth/admin/remove-user` |
| POST | `/api/auth/admin/list-user-sessions` / `revoke-user-session` / `revoke-user-sessions` |
| POST | `/api/auth/admin/set-user-password` |
| POST | `/api/auth/admin/impersonate-user` / `stop-impersonating` |

> Para el frontend es más simple usar los endpoints Nest del módulo Users (`/users/*`) que encapsulan al plugin admin.

## Perfil actual

```http
GET /auth/me
Authorization: Bearer <token>
```

Respuesta:
```json
{
  "data": {
    "id": "32charshex",
    "name": "Admin",
    "email": "admin@test.com",
    "emailVerified": false,
    "image": null,
    "role": "admin",
    "banned": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Úsalo al cargar la app para restaurar la sesión (validar token guardado) y conocer el `role`.

## Roles y permisos

Roles (campo `user.role`, lowercase): `admin`, `trainer`, `receptionist`, `member`.

| Rol | Capacidades generales |
|---|---|
| **admin** | Todo: CRUD completo, usuarios, reportes |
| **trainer** | Lee members/memberships/attendance/trainers; CRUD de exercises y routines (solo las suyas); **sin** payments ni reports |
| **receptionist** | CRUD members/memberships; crear/leer payments; check-in/out + leer attendance; **sin** routines (403) ni reports... ver `12-reports.md` (sí tiene reports) |
| **member** | Solo lectura de sus propios datos (members, memberships, payments, attendance, routines) + check-in/out propio + notificaciones |

> Detalle por endpoint en cada documento de módulo (columna **Roles**).

### Acceso controlado (Better Auth admin plugin)

La config de permisos vive en `src/auth/permissions.ts` (`createAccessControl` + `ac.newRole`) y se pasa al plugin `admin` en `src/auth/auth.ts`. Estos permisos los evalúa **el plugin admin de Better Auth** (`/api/auth/admin/*`) y por tanto aplican a los endpoints del módulo Users que lo encapsulan (`/users/*`).

#### ⚠️ Regla de oro: el recurso es `user` (singular), NO `users`

El plugin admin de Better Auth verifica permisos sobre el recurso **`user` (en singular)**. Internamente cada endpoint admin pide algo como:

```ts
// node_modules/better-auth/dist/plugins/admin/routes.mjs
permissions: { user: ["create"] }   // ← recurso "user", acción "create"
```

Y luego `hasPermission` hace `roles[rol].authorize({ user: ["create"] })`. Si el rol no declara el recurso `user`, la autorización **falla y devuelve 403** aunque el rol sea `admin` y aunque el statement declare un recurso `users` (plural).

**Qué pasó en este proyecto (bug corregido):** `permissions.ts` solo declaraba `users: ['create', 'read', ...]` (plural). `POST /users` con cuenta admin devolvía:

```json
{ "statusCode": 403, "message": "You are not allowed to create users" }
```

porque el plugin admin pedía `user: ["create"]` y el rol `admin` no tenía nada declarado sobre el recurso `user`. El guard de NestJS (`RolesGuard`) **no** era el problema: ese sí veía el rol `admin`.

**La corrección** fue agregar el recurso `user` (singular) al statement y a los roles. Acciones disponibles del plugin admin y qué endpoint las exige:

| Acción | Endpoint admin que la exige |
|---|---|
| `create` | `POST /api/auth/admin/create-user` |
| `get` | `get-user` |
| `list` | `list-users` |
| `update` | `update-user` |
| `delete` | `remove-user` |
| `ban` | `ban-user` / `unban-user` |
| `set-role` | `set-role` (y `create-user` si se envía `role` en el body) |
| `set-email` | `update-user` (al cambiar email) |
| `set-password` | `set-user-password` |

Permisos actuales por rol (declarados en `permissions.ts`):

| Rol | `user` (admin plugin) | Otros recursos |
|---|---|---|
| **admin** | `create, get, list, update, delete, ban, set-role, set-email, set-password` | CRUD completo del resto |
| **receptionist** | `get, list` | CRUD members/memberships, payments, attendance |
| **trainer** | — | read de members/memberships/attendance/trainers; CRUD exercises/routines |
| **member** | — | solo lectura de lo propio |

#### ¿El recurso `users` (plural) sirve para algo?

**No.** El plugin admin nunca lo consulta: solo usa `user`, `session`, `account`, `verification`. El recurso `users` (plural) que quedó en `permissions.ts` es una referencia muerta del dominio de la app. Puedes:

- **Dejarlo** → no afecta nada (estado actual).
- **Borrar sus 2 líneas** (statement + rol admin) → tampoco afecta nada; es seguro eliminarlo.

> Si algún día ves `403 "You are not allowed to ..."` en `/users/*` con una cuenta admin, revisa primero que el rol correspondiente tenga declarada la acción sobre el recurso **`user`** en `permissions.ts`.

## Notas técnicas (para entender límites)

- El token Bearer se valida contra la tabla `session` (`token` + `expiresAt > now()`). Una sesión expirada da **401**.
- `GET /api/auth/get-session` y las cookies requieren `credentials: 'include'` en el fetch.
- La cookie se llama `better-auth.session_token` y está firmada — no intentes manipularla.
- Un usuario baneado no puede usar los endpoints admin de Better Auth, pero el guard de la API no lo bloquea (revisa `banned` en `/auth/me` si necesitas restringir UI).

## Errores típicos

| Situación | Respuesta |
|---|---|
| Credenciales incorrectas | 401 |
| Password < 8 chars | 400 (validación) |
| Token expirado/inválido | 401 `No autenticado` |
| Sin token en endpoint protegido | 401 `No autenticado` |
| Rol sin permiso | 403 `No tienes permisos para acceder a este recurso` |
| `403 You are not allowed to create users` (con cuenta admin) | El rol no tiene `user: ['create']` en `permissions.ts` (recurso singular). Ver sección "Acceso controlado". |