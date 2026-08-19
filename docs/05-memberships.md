# 05 — Módulo Memberships

Membresías activas de cada miembro (vinculan member + plan con fechas y precio). Escritura: admin/receptionist.

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/memberships` | admin, receptionist, trainer | `page`, `limit`, `status`, `memberId` | — | `{ data: Membership[], meta }` |
| GET | `/memberships/:id` | cualquiera (staff o propio, si no → 404) | — | — | `{ data: Membership }` |
| POST | `/memberships` | admin, receptionist | — | `CreateMembershipDto` | `{ data: Membership }` |
| PATCH | `/memberships/:id` | admin, receptionist | — | `UpdateMembershipDto` | `{ data: Membership }` |
| DELETE | `/memberships/:id` | admin | — | — | `{ data: { id, deleted: true } }` |
| GET | `/members/:memberId/memberships` | cualquiera (staff o propio, si no → 404) | — | — | `{ data: Membership[] }` |

## Fila Membership (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "member_id": "uuid",
    "member_name": "Juan Pérez",
    "member_email": "juan@test.com",
    "member_document_number": "12345678",
    "plan_id": "uuid",
    "plan_name": "Plan Mensual",
    "plan_duration_days": 30,
    "start_date": "2026-01-01",
    "end_date": "2026-01-31",
    "price": 89.90,
    "status": "ACTIVE",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

## DTOs

### CreateMembershipDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `memberId` | string | UUID | **requerido** |
| `planId` | string | UUID | **requerido** |
| `startDate` | string | ISO date | **requerido** |
| `endDate` | string | ISO date | **requerido**, debe ser ≥ startDate |
| `status` | string | `ACTIVE` \| `EXPIRED` \| `CANCELLED` \| `PENDING` | opcional, default `PENDING` |
| `price` | number | ≥ 0, 2 decimales máx | opcional, **default = precio del plan** |

### UpdateMembershipDto
Todos los campos opcionales.

### Query params de GET /memberships

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `status` | string | `ACTIVE` \| `EXPIRED` \| `CANCELLED` \| `PENDING` |
| `memberId` | string | UUID, filtra por miembro |

## Reglas de negocio

- **Anti-IDOR:** un `member` solo ve sus propias membresías (404 para ajenas).
- Crear con `status` `ACTIVE` no valida contra pagos; el flujo normal es: membresía `PENDING` → pago `COMPLETED` activa la membresía (ver `06-payments.md`).
- `endDate < startDate` → 400.

## Ejemplos

```http
# Crear (toma el precio del plan si no se envía)
POST /memberships
{ "memberId": "uuid", "planId": "uuid", "startDate": "2026-08-01", "endDate": "2026-08-31" }

# Membresías de un miembro
GET /members/<uuid>/memberships

# Listar activas
GET /memberships?status=ACTIVE
```