# 07 — Módulo Trainers

Entrenadores del gimnasio (perfil profesional vinculado a un `user` de Better Auth con rol trainer).

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/trainers` | admin, receptionist, trainer | `page`, `limit`, `search`, `status` | — | `{ data: Trainer[], meta }` |
| GET | `/trainers/:id` | admin, receptionist, trainer | — | — | `{ data: Trainer }` |
| POST | `/trainers` | admin | — | `CreateTrainerDto` | `{ data: Trainer }` |
| PATCH | `/trainers/:id` | admin, trainer (admin o **el propio trainer**) | — | `UpdateTrainerDto` | `{ data: Trainer }` |
| DELETE | `/trainers/:id` | admin | — | — | `{ data: { id, deleted: true } }` |

## Fila Trainer (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "user_id": "32charshex",
    "user_name": "Carlos Ruiz",
    "user_email": "carlos@test.com",
    "specialization": "Musculación",
    "phone": "999888777",
    "bio": "Entrenador certificado",
    "status": "active",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

## DTOs

### CreateTrainerDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `userId` | string | 1–255 chars | **requerido**; el user debe existir |
| `specialization` | string | máx 100 | opcional |
| `phone` | string | máx 20 | opcional |
| `bio` | string | máx 2000 | opcional |
| `status` | string | `active` \| `inactive` | opcional, default `active` |

### UpdateTrainerDto
Todos los campos opcionales.

### Query params de GET /trainers

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `search` | string | máx 100 |
| `status` | string | `active` \| `inactive` |

## Reglas de negocio

- Un trainer solo puede editar **su propio** perfil (403 si intenta editar otro).
- Un user solo puede tener un perfil de trainer (409 si se duplica el `userId`).

## Ejemplos

```http
# Crear (admin)
POST /trainers
{ "userId": "32charshex", "specialization": "Funcional", "status": "active" }

# Un trainer edita su propio perfil
PATCH /trainers/<uuid>
{ "phone": "988777666" }
```