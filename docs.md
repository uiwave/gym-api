Quiero que completes TODO el backend de un sistema de gestión para un gimnasio (GYM API).

IMPORTANTE:
- No quiero una explicación teórica.
- Quiero que analices el proyecto existente y MODIFIQUES/CREES los archivos necesarios.
- Antes de crear algo nuevo, revisa la estructura y el código existente para no duplicar módulos, servicios, guards, tablas o configuraciones.
- Mantén compatibilidad con lo que ya está implementado.
- Si algo ya existe y funciona, reutilízalo.
- No reemplaces tecnologías existentes por otras.
- No uses ORM.
- Usa PostgreSQL directamente mediante `pg`.
- Usa SQL parametrizado para TODAS las consultas.
- No concatenes valores del usuario directamente dentro de SQL.
- Usa TypeScript estricto.
- El proyecto debe quedar compilando sin errores.
- El proyecto debe quedar listo para ejecutarse.

==================================================
1. STACK OBLIGATORIO
==================================================

Backend:

- NestJS 11.2.1
- TypeScript
- pnpm
- PostgreSQL 18
- package `pg`
- Better Auth 1.6.30
- @thallesp/nestjs-better-auth 2.7.0
- class-validator
- class-transformer

NO utilizar:
- Prisma
- TypeORM
- Sequelize
- MikroORM
- Drizzle ORM
- ningún ORM

La comunicación con PostgreSQL debe realizarse mediante `pg` y SQL.

==================================================
2. ARQUITECTURA EXISTENTE
==================================================

El proyecto actualmente tiene aproximadamente esta estructura:

src/
├── auth/
├── database/
├── users/
├── members/
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts

Mantener esta arquitectura y ampliarla.

Los módulos principales que deben existir son:

src/
├── auth/
├── users/
├── members/
├── memberships/
├── plans/
├── payments/
├── attendance/
├── trainers/
├── routines/
├── exercises/
├── notifications/
├── reports/
└── database/

Cada módulo debe seguir la arquitectura estándar de NestJS:

module
controller
service
dto
types/interfaces cuando sea necesario

No crear archivos innecesarios.

==================================================
3. CONFIGURACIÓN ACTUAL DE BETTER AUTH
==================================================

Ya existe Better Auth funcionando.

Se utiliza:

better-auth@1.6.30

La autenticación utiliza PostgreSQL.

La configuración debe mantenerse compatible con:

- Better Auth
- email/password
- sesiones
- roles
- admin plugin

Actualmente existen estos roles:

- admin
- trainer
- receptionist
- member

El rol por defecto es:

member

El sistema utiliza:

AuthGuard

para proteger endpoints.

NO eliminar ni reemplazar el AuthGuard existente.

==================================================
4. VARIABLES DE ENTORNO
==================================================

Mantener soporte para:

DATABASE_HOST
DATABASE_PORT
DATABASE_USER
DATABASE_PASSWORD
DATABASE_NAME

BETTER_AUTH_SECRET
BETTER_AUTH_URL

No hardcodear credenciales.

Utilizar ConfigModule de NestJS.

Validar las variables necesarias cuando sea apropiado.

==================================================
5. BASE DE DATOS
==================================================

Quiero una base de datos completa para un gimnasio.

IMPORTANTE:

Better Auth YA utiliza estas tablas:

"user"
"session"
"account"
"verification"

NO crear otras tablas duplicadas para autenticación.

Existe actualmente una tabla:

users

que pertenece al dominio de la aplicación.

Analiza si esta tabla debe mantenerse o si debe adaptarse para trabajar correctamente con Better Auth.

No dupliques información innecesariamente.

==================================================
6. TABLAS DEL SISTEMA
==================================================

Implementar como mínimo las siguientes entidades:

1. users
2. members
3. plans
4. memberships
5. payments
6. trainers
7. exercises
8. routines
9. routine_exercises
10. attendance
11. notifications

Además, si es necesario para reportes o funcionamiento interno, puedes crear tablas auxiliares justificadas.

Usar:

UUID para las entidades del dominio cuando corresponda.

PostgreSQL debe utilizar:

gen_random_uuid()

para generar UUID.

Agregar:

PRIMARY KEY
FOREIGN KEY
UNIQUE
NOT NULL
CHECK
DEFAULT

cuando corresponda.

Crear índices en columnas utilizadas frecuentemente para búsquedas.

==================================================
7. RELACIONES
==================================================

Diseñar correctamente las relaciones.

Conceptualmente:

USER
 |
 └── MEMBER
      |
      └── MEMBERSHIP
             |
             └── PLAN

MEMBER
 |
 └── PAYMENTS

MEMBER
 |
 └── ATTENDANCE

TRAINER
 |
 └── ROUTINES
        |
        └── ROUTINE_EXERCISES
                    |
                    └── EXERCISES

USER
 |
 └── NOTIFICATIONS

El diseño debe evitar relaciones circulares innecesarias.

==================================================
8. MEMBERS
==================================================

La tabla members debe manejar información como:

id
user_id
document_number
phone
birth_date
address
emergency_contact_name
emergency_contact_phone
status
created_at
updated_at

El user_id debe relacionarse correctamente con el usuario autenticado de Better Auth.

Un usuario no debe poder crear un miembro para otro usuario arbitrariamente.

El user_id debe obtenerse desde:

request.user.id

cuando corresponda.

Implementar:

POST /members
GET /members
GET /members/:id
PATCH /members/:id
DELETE /members/:id

Validar UUIDs con:

@IsUUID()

==================================================
9. PLANS
==================================================

Crear sistema de planes del gimnasio.

Ejemplos:

BASIC
PREMIUM
VIP

Campos recomendados:

id
name
description
price
duration_days
status
created_at
updated_at

Endpoints:

POST /plans
GET /plans
GET /plans/:id
PATCH /plans/:id
DELETE /plans/:id

Solo ADMIN debería poder crear/modificar/eliminar planes.

Los usuarios normales pueden consultar planes activos.

==================================================
10. MEMBERSHIPS
==================================================

Una membresía relaciona:

member + plan

Campos recomendados:

id
member_id
plan_id
start_date
end_date
status
price
created_at
updated_at

Estados:

ACTIVE
EXPIRED
CANCELLED
PENDING

Endpoints:

POST /memberships
GET /memberships
GET /memberships/:id
GET /members/:memberId/memberships
PATCH /memberships/:id
DELETE /memberships/:id

Validar que:

- member exista
- plan exista
- fechas sean válidas
- end_date sea posterior a start_date cuando corresponda

==================================================
11. PAYMENTS
==================================================

Crear sistema de pagos.

Campos recomendados:

id
member_id
membership_id
amount
payment_method
payment_date
status
reference
notes
created_at
updated_at

Métodos:

CASH
CARD
TRANSFER
YAPE
PLIN
OTHER

Estados:

PENDING
COMPLETED
FAILED
REFUNDED

Endpoints:

POST /payments
GET /payments
GET /payments/:id
GET /members/:memberId/payments
PATCH /payments/:id

No permitir que un MEMBER modifique pagos arbitrariamente.

==================================================
12. TRAINERS
==================================================

Crear módulo de entrenadores.

Un trainer debe estar relacionado con un usuario.

Campos:

id
user_id
specialization
phone
bio
status
created_at
updated_at

Endpoints:

POST /trainers
GET /trainers
GET /trainers/:id
PATCH /trainers/:id
DELETE /trainers/:id

Roles permitidos según corresponda:

ADMIN
TRAINER

==================================================
13. EXERCISES
==================================================

Crear catálogo de ejercicios.

Campos:

id
name
description
muscle_group
equipment
difficulty
instructions
image_url
created_at
updated_at

Dificultad:

BEGINNER
INTERMEDIATE
ADVANCED

Endpoints:

POST /exercises
GET /exercises
GET /exercises/:id
PATCH /exercises/:id
DELETE /exercises/:id

Agregar filtros cuando sea útil:

GET /exercises?muscleGroup=CHEST
GET /exercises?difficulty=BEGINNER

==================================================
14. ROUTINES
==================================================

Crear rutinas de entrenamiento.

Una rutina pertenece a:

member
trainer

Campos:

id
member_id
trainer_id
name
description
start_date
end_date
status
created_at
updated_at

Estados:

ACTIVE
INACTIVE
COMPLETED

Endpoints:

POST /routines
GET /routines
GET /routines/:id
GET /members/:memberId/routines
PATCH /routines/:id
DELETE /routines/:id

==================================================
15. ROUTINE_EXERCISES
==================================================

Una rutina contiene múltiples ejercicios.

Crear tabla:

routine_exercises

Campos recomendados:

id
routine_id
exercise_id
sets
repetitions
weight
rest_seconds
notes
order_index
created_at
updated_at

Crear endpoints apropiados para:

agregar ejercicio a rutina
listar ejercicios de rutina
actualizar ejercicio de rutina
eliminar ejercicio de rutina

Por ejemplo:

POST /routines/:routineId/exercises

GET /routines/:routineId/exercises

PATCH /routines/:routineId/exercises/:exerciseId

DELETE /routines/:routineId/exercises/:exerciseId

==================================================
16. ATTENDANCE
==================================================

Sistema de asistencia.

Campos:

id
member_id
check_in
check_out
date
created_at

Endpoints:

POST /attendance/check-in
POST /attendance/check-out
GET /attendance
GET /members/:memberId/attendance
GET /attendance/:id

Validar:

- miembro existente
- membresía activa cuando corresponda
- evitar múltiples check-in abiertos
- check_out posterior a check_in

==================================================
17. NOTIFICATIONS
==================================================

Crear sistema de notificaciones.

Campos:

id
user_id
title
message
type
read
created_at

Tipos:

INFO
WARNING
SUCCESS
PAYMENT
MEMBERSHIP
SYSTEM

Endpoints:

GET /notifications
PATCH /notifications/:id/read
PATCH /notifications/read-all
DELETE /notifications/:id

Un usuario solamente puede consultar sus propias notificaciones.

ADMIN puede generar notificaciones cuando corresponda.

==================================================
18. REPORTS
==================================================

Crear módulo de reportes.

No necesariamente necesita una tabla propia.

Utilizar consultas SQL agregadas.

Crear endpoints:

GET /reports/dashboard
GET /reports/members
GET /reports/revenue
GET /reports/attendance
GET /reports/memberships

Ejemplo dashboard:

{
  "totalMembers": 100,
  "activeMembers": 80,
  "expiredMemberships": 10,
  "monthlyRevenue": 12500,
  "todayAttendance": 42
}

Usar SQL:

COUNT
SUM
AVG
GROUP BY
DATE_TRUNC

cuando corresponda.

==================================================
19. ROLES Y AUTORIZACIÓN
==================================================

Implementar autorización real.

Roles:

ADMIN
TRAINER
RECEPTIONIST
MEMBER

Reglas generales:

ADMIN:
- acceso completo

RECEPTIONIST:
- administrar miembros
- membresías
- pagos
- asistencia
- consultar planes
- consultar usuarios

TRAINER:
- consultar miembros asignados
- administrar rutinas
- ejercicios
- consultar asistencia cuando corresponda

MEMBER:
- consultar su propio perfil
- consultar su propia membresía
- consultar sus pagos
- consultar sus rutinas
- consultar ejercicios
- consultar sus notificaciones
- registrar/check-in si el diseño lo permite

MUY IMPORTANTE:

Un MEMBER no puede:

- listar todos los miembros
- modificar otro miembro
- consultar pagos de otro miembro
- consultar rutinas de otro miembro
- modificar planes
- modificar pagos
- administrar usuarios

==================================================
20. BETTER AUTH
==================================================

Mantener Better Auth como sistema de autenticación.

Debe soportar:

- registro
- login
- logout
- sesión
- usuario actual
- roles
- bloqueo de usuarios cuando corresponda

Mantener:

AuthGuard

y crear guards/decorators adicionales si son necesarios.

Por ejemplo:

@Roles('admin')

o un sistema equivalente compatible con Better Auth.

No implementar un sistema JWT paralelo si Better Auth ya maneja las sesiones.

==================================================
21. SEGURIDAD
==================================================

Aplicar buenas prácticas.

Obligatorio:

- SQL parametrizado
- validación de DTO
- @IsUUID()
- @IsString()
- @IsEmail()
- @IsEnum()
- @IsOptional()
- @IsDateString()
- límites de longitud
- validación de números
- control de roles
- autenticación en endpoints privados
- no confiar en userId enviado por el cliente
- no exponer passwords
- no exponer tokens
- no exponer información sensible

Evitar:

SQL injection
IDOR
Broken Access Control
Mass Assignment
exposición de información sensible

==================================================
22. MANEJO DE ERRORES
==================================================

No devolver 500 para errores esperables.

Utilizar excepciones NestJS:

NotFoundException
BadRequestException
UnauthorizedException
ForbiddenException
ConflictException

Ejemplos:

UUID inválido → 400

recurso inexistente → 404

sin sesión → 401

sin permisos → 403

duplicado → 409

No mostrar errores internos de PostgreSQL al cliente en producción.

==================================================
23. SQL
==================================================

Crear migraciones SQL.

Por ejemplo:

src/database/migrations/

001_initial_schema.sql
002_better_auth.sql
003_gym_tables.sql
004_indexes.sql
...

IMPORTANTE:

Better Auth ya tiene su migración existente.

No destruir ni duplicar esas tablas.

Las migraciones del dominio del gimnasio deben poder ejecutarse mediante:

psql

y crear correctamente todas las tablas.

==================================================
24. DATABASE SERVICE
==================================================

Mantener un servicio central para PostgreSQL.

Ejemplo conceptual:

DatabaseService

que encapsule:

Pool

y permita:

query()

No crear un Pool nuevo en cada request.

Utilizar una única conexión Pool administrada por NestJS.

==================================================
25. DTOs
==================================================

Cada módulo debe tener DTOs apropiados.

Ejemplo:

members/dto/
├── create-member.dto.ts
├── update-member.dto.ts
└── member-id.dto.ts

plans/dto/
├── create-plan.dto.ts
└── update-plan.dto.ts

etc.

Los DTOs deben validar todos los datos provenientes del cliente.

Utilizar:

PartialType

si es apropiado.

==================================================
26. RESPUESTAS API
==================================================

Mantener respuestas consistentes.

Ejemplo:

{
  "data": {}
}

Para listas:

{
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}

Para errores:

{
  "statusCode": 400,
  "message": "...",
  "error": "Bad Request"
}

==================================================
27. PAGINACIÓN
==================================================

Implementar paginación en endpoints de listados importantes.

Ejemplo:

GET /members?page=1&limit=20

GET /payments?page=1&limit=20

GET /attendance?page=1&limit=20

GET /notifications?page=1&limit=20

Limitar el máximo de registros por página.

==================================================
28. FILTROS Y BÚSQUEDA
==================================================

Implementar filtros útiles.

Members:

GET /members?status=active

GET /members?search=Erick

Payments:

GET /payments?status=COMPLETED

GET /payments?from=2026-01-01&to=2026-01-31

Attendance:

GET /attendance?from=2026-01-01&to=2026-01-31

Exercises:

GET /exercises?muscleGroup=CHEST

==================================================
29. ÍNDICES
==================================================

Crear índices apropiados para:

users.email
members.user_id
members.document_number
members.status
memberships.member_id
memberships.plan_id
memberships.status
payments.member_id
payments.membership_id
payments.payment_date
attendance.member_id
attendance.date
trainers.user_id
routines.member_id
routines.trainer_id
routine_exercises.routine_id
routine_exercises.exercise_id
notifications.user_id
notifications.read

==================================================
30. TRANSACCIONES
==================================================

Utilizar transacciones PostgreSQL cuando una operación modifique varias tablas.

Ejemplo:

crear membresía + registrar pago

o:

crear rutina + insertar ejercicios

Utilizar:

BEGIN
COMMIT
ROLLBACK

mediante pg.

==================================================
31. INTEGRIDAD DE DATOS
==================================================

Agregar constraints cuando corresponda.

Por ejemplo:

price >= 0

amount > 0

sets > 0

repetitions > 0

rest_seconds >= 0

end_date >= start_date

No permitir valores imposibles.

==================================================
32. SWAGGER
==================================================

Agregar Swagger a NestJS.

Instalar:

@nestjs/swagger

Crear documentación para los endpoints.

Configurar:

/api/docs

Documentar:

- endpoints
- DTOs
- respuestas
- parámetros
- autenticación cuando corresponda

==================================================
33. HEALTH CHECK
==================================================

Crear:

GET /health

Debe comprobar que:

- API está funcionando
- PostgreSQL está disponible

Respuesta aproximada:

{
  "status": "ok",
  "database": "connected"
}

==================================================
34. CORS
==================================================

Configurar CORS mediante variables de entorno.

No hardcodear el frontend.

Por ejemplo:

CORS_ORIGIN=http://localhost:4321

==================================================
35. VARIABLES DE ENTORNO
==================================================

Actualizar `.env.example`.

Debe contener algo como:

DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

CORS_ORIGIN=

PORT=3000

NO colocar credenciales reales en `.env.example`.

==================================================
36. TESTS
==================================================

Crear tests básicos para los servicios y endpoints críticos.

Como mínimo:

Auth
Members
Plans
Memberships
Payments
Attendance

No eliminar los tests existentes.

Si existen archivos:

*.spec.ts

mantenerlos y actualizarlos cuando sea necesario.

==================================================
37. CALIDAD DEL CÓDIGO
==================================================

Mantener:

- TypeScript limpio
- nombres claros
- funciones pequeñas
- responsabilidades separadas
- servicios sin lógica innecesaria
- controllers delgados
- SQL dentro de services/repositories
- DTOs separados
- guards separados
- types/interfaces cuando sean necesarios

No meter toda la lógica dentro del controller.

==================================================
38. NO ORM
==================================================

ESTO ES MUY IMPORTANTE:

NO instalar:

Prisma
TypeORM
Drizzle
Sequelize
MikroORM

Toda la base de datos debe utilizar:

pg

Ejemplo:

const result = await pool.query(
  `
    SELECT *
    FROM members
    WHERE id = $1
  `,
  [id],
);

==================================================
39. REVISIÓN DEL PROYECTO
==================================================

Antes de modificar archivos:

1. Inspecciona package.json.
2. Inspecciona tsconfig.json.
3. Inspecciona src/.
4. Inspecciona módulos existentes.
5. Inspecciona DatabaseModule.
6. Inspecciona DatabaseService.
7. Inspecciona AuthModule.
8. Inspecciona auth.ts.
9. Inspecciona AuthGuard.
10. Inspecciona permissions.
11. Inspecciona las migraciones existentes.
12. Inspecciona la estructura real de PostgreSQL.

No asumir nombres de métodos o archivos que no existen.

==================================================
40. ORDEN DE IMPLEMENTACIÓN
==================================================

Implementar en este orden:

FASE 1
- revisar arquitectura
- revisar Better Auth
- revisar DatabaseModule
- revisar PostgreSQL

FASE 2
- completar schema SQL
- foreign keys
- constraints
- índices
- migraciones

FASE 3
- Users
- Members

FASE 4
- Plans
- Memberships

FASE 5
- Payments

FASE 6
- Trainers
- Exercises
- Routines
- RoutineExercises

FASE 7
- Attendance

FASE 8
- Notifications

FASE 9
- Reports
- Dashboard

FASE 10
- Roles
- Guards
- autorización

FASE 11
- Swagger
- Health check
- CORS

FASE 12
- tests
- validaciones
- revisión de errores
- compilación final

==================================================
41. COMANDOS
==================================================

El proyecto utiliza pnpm.

No utilizar npm ni yarn.

Para instalar:

pnpm add ...

Para desarrollo:

pnpm start:dev

Para compilar:

pnpm build

Antes de terminar debes ejecutar:

pnpm build

y corregir TODOS los errores.

==================================================
42. CRITERIO FINAL DE ÉXITO
==================================================

Consideraré terminado el backend cuando:

1. `pnpm build` no tenga errores.
2. NestJS arranque correctamente.
3. PostgreSQL conecte correctamente.
4. Better Auth funcione.
5. Login funcione.
6. Registro funcione.
7. Logout funcione.
8. Sesiones funcionen.
9. Roles funcionen.
10. Members funcionen.
11. Plans funcionen.
12. Memberships funcionen.
13. Payments funcionen.
14. Trainers funcionen.
15. Exercises funcionen.
16. Routines funcionen.
17. Routine exercises funcionen.
18. Attendance funcione.
19. Notifications funcionen.
20. Reports funcionen.
21. Swagger funcione.
22. `/health` funcione.
23. Las validaciones funcionen.
24. Los UUID inválidos devuelvan 400.
25. Recursos inexistentes devuelvan 404.
26. Usuarios sin permisos devuelvan 403.
27. Usuarios sin autenticación devuelvan 401.
28. No existan consultas SQL vulnerables a SQL injection.
29. No existan ORMs.
30. No existan tablas duplicadas de Better Auth.
31. No existan credenciales hardcodeadas.
32. No existan errores TypeScript.

==================================================
43. MUY IMPORTANTE SOBRE MI PROGRESO ACTUAL
==================================================

Actualmente YA tengo funcionando:

- NestJS 11.2.1
- TypeScript
- pnpm
- PostgreSQL
- Better Auth 1.6.30
- @thallesp/nestjs-better-auth
- AuthModule
- AuthGuard
- roles de Better Auth
- DatabaseModule
- DatabaseService
- UsersModule
- MembersModule
- MembersService
- GET /members
- GET /members/:id
- ValidationPipe global
- DTO MemberIdDto
- validación de UUID
- registro/login con Better Auth
- tablas de Better Auth:
  user
  session
  account
  verification

La tabla actual `members` tiene:

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id TEXT NOT NULL
document_number VARCHAR(20)
phone VARCHAR(20)
birth_date DATE
address TEXT
emergency_contact_name VARCHAR(100)
emergency_contact_phone VARCHAR(20)
status VARCHAR(20) DEFAULT 'active'
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

La tabla `users` existente tiene:

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
first_name VARCHAR(100)
last_name VARCHAR(100)
email VARCHAR(255)
password_hash TEXT
role VARCHAR(50)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

IMPORTANTE:
Antes de decidir qué hacer con `users`, analiza la relación con Better Auth y evita duplicar la identidad/autenticación.

==================================================
44. REGLA FINAL
==================================================

No quiero que simplemente me digas qué código debería escribir.

QUIERO QUE IMPLEMENTES EL SISTEMA EN EL PROYECTO.

Después de cada fase:

1. realiza los cambios;
2. ejecuta la compilación;
3. corrige errores;
4. verifica que no hayas roto lo existente;
5. continúa con la siguiente fase.

Si encuentras una decisión arquitectónica ambigua, elige la solución más segura y mantenible que sea compatible con:

NestJS 11.2.1
TypeScript
PostgreSQL
pg
Better Auth 1.6.30
pnpm
sin ORM.

Al finalizar, dame un resumen de:

- archivos creados
- archivos modificados
- tablas creadas
- endpoints creados
- roles y permisos
- migraciones
- comandos para ejecutar el proyecto
- cualquier configuración que todavía tenga que realizar manualmente.

NO DES POR TERMINADO EL TRABAJO HASTA QUE `pnpm build` TERMINE SIN ERRORES.