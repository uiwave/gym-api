# 10 — Módulo Attendance

Asistencia: check-in y check-out de los miembros. El miembro se registra a sí mismo; el staff registra a cualquier miembro.

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| POST | `/attendance/check-in` | cualquiera | — | `CheckInDto` | `{ data: Attendance }` |
| POST | `/attendance/check-out` | cualquiera | — | `CheckOutDto` | `{ data: Attendance }` |
| GET | `/attendance` | admin, receptionist, trainer (members ven solo las suyas) | `page`, `limit`, `from`, `to`, `memberId` | — | `{ data: Attendance[], meta }` |
| GET | `/attendance/:id` | cualquiera (staff o propio, si no → 404) | — | — | `{ data: Attendance }` |
| GET | `/members/:memberId/attendance` | cualquiera (staff o propio, si no → 404) | — | — | `{ data: Attendance[] }` |

## Fila Attendance (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "member_id": "uuid",
    "member_name": "Juan Pérez",
    "member_document_number": "12345678",
    "check_in_at": "2026-08-19T09:00:00.000Z",
    "check_out_at": "2026-08-19T10:30:00.000Z",
    "duration_minutes": 90,
    "notes": null,
    "created_at": "2026-08-19T09:00:00.000Z",
    "updated_at": "2026-08-19T10:30:00.000Z"
  }
}
```

## DTOs

### CheckInDto / CheckOutDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `memberId` | string | UUID | opcional; **requerido para staff** (receptionist/admin/trainer), **prohibido para member** (se registra él mismo) |

### Query params de GET /attendance

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `from` | string | ISO date |
| `to` | string | ISO date |
| `memberId` | string | UUID |

## Reglas de negocio

- **Check-in requiere membresía `ACTIVE` vigente** (fechas cubren hoy) → si no, **400**.
- **409** si el miembro ya tiene un check-in abierto (sin check-out).
- **400** en check-out si no hay check-in abierto.
- Los `member` solo ven/registran su propia asistencia (404 para ajenas).
- El `duration_minutes` se calcula al hacer check-out.

## Ejemplos

```http
# Check-in de un miembro (staff)
POST /attendance/check-in
{ "memberId": "uuid" }

# Check-in de sí mismo (member, sin body)
POST /attendance/check-in
{}

# Listar con rango de fechas
GET /attendance?from=2026-08-01&to=2026-08-31
```