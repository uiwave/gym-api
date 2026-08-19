# 00 — Visión General y Convenciones

## Stack del backend

| Componente | Detalle |
|---|---|
| Framework | NestJS 11 (TypeScript estricto) |
| Base de datos | PostgreSQL (driver `pg`, **sin ORM**) |
| Autenticación | Better Auth 1.6.30 (`@thallesp/nestjs-better-auth`) |
| Documentación | Swagger UI en `/api/docs`, JSON en `/api/docs-json` |

## URLs

| Recurso | URL |
|---|---|
| Base | `http://localhost:3000` (configurable con `PORT`) |
| Health check | `GET /health` → `{ status: 'ok', database: 'connected' }` |
| Swagger UI | `GET /api/docs` |
| Spec OpenAPI | `GET /api/docs-json` |
| Endpoints de auth | `/api/auth/*` (Better Auth, públicos) |
| Endpoints de dominio | `/members`, `/plans`, `/payments`, etc. (autenticados) |

**CORS:** el frontend debe estar en el origen configurado en `CORS_ORIGIN` (o cualquier origen si no está definido). Usa `credentials: 'include'` si vas a usar cookies.

## Envelope de respuesta

**Recurso único (get/create/update/delete):**
```json
{ "data": { "id": "uuid", "...": "..." } }
```

**Listado (con paginación):**
```json
{
  "data": [ { "...": "..." } ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

**Eliminación:**
```json
{ "data": { "id": "uuid", "deleted": true } }
```

**Casos especiales:**
- `PATCH /notifications/read-all` → `{ "data": { "updated": 3 } }`
- `GET /notifications` → meta con campo extra: `{ total, page, limit, unread }`

> ⚠️ Las filas de BD vienen en **snake_case** (`member_id`, `created_at`, `user_email`, `plan_name`...). No hay conversión a camelCase: el frontend debe tiparlas tal cual.

## Paginación

Toda lista acepta `page` y `limit` como query params:
- `page`: entero ≥ 1, default `1`
- `limit`: entero 1–100, default `20`

```http
GET /members?page=2&limit=50
```

## Errores

Formato estándar de NestJS:

```json
{ "statusCode": 400, "message": "...", "error": "Bad Request" }
```

| Código | Cuándo | Mensaje típico (español) |
|---|---|---|
| 400 | Validación de DTO (campos extra, tipos, fechas) o reglas de negocio | `message` es un **array** en errores de validación |
| 401 | Sin token/sesión o token inválido/expirado | `No autenticado` |
| 403 | Rol sin permiso o regla de negocio | `No tienes permisos para acceder a este recurso` |
| 404 | Recurso inexistente — **o ajeno** (anti-IDOR) | `Miembro no encontrado` |
| 409 | Duplicados (nombre, documento, check-in abierto) | `Ya existe un ejercicio con ese nombre` |

> **Anti-IDOR:** si un `member` consulta un recurso de otro miembro, la API responde **404** (no 403) para no revelar existencia. Trátalo como "no existe".

## Reglas de validación (importantes para el frontend)

- **No enviar campos que no existan en el DTO** → 400 (la API usa `forbidNonWhitelisted`).
- Enviar solo campos permitidos en PATCH (todos opcionales, `PartialType`).
- Fechas en formato ISO (`YYYY-MM-DD` o ISO 8601 completo) — validadas con `@IsDateString`.
- Números con decimales máx 2 en montos.

## Enums — ¡case-sensitive!

| Módulo | Valores | Caja |
|---|---|---|
| members, trainers, plans, users | `active`, `inactive`, `suspended` | **lowercase** |
| exercises | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` | **UPPERCASE** |
| routines | `ACTIVE`, `INACTIVE`, `COMPLETED` | **UPPERCASE** |
| memberships | `ACTIVE`, `EXPIRED`, `CANCELLED`, `PENDING` | **UPPERCASE** |
| payments | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` | **UPPERCASE** |
| payments.paymentMethod | `CASH`, `CARD`, `TRANSFER`, `YAPE`, `PLIN`, `OTHER` | **UPPERCASE** |
| notifications.type | `INFO`, `WARNING`, `SUCCESS`, `PAYMENT`, `MEMBERSHIP`, `SYSTEM` | **UPPERCASE** |

## IDs

| Tipo | Dónde |
|---|---|
| **Texto** (32 chars hex, generado por Better Auth) | `user.id`, `/users/:id`, `userId` en DTOs |
| **UUID** (`gen_random_uuid()`) | Todo lo demás: members, plans, memberships, payments, trainers, exercises, routines, attendance, notifications |

## Roles del sistema

`admin` · `trainer` · `receptionist` · `member` (lowercase, campo `role` del usuario).

Resumen de permisos por módulo (detalle en cada archivo):

| Módulo | admin | trainer | receptionist | member |
|---|---|---|---|---|
| Users | CRUD | — | leer | — |
| Members | CRUD | leer | CRUD | leer (solo propio) |
| Plans | CRUD | leer | leer | leer |
| Memberships | CRUD | leer | CRUD | leer (solo propio) |
| Payments | CRUD | — | crear/leer | leer (solo propio) |
| Trainers | CRUD | leer/editarse | leer | leer |
| Exercises | CRUD | CRUD | leer | leer |
| Routines | CRUD | CRUD (solo suyas) | ❌ 403 | leer (solo propias) |
| Attendance | leer/check-in/out | leer | crear/leer | check-in/out + leer propias |
| Notifications | todo | propias | propias | propias |
| Reports | leer | ❌ | leer | ❌ |

## Checklist de integración

1. [ ] Login con `POST /api/auth/sign-in/email`, guardar `session.token`.
2. [ ] Cliente HTTP con header `Authorization: Bearer <token>` en todas las peticiones.
3. [ ] En 401 → cerrar sesión y redirigir a login.
4. [ ] Tipar respuestas con el envelope `{ data, meta }` y campos snake_case.
5. [ ] No enviar campos extra en los bodies (400).
6. [ ] Enviar enums con la caja exacta (UPPER/lowercase).
7. [ ] Manejar 404 como "no existe" y 403 como "sin permiso" por rol.
8. [ ] Ocultar/deshabilitar UI según rol (`/auth/me` → `role`).