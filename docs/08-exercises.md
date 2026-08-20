# 08 — Módulo Exercises

Catálogo de ejercicios. Lectura para todos; escritura admin/trainer.

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/exercises` | cualquiera | `page`, `limit`, `muscleGroup`, `difficulty` | — | `{ data: Exercise[], meta }` |
| GET | `/exercises/:id` | cualquiera | — | — | `{ data: Exercise }` |
| POST | `/exercises` | admin, trainer | — | `CreateExerciseDto` | `{ data: Exercise }` |
| PATCH | `/exercises/:id` | admin, trainer | — | `UpdateExerciseDto` | `{ data: Exercise }` |
| DELETE | `/exercises/:id` | admin | — | — | `{ data: { id, deleted: true } }` |

## Fila Exercise (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "name": "Press de banca",
    "description": "Empuje horizontal",
    "muscle_group": "Pecho",
    "equipment": "Barra",
    "difficulty": "INTERMEDIATE",
    "instructions": "Acuéstate...",
    "image_url": "https://...",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

## DTOs

### CreateExerciseDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `name` | string | máx 150 | **requerido**, único (409) |
| `description` | string | máx 2000 | opcional |
| `muscleGroup` | string | máx 100 | opcional |
| `equipment` | string | máx 100 | opcional |
| `difficulty` | string | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` | opcional, default `BEGINNER` |
| `instructions` | string | máx 4000 | opcional |
| `imageUrl` | string | URL válida (https), máx 500 | opcional |

### UpdateExerciseDto
Todos los campos opcionales.

### Query params de GET /exercises

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `muscleGroup` | string | ILIKE |
| `difficulty` | string | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` |

## Reglas de negocio

- `name` duplicado → 409.

## Ejemplos

```http
GET /exercises?muscleGroup=Pecho&difficulty=BEGINNER

POST /exercises
{ "name": "Sentadilla", "muscleGroup": "Pierna", "difficulty": "BEGINNER", "instructions": "..." }
```