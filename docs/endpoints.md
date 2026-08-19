# Endpoints de la API

## Información general

- **Base URL:** `http://localhost:3000` (configurable con la variable `PORT` del `.env`)
- **Autenticación:** [Better Auth](https://better-auth.com) con email y contraseña. Los endpoints protegidos requieren el header `Authorization: Bearer <token>` o cookie de sesión.
- **Roles:** `admin`, `trainer`, `receptionist`, `member` (rol por defecto al registrarse: `member`)
- **Validación:** global con `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`); los campos no permitidos en el body causan error `400`.

---

## Endpoints

### 1. `GET /users`

Lista todos los usuarios del sistema (sin filtrar por rol).

**Autenticación:** No

**Respuesta (200 OK):**

```json
[
  {
    "id": "uuid",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@example.com",
    "role": "member",
    "created_at": "2026-08-18T12:00:00.000Z",
    "updated_at": "2026-08-18T12:00:00.000Z"
  }
]
```

---

### 2. `GET /members`

Lista todos los miembros del gimnasio, ordenados por fecha de creación descendente.

**Autenticación:** Requerida (`AuthGuard`)

**Respuesta (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "role": "member"
  },
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "document_number": "12345678",
      "phone": "555-1234",
      "birth_date": "1990-01-01",
      "address": "Av. Siempre Viva 123",
      "emergency_contact_name": "María Pérez",
      "emergency_contact_phone": "555-5678",
      "status": "active",
      "created_at": "2026-08-18T12:00:00.000Z",
      "updated_at": "2026-08-18T12:00:00.000Z"
    }
  ]
}
```

---

### 3. `GET /members/:id`

Obtiene un miembro por su ID (UUID).

**Autenticación:** Requerida (`AuthGuard`)

**Parámetros de ruta:**

| Parámetro | Tipo   | Validación | Descripción    |
| --------- | ------ | ---------- | -------------- |
| `id`      | string | UUID       | ID del miembro |

**Respuesta (200 OK):**

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "document_number": "12345678",
    "phone": "555-1234",
    "birth_date": "1990-01-01",
    "address": "Av. Siempre Viva 123",
    "emergency_contact_name": "María Pérez",
    "emergency_contact_phone": "555-5678",
    "status": "active",
    "created_at": "2026-08-18T12:00:00.000Z",
    "updated_at": "2026-08-18T12:00:00.000Z"
  }
}
```

**Errores:**

| Código | Cuerpo                          | Caso                    |
| ------ | ------------------------------- | ----------------------- |
| `400`  | `{ "message": ... }`            | `id` no es un UUID      |
| `404`  | `{ "message": "Miembro no encontrado" }` | No existe el miembro |

---

### 4. `POST /members`

Crea un nuevo miembro. El `user_id` se toma del usuario autenticado (no se envía en el body). Todos los campos son opcionales.

**Autenticación:** Requerida (`AuthGuard`)

**Body (JSON):**

| Campo                   | Tipo   | Validación           | Obligatorio | Descripción                 |
| ----------------------- | ------ | -------------------- | ----------- | --------------------------- |
| `documentNumber`        | string | longitud 8-20        | No          | Número de documento         |
| `phone`                 | string | máx. 20 caracteres   | No          | Teléfono                    |
| `birthDate`             | string | fecha ISO (YYYY-MM-DD) | No        | Fecha de nacimiento         |
| `address`               | string | máx. 500 caracteres  | No          | Dirección                   |
| `emergencyContactName`  | string | máx. 100 caracteres  | No          | Nombre de contacto de emergencia |
| `emergencyContactPhone` | string | máx. 20 caracteres   | No          | Teléfono de contacto de emergencia |

**Ejemplo de petición:**

```json
{
  "documentNumber": "12345678",
  "phone": "555-1234",
  "birthDate": "1990-01-01",
  "address": "Av. Siempre Viva 123",
  "emergencyContactName": "María Pérez",
  "emergencyContactPhone": "555-5678"
}
```

**Respuesta (201 Created):**

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "document_number": "12345678",
    "phone": "555-1234",
    "birth_date": "1990-01-01",
    "address": "Av. Siempre Viva 123",
    "emergency_contact_name": "María Pérez",
    "emergency_contact_phone": "555-5678",
    "status": "active",
    "created_at": "2026-08-18T12:00:00.000Z",
    "updated_at": "2026-08-18T12:00:00.000Z"
  }
}
```

**Errores:**

| Código | Caso                                        |
| ------ | ------------------------------------------- |
| `400`  | Campo con validación fallida o no permitido |
| `401`  | No autenticado                              |

---

## Endpoints de Better Auth (`/api/auth/*`)

Mezclados por el paquete `@thallesp/nestjs-better-auth` en la ruta base **`/api/auth`** (no pasan por NestJS ni por los guards de la app). Autenticación con **email y contraseña** + plugin **admin**.

**Requisitos generales:**

- Content-Type: `application/json` (también acepta `application/x-www-form-urlencoded`).
- Sesión autenticada por **cookie** (`better-auth.session_token`) o por header `Authorization: Bearer <token>`.
- Contraseñas: mínimo 8 caracteres, máximo 128 (valores por defecto de Better Auth).
- Roles configurados: `admin`, `trainer`, `receptionist`, `member`. `adminRoles: ['admin']`, rol por defecto `member`.
- Solo el rol `admin` puede usar los endpoints `/admin/*`.

### 1. `POST /api/auth/sign-up/email`

Registro con email y contraseña. Devuelve la sesión creada (cookies + token).

**Autenticación:** No

**Body (JSON):**

| Campo          | Tipo    | Obligatorio | Descripción                                  |
| -------------- | ------- | ----------- | -------------------------------------------- |
| `name`         | string  | Sí          | Nombre del usuario                           |
| `email`        | string  | Sí          | Email (debe ser válido y no estar registrado)|
| `password`     | string  | Sí          | Mín. 8, máx. 128 caracteres                  |
| `image`        | string  | No          | URL de foto de perfil                        |
| `callbackURL`  | string  | No          | URL para el callback de verificación de email|
| `rememberMe`   | boolean | No          | Si `false`, la sesión no se recuerda (default `true`) |

**Ejemplo:**

```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "rememberMe": true
}
```

**Respuesta (200 OK):**

```json
{
  "token": "session-token",
  "user": {
    "id": "uuid",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "role": "member",
    "emailVerified": false,
    "createdAt": "2026-08-18T12:00:00.000Z",
    "updatedAt": "2026-08-18T12:00:00.000Z"
  }
}
```

**Errores:**

| Código | Código de error                 | Caso                              |
| ------ | ------------------------------- | --------------------------------- |
| `422`  | `USER_ALREADY_EXISTS`           | El email ya está registrado       |
| `422`  | `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` | Contraseña fuera de rango |

### 2. `POST /api/auth/sign-in/email`

Inicio de sesión con email y contraseña.

**Autenticación:** No

**Body (JSON):**

| Campo         | Tipo    | Obligatorio | Descripción                                            |
| ------------- | ------- | ----------- | ------------------------------------------------------ |
| `email`       | string  | Sí          | Email del usuario                                      |
| `password`    | string  | Sí          | Contraseña del usuario                                 |
| `callbackURL` | string  | No          | URL de redirección                                     |
| `rememberMe`  | boolean | No          | Si `false`, la sesión no se recuerda (default `true`)  |

**Ejemplo:**

```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Respuesta (200 OK):**

```json
{
  "redirect": false,
  "token": "session-token",
  "user": {
    "id": "uuid",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "role": "member"
  }
}
```

**Errores:**

| Código | Código de error        | Caso                          |
| ------ | ---------------------- | ----------------------------- |
| `401`  | `INVALID_EMAIL_OR_PASSWORD` | Credenciales incorrectas  |

### 3. `POST /api/auth/sign-out`

Cierra la sesión actual (elimina cookie/token del lado del servidor).

**Autenticación:** Requerida

**Respuesta (200 OK):**

```json
{
  "success": true
}
```

### 4. `GET /api/auth/get-session`

Obtiene la sesión actual.

**Autenticación:** Requerida (cookie o Bearer)

**Respuesta (200 OK):**

```json
{
  "session": {
    "id": "uuid",
    "userId": "uuid",
    "expiresAt": "2026-08-19T12:00:00.000Z",
    "createdAt": "2026-08-18T12:00:00.000Z",
    "updatedAt": "2026-08-18T12:00:00.000Z",
    "ipAddress": "127.0.0.1",
    "userAgent": "curl/8.0.0"
  },
  "user": {
    "id": "uuid",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "role": "member"
  }
}
```

Sin sesión devuelve `{ "session": null, "user": null }`.

### 5. `POST /api/auth/update-user`

Actualiza los datos del usuario autenticado (solo los campos propios permitidos, p. ej. `name`, `image`).

**Autenticación:** Requerida

**Body (JSON):**

| Campo  | Tipo   | Obligatorio | Descripción                      |
| ------ | ------ | ----------- | -------------------------------- |
| `name` | string | No          | Nuevo nombre                     |
| `image`| string | No          | Nueva URL de foto de perfil      |

**Respuesta (200 OK):** el usuario actualizado (`{ "user": { ... } }`)

### 6. `POST /api/auth/change-password`

Cambia la contraseña del usuario autenticado.

**Autenticación:** Requerida

**Body (JSON):**

| Campo                | Tipo    | Obligatorio | Descripción                                        |
| -------------------- | ------- | ----------- | -------------------------------------------------- |
| `newPassword`        | string  | Sí          | Nueva contraseña (mín. 8, máx. 128)                |
| `currentPassword`    | string  | Sí          | Contraseña actual (debe coincidir)                 |
| `revokeOtherSessions`| boolean | No          | Si `true`, revoca las demás sesiones del usuario   |

**Respuesta (200 OK):** `{ "token": "nuevo-token-si-revocó-sesiones", "user": { ... } }`

**Errores:**

| Código | Código de error       | Caso                          |
| ------ | --------------------- | ----------------------------- |
| `400`  | `INVALID_PASSWORD`    | `currentPassword` incorrecta  |
| `422`  | `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` | Nueva contraseña fuera de rango |

### 7. `POST /api/auth/change-email`

Solicita el cambio de email del usuario autenticado.

**Autenticación:** Requerida

**Body (JSON):**

| Campo         | Tipo   | Obligatorio | Descripción                          |
| ------------- | ------ | ----------- | ------------------------------------ |
| `newEmail`    | string | Sí          | Nuevo email                          |
| `callbackURL` | string | No          | URL de callback de verificación      |

**Respuesta (200 OK):** `{ "status": true }`

### 8. `POST /api/auth/delete-user`

Elimina la cuenta del usuario autenticado. Dependiendo de la configuración puede requerir confirmación por URL.

**Autenticación:** Requerida

**Body (JSON):**

| Campo         | Tipo   | Obligatorio | Descripción                     |
| ------------- | ------ | ----------- | ------------------------------- |
| `callbackURL` | string | No          | URL de confirmación/redirección |

**Respuesta (200 OK):** `{ "success": true }`

### 9. `GET /api/auth/list-sessions`

Lista todas las sesiones activas del usuario autenticado.

**Autenticación:** Requerida

**Respuesta (200 OK):**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "userId": "uuid",
      "expiresAt": "2026-08-19T12:00:00.000Z",
      "createdAt": "2026-08-18T12:00:00.000Z",
      "ipAddress": "127.0.0.1",
      "userAgent": "curl/8.0.0"
    }
  ]
}
```

### 10. `POST /api/auth/revoke-session`

Revoca una sesión específica del usuario autenticado.

**Autenticación:** Requerida

**Body (JSON):**

| Campo   | Tipo   | Obligatorio | Descripción            |
| ------- | ------ | ----------- | ---------------------- |
| `token` | string | Sí          | Token de la sesión     |

**Respuesta (200 OK):** `{ "success": true }`

### 11. `POST /api/auth/revoke-sessions`

Revoca todas las sesiones del usuario autenticado.

**Autenticación:** Requerida

**Body (JSON):**

| Campo   | Tipo   | Obligatorio | Descripción                        |
| ------- | ------ | ----------- | ---------------------------------- |
| `token` | string | No          | Token de la sesión actual (opcional) |

**Respuesta (200 OK):** `{ "success": true }`

### 12. `POST /api/auth/revoke-other-sessions`

Revoca todas las sesiones del usuario excepto la actual.

**Autenticación:** Requerida

**Respuesta (200 OK):** `{ "success": true }`

### 13. `POST /api/auth/update-session`

Actualiza los datos de la sesión actual (p. ej. IP, user agent, país).

**Autenticación:** Requerida

**Respuesta (200 OK):** la sesión actualizada (`{ "session": { ... } }`)

### 14. `POST /api/auth/send-verification-email`

Envía el email de verificación al usuario.

**Autenticación:** No (el email debe pertenecer a un usuario)

**Body (JSON):**

| Campo         | Tipo   | Obligatorio | Descripción                            |
| ------------- | ------ | ----------- | -------------------------------------- |
| `email`       | string | Sí          | Email del usuario                      |
| `callbackURL` | string | No          | URL de callback de verificación        |

**Respuesta (200 OK):** `{ "status": true }`

### 15. `GET /api/auth/verify-email`

Verifica el email con el token enviado por correo. Normalmente se accede por redirección desde el correo.

**Query params:**

| Parámetro     | Tipo   | Obligatorio | Descripción                    |
| ------------- | ------ | ----------- | ------------------------------ |
| `token`       | string | Sí          | Token de verificación          |
| `callbackURL` | string | No          | URL de redirección             |

**Respuesta (200 OK):** `{ "user": { ... } }`

### 16. `POST /api/auth/request-password-reset`

Solicita el restablecimiento de contraseña. Envía un email con el enlace (requiere función `sendResetPassword` configurada; en este proyecto aún no está configurada).

**Autenticación:** No

**Body (JSON):**

| Campo        | Tipo   | Obligatorio | Descripción                                    |
| ------------ | ------ | ----------- | ---------------------------------------------- |
| `email`      | string | Sí          | Email del usuario                              |
| `redirectTo` | string | No          | URL donde redirigir con el token `?token=...`  |

**Respuesta (200 OK):** `{ "status": true, "message": "If this email exists in our system, check your email for the reset link" }`

### 17. `GET /api/auth/reset-password/:token`

Redirige al usuario a la URL de restablecimiento con el token (usado como enlace del correo).

### 18. `POST /api/auth/reset-password`

Establece una nueva contraseña con el token de restablecimiento.

**Autenticación:** No

**Body (JSON):**

| Campo         | Tipo   | Obligatorio | Descripción                    |
| ------------- | ------ | ----------- | ------------------------------ |
| `newPassword` | string | Sí          | Nueva contraseña (mín. 8)      |
| `token`       | string | No          | Token (también aceptado como query param) |

**Respuesta (200 OK):** `{ "status": true }`

### 19. `POST /api/auth/verify-password`

Verifica la contraseña actual del usuario autenticado.

**Autenticación:** Requerida

**Body (JSON):**

| Campo      | Tipo   | Obligatorio | Descripción              |
| ---------- | ------ | ----------- | ------------------------ |
| `password` | string | Sí          | Contraseña a verificar   |

**Respuesta (200 OK):** `{ "valid": true }`

### 20. `GET /api/auth/ok`

Verificación de salud de Better Auth.

**Respuesta (200 OK):** `{ "ok": true }`

### 21. `GET /api/auth/error`

Página de error de Better Auth (p. ej. al fallar callbacks de OAuth).

### 22. `POST /api/auth/sign-in/social` y `GET /api/auth/callback/:id`

Inicio de sesión social y callback de OAuth. **Actualmente no hay proveedores sociales configurados**, por lo que estos endpoints no están operativos.

### 23. `GET /api/auth/list-accounts`

Lista las cuentas vinculadas del usuario autenticado.

**Autenticación:** Requerida

**Respuesta (200 OK):**

```json
{
  "accounts": [
    {
      "id": "uuid",
      "providerId": "credential",
      "accountId": "uuid",
      "userId": "uuid"
    }
  ]
}
```

### 24. `POST /api/auth/link-social`

Vincula una cuenta social al usuario autenticado (requiere proveedores sociales configurados).

**Autenticación:** Requerida

**Body (JSON):**

| Campo      | Tipo   | Obligatorio | Descripción                       |
| ---------- | ------ | ----------- | --------------------------------- |
| `provider` | string | Sí          | Proveedor social                  |
| `token`    | string | No          | Token de sesión                   |
| `callbackURL` | string | No       | URL de redirección                |

### 25. `POST /api/auth/unlink-account`

Desvincula una cuenta social del usuario autenticado.

**Autenticación:** Requerida

**Body (JSON):**

| Campo      | Tipo   | Obligatorio | Descripción                       |
| ---------- | ------ | ----------- | --------------------------------- |
| `providerId` | string | Sí        | Proveedor a desvincular           |
| `accountId`  | string | Sí        | ID de la cuenta a desvincular     |

**Respuesta (200 OK):** `{ "success": true }`

---

## Endpoints de administración (`/api/auth/admin/*`)

Todos requieren sesión con rol **`admin`** (según `adminRoles: ['admin']`). Sin permisos devuelven `403`.

### 26. `POST /api/auth/admin/create-user`

Crea un usuario desde el panel de administración. Puede asignar rol y datos extra.

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo      | Tipo             | Obligatorio | Descripción                                        |
| ---------- | ---------------- | ----------- | -------------------------------------------------- |
| `email`    | string           | Sí          | Email (no debe existir)                            |
| `name`     | string           | Sí          | Nombre del usuario                                 |
| `password` | string           | No          | Si se omite, el usuario no tendrá credenciales     |
| `role`     | string o array   | No          | Rol(es): `admin`, `trainer`, `receptionist`, `member` (default: `member`) |
| `data`     | objeto           | No          | Campos adicionales del usuario                     |

**Ejemplo:**

```json
{
  "email": "entrenador@example.com",
  "name": "Carlos López",
  "password": "password123",
  "role": "trainer"
}
```

**Respuesta (200 OK):** `{ "user": { ... } }`

### 27. `POST /api/auth/admin/set-role`

Cambia el rol de un usuario.

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo    | Tipo           | Obligatorio | Descripción                                        |
| -------- | -------------- | ----------- | -------------------------------------------------- |
| `userId` | string         | Sí          | ID del usuario                                     |
| `role`   | string o array | Sí          | Rol(es) a asignar (debe existir en la configuración) |

**Ejemplo:**

```json
{
  "userId": "uuid",
  "role": "receptionist"
}
```

**Respuesta (200 OK):** `{ "user": { ... } }`

### 28. `POST /api/auth/admin/update-user`

Actualiza datos de un usuario (nombre, email, rol, baneo, etc.). **No permite cambiar la contraseña** (usar `set-user-password`).

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo    | Tipo   | Obligatorio | Descripción                  |
| -------- | ------ | ----------- | ---------------------------- |
| `userId` | string | Sí          | ID del usuario               |
| `data`   | objeto | Sí          | Datos a actualizar (no vacío)|

**Ejemplo:**

```json
{
  "userId": "uuid",
  "data": {
    "name": "Nuevo Nombre",
    "role": "trainer"
  }
}
```

**Respuesta (200 OK):** el usuario actualizado (`{ "user": { ... } }`)

**Errores:**

| Código | Código de error              | Caso                                |
| ------ | ---------------------------- | ----------------------------------- |
| `400`  | `PASSWORD_CANNOT_BE_UPDATED_VIA_UPDATE_USER` | Intentar cambiar contraseña |
| `400`  | `NO_DATA_TO_UPDATE`          | `data` vacío                        |
| `404`  | `USER_NOT_FOUND`             | El usuario no existe                |

### 29. `GET /api/auth/admin/get-user`

Obtiene un usuario por ID.

**Autenticación:** Solo `admin`

**Query params:**

| Parámetro | Tipo   | Obligatorio | Descripción   |
| --------- | ------ | ----------- | ------------- |
| `id`      | string | Sí          | ID del usuario|

**Respuesta (200 OK):** el usuario (`{ "user": { ... } }`)

### 30. `GET /api/auth/admin/list-users`

Lista usuarios con búsqueda, filtros, paginación y ordenamiento.

**Autenticación:** Solo `admin`

**Query params (todos opcionales):**

| Parámetro         | Tipo                | Descripción                                   |
| ----------------- | ------------------- | --------------------------------------------- |
| `searchValue`     | string              | Valor a buscar                                |
| `searchField`     | `email` o `name`    | Campo donde buscar (default: `email`)         |
| `searchOperator`  | `contains`, `starts_with`, `ends_with` | Operador de búsqueda (default: `contains`) |
| `limit`           | number              | Cantidad de resultados                        |
| `offset`          | number              | Desplazamiento para paginación                |
| `sortBy`          | string              | Campo por el que ordenar                      |
| `sortDirection`   | `asc` o `desc`      | Dirección del orden (default: `asc`)          |
| `filterField`     | string              | Campo a filtrar                               |
| `filterValue`     | string o number o boolean o array | Valor del filtro                |
| `filterOperator`  | `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `contains`, `starts_with`, `ends_with` | Operador del filtro (default: `eq`) |

**Ejemplo:**

```
GET /api/auth/admin/list-users?searchValue=juan&searchField=name&limit=10&offset=0&sortBy=createdAt&sortDirection=desc
```

**Respuesta (200 OK):**

```json
{
  "users": [{ "id": "uuid", "email": "juan@example.com", "name": "Juan Pérez", "role": "member" }],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### 31. `POST /api/auth/admin/list-user-sessions`

Lista las sesiones de un usuario.

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo    | Tipo   | Obligatorio | Descripción      |
| -------- | ------ | ----------- | ---------------- |
| `userId` | string | Sí          | ID del usuario   |

**Respuesta (200 OK):** `{ "sessions": [ ... ] }`

### 32. `POST /api/auth/admin/revoke-user-session`

Revoca una sesión específica de un usuario.

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo          | Tipo   | Obligatorio | Descripción        |
| -------------- | ------ | ----------- | ------------------ |
| `sessionToken` | string | Sí          | Token de la sesión |

**Respuesta (200 OK):** `{ "success": true }`

### 33. `POST /api/auth/admin/revoke-user-sessions`

Revoca todas las sesiones de un usuario.

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo    | Tipo   | Obligatorio | Descripción      |
| -------- | ------ | ----------- | ---------------- |
| `userId` | string | Sí          | ID del usuario   |

**Respuesta (200 OK):** `{ "success": true }`

### 34. `POST /api/auth/admin/remove-user`

Elimina un usuario y todas sus sesiones y cuentas (irreversible).

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo    | Tipo   | Obligatorio | Descripción              |
| -------- | ------ | ----------- | ------------------------ |
| `userId` | string | Sí          | ID del usuario           |

**Respuesta (200 OK):** `{ "success": true }`

**Errores:**

| Código | Código de error         | Caso                          |
| ------ | ----------------------- | ----------------------------- |
| `400`  | `YOU_CANNOT_REMOVE_YOURSELF` | Intentar eliminarse a sí mismo |
| `404`  | `USER_NOT_FOUND`        | El usuario no existe          |

### 35. `POST /api/auth/admin/ban-user`

Banea a un usuario (revoca todas sus sesiones).

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo          | Tipo   | Obligatorio | Descripción                             |
| -------------- | ------ | ----------- | --------------------------------------- |
| `userId`       | string | Sí          | ID del usuario                          |
| `banReason`    | string | No          | Motivo del baneo (default: `No reason`) |
| `banExpiresIn` | number | No          | Duración del baneo en segundos          |

**Respuesta (200 OK):** `{ "user": { ... } }`

**Errores:**

| Código | Código de error         | Caso                       |
| ------ | ----------------------- | -------------------------- |
| `400`  | `YOU_CANNOT_BAN_YOURSELF` | Intentar banearse a sí mismo |
| `404`  | `USER_NOT_FOUND`        | El usuario no existe       |

### 36. `POST /api/auth/admin/unban-user`

Quita el baneo de un usuario.

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo    | Tipo   | Obligatorio | Descripción      |
| -------- | ------ | ----------- | ---------------- |
| `userId` | string | Sí          | ID del usuario   |

**Respuesta (200 OK):** `{ "user": { ... } }`

### 37. `POST /api/auth/admin/set-user-password`

Establece la contraseña de un usuario (sin conocer la actual).

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo         | Tipo   | Obligatorio | Descripción                    |
| ------------- | ------ | ----------- | ------------------------------ |
| `userId`      | string | Sí          | ID del usuario                 |
| `newPassword` | string | Sí          | Nueva contraseña (mín. 8)      |

**Respuesta (200 OK):** `{ "status": true }`

### 38. `POST /api/auth/admin/impersonate-user`

Inicia una sesión como otro usuario (requiere configuración adicional).

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo    | Tipo   | Obligatorio | Descripción      |
| -------- | ------ | ----------- | ---------------- |
| `userId` | string | Sí          | ID del usuario   |

**Respuesta (200 OK):** `{ "session": { ... }, "user": { ... } }`

### 39. `POST /api/auth/admin/stop-impersonating`

Termina la sesión de impersonación.

**Autenticación:** Solo `admin`

**Respuesta (200 OK):** `{ "session": { ... }, "user": { ... } }`

### 40. `POST /api/auth/admin/has-permission`

Verifica si un usuario/rol tiene permisos.

**Autenticación:** Solo `admin`

**Body (JSON):**

| Campo         | Tipo             | Obligatorio | Descripción                              |
| ------------- | ---------------- | ----------- | ---------------------------------------- |
| `permission`  | objeto           | No (uno de los dos) | `{ "recurso": ["acción", ...] }`  |
| `permissions` | objeto           | No (uno de los dos) | Igual que `permission`            |
| `userId`      | string           | No          | ID del usuario a evaluar                  |
| `role`        | string           | No          | Rol a evaluar                             |

**Ejemplo:**

```json
{
  "userId": "uuid",
  "permission": { "members": ["read"] }
}
```

**Respuesta (200 OK):** `{ "success": true }` o `{ "success": false }`

---

## Notas

- Los endpoints de `members` no tienen guard de roles todavía, solo de autenticación (`AuthGuard`).
- Los DTO de `users` (`create-user.dto.ts` y `update-user.dto.ts`) están vacíos; cuando se implementen, actualizar esta documentación.
- El flujo de reset de contraseña y verificación de email requieren funciones de envío de correo (`sendResetPassword`, `sendVerificationEmail`) que aún no están configuradas en `src/auth/auth.ts`.
- Los proveedores sociales (Google, GitHub, etc.) no están configurados; los endpoints de `sign-in/social`, `callback`, `link-social` y `unlink-account` no operan hasta configurarlos.