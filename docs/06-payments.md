# 06 — Módulo Payments

Pagos de los miembros. Escritura: admin/receptionist. **No tiene DELETE.**

> ⚠️ **Regla clave:** al crear/actualizar un pago a estado `COMPLETED`, la API (en una transacción) **activa la membresía** asociada (`ACTIVE`) y **crea una notificación** de tipo `PAYMENT` para el miembro.

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/payments` | admin, receptionist | `page`, `limit`, `status`, `from`, `to` | — | `{ data: Payment[], meta }` |
| GET | `/payments/:id` | cualquiera (staff o propio, si no → 404) | — | — | `{ data: Payment }` |
| POST | `/payments` | admin, receptionist | — | `CreatePaymentDto` | `{ data: Payment }` |
| PATCH | `/payments/:id` | admin, receptionist | — | `UpdatePaymentDto` | `{ data: Payment }` |
| GET | `/members/:memberId/payments` | cualquiera (staff o propio, si no → 404) | — | — | `{ data: Payment[] }` |

## Fila Payment (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "member_id": "uuid",
    "member_name": "Juan Pérez",
    "member_email": "juan@test.com",
    "member_document_number": "12345678",
    "membership_id": "uuid | null",
    "amount": 89.90,
    "payment_method": "YAPE",
    "payment_date": "2026-08-19T10:00:00.000Z",
    "status": "COMPLETED",
    "reference": "YAPE-12345",
    "notes": "Pago de agosto",
    "created_at": "2026-08-19T10:00:00.000Z",
    "updated_at": "2026-08-19T10:00:00.000Z"
  }
}
```

## DTOs

### CreatePaymentDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `memberId` | string | UUID | **requerido** |
| `membershipId` | string | UUID | opcional; si se envía, debe pertenecer al member |
| `amount` | number | ≥ 0.01, 2 decimales máx, ≤ 99999999.99 | **requerido** |
| `paymentMethod` | string | `CASH` \| `CARD` \| `TRANSFER` \| `YAPE` \| `PLIN` \| `OTHER` | **requerido** |
| `paymentDate` | string | ISO date | opcional, default ahora |
| `status` | string | `PENDING` \| `COMPLETED` \| `FAILED` \| `REFUNDED` | opcional, default `PENDING` |
| `reference` | string | máx 100 | opcional |
| `notes` | string | máx 2000 | opcional |

### UpdatePaymentDto
Todos los campos opcionales.

### Query params de GET /payments

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `status` | string | `PENDING` \| `COMPLETED` \| `FAILED` \| `REFUNDED` |
| `from` | string | ISO date, filtra payment_date ≥ from |
| `to` | string | ISO date, filtra payment_date ≤ to (inclusive, +1 día) |

## Reglas de negocio

- Pago `COMPLETED` → activa la membresía (`ACTIVE`) y crea notificación `PAYMENT` (transacción atómica).
- `membershipId` que no pertenezca al miembro → 400.
- Los `member` solo ven sus propios pagos (404 para ajenos).

## Ejemplos

```http
# Registrar pago completado (activa la membresía)
POST /payments
{
  "memberId": "uuid",
  "membershipId": "uuid",
  "amount": 89.90,
  "paymentMethod": "YAPE",
  "status": "COMPLETED",
  "reference": "YAPE-12345"
}

# Listar por rango de fechas
GET /payments?from=2026-08-01&to=2026-08-31

# Pagos de un miembro
GET /members/<uuid>/payments
```