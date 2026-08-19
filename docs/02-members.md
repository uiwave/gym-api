# 02 — Módulo Members

CRUD de miembros del gimnasio. Cada member está vinculado a un `user` de Better Auth (opcionalmente).

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/members` | admin, receptionist, trainer | `page`, `limit`, `search`, `status` | — | `{ data: Member[], meta }` |
| GET | `/members/:id` | cualquiera (staff o propio, si no → 404) | — | — | `{ data: Member }` |
| POST | `/members` | cualquiera (staff para crear de otro user) | — | `CreateMemberDto` | `{ data: Member }` |
| PATCH | `/members/:id` | cualquiera (staff o propio) | — | `UpdateMemberDto` | `{ data: Member }` |
| DELETE | `/members/:id` | admin, receptionist | — | — | `{ data: { id, deleted: true } }` |

## Fila Member (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "user_id": "32charshex | null",
    "user_name": "Juan Pérez | null",
    "user_email": "juan@test.com | null",
    "user_role": "member | null",
    "document_number": "12345678",
    "phone": "999888777",
    "birth_date": "1990-05-15",
    "address": "Av. Lima 123",
    "emergency_contact_name": "María Pérez",
    "emergency_contact_phone": "988777666",
    "status": "active",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

## DTOs

### CreateMemberDto (todos opcionales)

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `userId` | string | 1–255 chars | ID de user Better Auth (staff-only para vincular a otro) |
| `documentNumber` | string | 8–20 chars | Único en BD (409 si se repite) |
| `phone` | string | máx 20 | |
| `birthDate` | string | ISO date | |
| `address` | string | máx 500 | |
| `emergencyContactName` | string | máx 100 | |
| `emergencyContactPhone` | string | máx 20 | |
| `status` | string | `active` \| `inactive` \| `suspended` | default `active` |

### UpdateMemberDto
Todos los campos del CreateMemberDto, todos opcionales.

### Query params de GET /members

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `search` | string | ILIKE sobre name, email, document_number, phone |
| `status` | string | `active` \| `inactive` \| `suspended` |

## Reglas de negocio

- **Anti-IDOR:** un `member` solo puede ver/editar su propio member; si consulta otro → **404**.
- **Staff** (admin/receptionist/trainer): ven todos.
- Crear un member con `userId` de otra persona requiere staff; un member solo puede crear su propio member (sin `userId`).
- `documentNumber` duplicado → 409.

## Ejemplos

```http
# Listar con búsqueda
GET /members?search=juan&status=active&page=1&limit=20

# Crear
POST /members
{ "userId": "32charshex", "documentNumber": "12345678", "phone": "999888777", "status": "active" }

# Actualizar
PATCH /members/<uuid>
{ "phone": "988777666" }
```