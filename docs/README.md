# Documentación de Implementación — Frontend GYM API

Esta carpeta contiene la documentación completa de la **GYM API** para implementar el frontend en **React + Vite**. Léela en orden: primero `00-overview.md`, luego `01-authentication.md`, después el módulo que necesites y finalmente `13-frontend-react-vite.md`.

## Índice

| Archivo | Contenido |
|---|---|
| [00-overview.md](00-overview.md) | Stack, base URL, convenciones de API (envelope, errores, paginación, enums, IDs) |
| [01-authentication.md](01-authentication.md) | Autenticación completa: sign-in, sign-up, token Bearer vs cookie, roles, permisos |
| [02-members.md](02-members.md) | Módulo Members (miembros) |
| [03-users.md](03-users.md) | Módulo Users (usuarios del sistema, admin) |
| [04-plans.md](04-plans.md) | Módulo Plans (planes/membresías de negocio) |
| [05-memberships.md](05-memberships.md) | Módulo Memberships (membresías de los miembros) |
| [06-payments.md](06-payments.md) | Módulo Payments (pagos) |
| [07-trainers.md](07-trainers.md) | Módulo Trainers (entrenadores) |
| [08-exercises.md](08-exercises.md) | Módulo Exercises (ejercicios) |
| [09-routines.md](09-routines.md) | Módulo Routines (rutinas + ejercicios de rutina) |
| [10-attendance.md](10-attendance.md) | Módulo Attendance (asistencia/check-in/check-out) |
| [11-notifications.md](11-notifications.md) | Módulo Notifications (notificaciones) |
| [12-reports.md](12-reports.md) | Módulo Reports (reportes y dashboard) |
| [13-frontend-react-vite.md](13-frontend-react-vite.md) | Guía de implementación React + Vite: apiClient, AuthProvider, rutas protegidas, ejemplos |

## Quickstart

```bash
# 1. URL base (por defecto)
BASE_URL=http://localhost:3000

# 2. Login (obtén el token Bearer)
POST $BASE_URL/api/auth/sign-in/email
Body: { "email": "admin@test.com", "password": "TuPassword" }
# Respuesta: { user: {...}, session: { token: "...", ... } }

# 3. Primer request autenticado
GET $BASE_URL/members?page=1&limit=20
Headers: Authorization: Bearer <session.token>
```

## Reglas globales que no debes olvidar

- **Todo** endpoint de dominio requiere autenticación (Bearer o cookie). Solo `/`, `/health` y `/api/auth/*` son públicos.
- Respuestas: `{ data }` o `{ data, meta }`. Campos en **snake_case**.
- El body NO admite campos extra (400) — la validación es estricta.
- Los IDs de `user` son texto (32 chars hex); el resto son UUID.
- Enums case-sensitive: UPPERCASE en exercises/routines/memberships/payments/notifications; lowercase en members/trainers/plans/users.