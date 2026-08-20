# 12 — Módulo Reports

Reportes agregados para el dashboard. **Solo admin y receptionist** (clase con `@Roles('admin','receptionist')`). No usan paginación.

## Endpoints

| Método | Ruta | Roles | Query | Respuesta (`data`) |
|---|---|---|---|---|
| GET | `/reports/dashboard` | admin, receptionist | — | Resumen general |
| GET | `/reports/members` | admin, receptionist | `from`, `to` | Miembros por estado y nuevos por mes |
| GET | `/reports/revenue` | admin, receptionist | `from`, `to` | Ingresos totales, por mes y por método |
| GET | `/reports/attendance` | admin, receptionist | `from`, `to` | Asistencia diaria (últimos 30 días) y promedio |
| GET | `/reports/memberships` | admin, receptionist | — | Membresías por estado y próximas a vencer |

## Shapes de respuesta

### GET /reports/dashboard

```json
{
  "data": {
    "totalMembers": 120,
    "activeMembers": 95,
    "activeMemberships": 90,
    "expiredMemberships": 5,
    "monthlyRevenue": 8560.50,
    "todayAttendance": 34,
    "pendingPayments": 7
  }
}
```

### GET /reports/members?from=2026-01-01&to=2026-08-31

```json
{
  "data": {
    "byStatus": [ { "status": "active", "total": 95 } ],
    "newPerMonth": [ { "month": "2026-01", "total": 12 } ]
  }
}
```

> `newPerMonth` cubre los últimos 12 meses.

### GET /reports/revenue?from=2026-01-01&to=2026-08-31

```json
{
  "data": {
    "totalRevenue": 12345.00,
    "byMonth": [ { "month": "2026-08", "payments": 30, "total": 2670.00 } ],
    "byMethod": [ { "payment_method": "YAPE", "payments": 20, "total": 1780.00 } ]
  }
}
```

### GET /reports/attendance?from=2026-08-01&to=2026-08-31

```json
{
  "data": {
    "daily": [ { "day": "2026-08-19", "check_ins": 34, "check_outs": 30 } ],
    "averagePerDay": 28.5
  }
}
```

> `daily` cubre los últimos 30 días (aunque no pidas fechas).

### GET /reports/memberships

```json
{
  "data": {
    "byStatus": [ { "status": "ACTIVE", "total": 90 } ],
    "expiringSoon": 4,
    "expiringSoonList": [ { "id": "uuid", "member_name": "Juan Pérez", "end_date": "2026-08-25" } ]
  }
}
```

## Query params (todos opcionales)

| Param | Tipo | Notas |
|---|---|---|
| `from` | string | ISO date |
| `to` | string | ISO date |

## Reglas de negocio

- **trainer y member → 403**.
- Las métricas usan estado de membresías/pagos registrados.

## Ejemplos

```http
GET /reports/dashboard
GET /reports/revenue?from=2026-01-01&to=2026-12-31
GET /reports/memberships
```