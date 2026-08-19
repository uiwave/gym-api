# 03 — Módulo Users

Gestión de usuarios del sistema (cuentas de Better Auth). **Solo admin** para escribir; admin/receptionist para leer.

⚠️ Los IDs de este módulo son **texto** (32 chars hex de Better Auth), **no UUID**.

## Endpoints

| Método | Ruta | Roles | Body | Respuesta |
|---|---|---|---|---|
| GET | `/users` | admin, receptionist | — | `{ data: User[], meta }` |
| GET | `/users/:id` | admin, receptionist | — | `{ data: User }` |
| POST | `/users` | admin | `CreateUserDto` | `{ data: User }` |
| PATCH | `/users/:id/role` | admin | `UpdateUserRoleDto` | `{ data: { id, role } }` |
| PATCH | `/users/:id/ban` | admin | — | `{ data: { id, banned: true } }` |
| PATCH | `/users/:id/unban` | admin | — | `{ data: { id, banned: false } }` |
| DELETE | `/users/:id` | admin | — | `{ data: { id, deleted: true } }` |

## Query params de GET /users

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `search` | string | máx 100 |
| `role` | string | `admin` \| `trainer` \| `receptionist` \| `member` |

## Fila User (respuesta)

```json
{
  "data": {
    "id": "32charshex",
    "name": "Juan Pérez",
    "email": "juan@test.com",
    "emailVerified": false,
    "image": null,
    "role": "member",
    "banned": false,
    "banReason": null,
    "banExpires": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## DTOs

### CreateUserDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `name` | string | 2–100 chars | **requerido** |
| `email` | string | email válido, máx 255 | **requerido** |
| `password` | string | 8–100 chars | **requerido** |
| `role` | string | `admin` \| `trainer` \| `receptionist` \| `member` | opcional, default `member` |

### UpdateUserRoleDto

| Campo | Tipo | Validación |
|---|---|---|
| `role` | string | `admin` \| `trainer` \| `receptionist` \| `member` — **requerido** |

## Reglas de negocio

- Crear un usuario también puede vincularse a un `member` (ver `02-members.md`, campo `userId`).
- Banear/desbanear usa el plugin admin de Better Auth; un usuario baneado no podrá autenticarse.
- Cambiar rol a `admin` solo lo puede hacer un `admin` (ya lo garantiza el endpoint).

## Ejemplos

```http
# Crear usuario con rol trainer
POST /users
{ "name": "Carlos Ruiz", "email": "carlos@test.com", "password": "password123", "role": "trainer" }

# Cambiar rol
PATCH /users/32charshex/role
{ "role": "receptionist" }

# Banear
PATCH /users/32charshex/ban

# Eliminar
DELETE /users/32charshex
```