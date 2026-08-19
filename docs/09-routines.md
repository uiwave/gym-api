# 09 — Módulo Routines

Rutinas de entrenamiento (asignadas a un member, creadas por un trainer). Incluye los ejercicios de cada rutina.

⚠️ **El recepcionista NO puede consultar rutinas** → 403 (regla del servicio, aunque el rol no tenga `@Roles`).

## Endpoints

| Método | Ruta | Roles | Query | Body | Respuesta |
|---|---|---|---|---|---|
| GET | `/routines` | cualquiera **excepto receptionist** (403); members ven solo las suyas | `page`, `limit`, `status`, `memberId` | — | `{ data: Routine[], meta }` |
| GET | `/routines/:id` | cualquiera (receptionist 403; member solo la suya → 404) | — | — | `{ data: Routine }` |
| POST | `/routines` | admin, trainer | — | `CreateRoutineDto` | `{ data: Routine }` |
| PATCH | `/routines/:id` | admin, trainer (trainer solo las suyas) | — | `UpdateRoutineDto` | `{ data: Routine }` |
| DELETE | `/routines/:id` | admin | — | — | `{ data: { id, deleted: true } }` |
| GET | `/routines/:routineId/exercises` | cualquiera (mismo acceso que la rutina) | — | — | `{ data: RoutineExercise[] }` |
| POST | `/routines/:routineId/exercises` | admin, trainer | — | `CreateRoutineExerciseDto` | `{ data: RoutineExercise }` |
| PATCH | `/routines/:routineId/exercises/:exerciseId` | admin, trainer | — | `UpdateRoutineExerciseDto` | `{ data: RoutineExercise }` |
| DELETE | `/routines/:routineId/exercises/:exerciseId` | admin, trainer | — | — | `{ data: { id, deleted: true } }` |
| GET | `/members/:memberId/routines` | cualquiera (member solo las suyas → 404; receptionist 403) | — | — | `{ data: Routine[] }` |

## Fila Routine (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "member_id": "uuid",
    "member_name": "Juan Pérez",
    "member_document_number": "12345678",
    "trainer_id": "uuid",
    "trainer_name": "Carlos Ruiz",
    "trainer_specialization": "Musculación",
    "name": "Rutina Fuerza",
    "description": "4 semanas",
    "start_date": "2026-08-01",
    "end_date": "2026-08-31",
    "status": "ACTIVE",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

## Fila RoutineExercise (respuesta, snake_case)

```json
{
  "data": {
    "id": "uuid",
    "routine_id": "uuid",
    "exercise_id": "uuid",
    "exercise_name": "Press de banca",
    "exercise_muscle_group": "Pecho",
    "exercise_difficulty": "INTERMEDIATE",
    "sets": 4,
    "repetitions": 10,
    "weight": 60.00,
    "rest_seconds": 90,
    "notes": "Subir peso progresivo",
    "order_index": 1
  }
}
```

## DTOs

### CreateRoutineDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `memberId` | string | UUID | **requerido** |
| `trainerId` | string | UUID | opcional; si el usuario es trainer y no se envía → su propio perfil |
| `name` | string | máx 150 | **requerido** |
| `description` | string | máx 2000 | opcional |
| `startDate` | string | ISO date | opcional |
| `endDate` | string | ISO date | opcional, debe ser ≥ startDate (400) |
| `status` | string | `ACTIVE` \| `INACTIVE` \| `COMPLETED` | opcional, default `ACTIVE` |

### UpdateRoutineDto
Todos los campos opcionales.

### CreateRoutineExerciseDto

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| `exerciseId` | string | UUID | **requerido** |
| `sets` | number | entero 1–1000 | **requerido** |
| `repetitions` | number | entero 1–1000 | **requerido** |
| `weight` | number | ≥ 0, 2 decimales máx | opcional, default `0` |
| `restSeconds` | number | entero 0–86400 | opcional, default `60` |
| `notes` | string | máx 1000 | opcional |
| `orderIndex` | number | entero ≥ 0 | opcional, default = max+1 |

### UpdateRoutineExerciseDto
Todos los campos opcionales.

### Query params de GET /routines

| Param | Tipo | Notas |
|---|---|---|
| `page` | number | default 1 |
| `limit` | number | 1–100, default 20 |
| `status` | string | `ACTIVE` \| `INACTIVE` \| `COMPLETED` |
| `memberId` | string | UUID |

## Reglas de negocio

- **Receptionist → 403** en todo el módulo.
- **Member:** solo ve sus propias rutinas (404 si ajenas).
- **Trainer:** solo edita/elimina ejercicios de sus propias rutinas.
- Unicidad: `(routine_id, order_index)` y `(routine_id, exercise_id)` → 409.
- `endDate < startDate` → 400.

## Ejemplos

```http
# Crear rutina (trainer)
POST /routines
{ "memberId": "uuid", "name": "Rutina Fuerza", "startDate": "2026-08-01", "endDate": "2026-08-31" }

# Agregar ejercicio
POST /routines/<uuid>/exercises
{ "exerciseId": "uuid", "sets": 4, "repetitions": 10, "weight": 60, "restSeconds": 90, "orderIndex": 1 }

# Rutinas de un miembro
GET /members/<uuid>/routines
```