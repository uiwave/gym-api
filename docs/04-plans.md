# 04 — Módulo Plans

Planes/membresías del negocio (precio, duración, estado). Lectura para todos; escritura solo admin.

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/plans` | cualquiera | `page`, `limit`, `status` | — | `{ data: Plan[], meta }` |
| GET | `/plans/:id` | cualquiera | — | — | `{ data: Plan }` |
| POST | `/plans` | admin | — | `CreatePlanDto` | `{ data: Plan }` |
| PATCH | `/plans/:id` | admin | — | `UpdatePlanDto` | `{ data: Plan }` |
| DELETE | `/plans/:id` | admin | — | — | `{ data: { id, deleted: true } }` |

## Fila Plan (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "name": "Plan Mensual",
    "description": "Acceso ilimitado",
    "price": 89.90,
    "duration_days": 30,
    "status": "active",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

## DTOs

### CreatePlanDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `name` | string | máx 100 | **requerido**, único (409 si se repite) |
| `description` | string | máx 2000 | opcional |
| `price` | number | ≥ 0, máx 2 decimales, ≤ 99999999.99 | opcional, default `0` |
| `durationDays` | number | entero 1–3650 | **requerido** |
| `status` | string | `active` \| `inactive` | opcional, default `active` |

### UpdatePlanDto
Todos los campos opcionales.

### Query params de GET /plans

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `status` | string | `active` \| `inactive` |

## Reglas de negocio

- `name` duplicado → 409.
- Al crear una membresía se puede omitir `price` y toma el precio del plan (ver `05-memberships.md`).

## Ejemplos

```http
GET /plans?status=active

POST /plans
{ "name": "Plan Anual", "price": 799.00, "durationDays": 365, "status": "active" }

PATCH /plans/<uuid>
{ "price": 849.00 }
```