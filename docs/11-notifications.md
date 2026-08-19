# 11 — Módulo Notifications

Notificaciones por usuario. Cada usuario ve **solo las suyas** (se filtran por `user_id` automáticamente). El pago COMPLETED genera notificaciones automáticas (ver `06-payments.md`).

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/notifications` | cualquiera (solo propias) | `page`, `limit`, `read`, `type` | — | `{ data: Notification[], meta: { total, page, limit, unread } }` |
| POST | `/notifications` | admin | — | `CreateNotificationDto` | `{ data: Notification }` |
| PATCH | `/notifications/:id/read` | cualquiera (solo propias) | — | — | `{ data: Notification }` |
| PATCH | `/notifications/read-all` | cualquiera | — | — | `{ data: { updated: n } }` |
| DELETE | `/notifications/:id` | cualquiera (propias o admin) | — | — | `{ data: { id, deleted: true } }` |

## Fila Notification (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "user_id": "32charshex",
    "title": "Pago registrado",
    "message": "Tu pago de agosto fue registrado",
    "type": "PAYMENT",
    "read": false,
    "created_at": "2026-08-19T10:00:00.000Z"
  }
}
```

## DTOs

### CreateNotificationDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `userId` | string | 1–255 chars | **requerido**; el user debe existir |
| `title` | string | máx 200 | **requerido** |
| `message` | string | máx 4000 | **requerido** |
| `type` | string | `INFO` \| `WARNING` \| `SUCCESS` \| `PAYMENT` \| `MEMBERSHIP` \| `SYSTEM` | **requerido** |

### Query params de GET /notifications

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `read` | string | `true` \| `false` (se envía como string en query) |
| `type` | string | `INFO` \| `WARNING` \| `SUCCESS` \| `PAYMENT` \| `MEMBERSHIP` \| `SYSTEM` |

## Reglas de negocio

- El listado siempre filtra por el usuario autenticado (imposible ver ajenas).
- `PATCH /:id/read` en una notificación ajena → 404.
- `meta.unread` = cantidad de no leídas (útil para el badge del navbar).
- Solo admin puede crear notificaciones manuales (para cualquier usuario).

## Ejemplos

```http
# Listar no leídas (badge)
GET /notifications?read=false&limit=10

# Marcar una como leída
PATCH /notifications/<uuid>/read

# Marcar todas como leídas
PATCH /notifications/read-all

# Crear (admin)
POST /notifications
{ "userId": "32charshex", "title": "Bienvenido", "message": "Gracias por unirte", "type": "SUCCESS" }
```