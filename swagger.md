# Guía de Swagger para NestJS

Guía práctica para implementar Swagger en proyectos NestJS sin los problemas típicos de autenticación. Basada en la experiencia real del proyecto GYM API.

## 1. Instalación

```bash
pnpm add @nestjs/swagger
```

Para NestJS 11 se usa la v11 (`@nestjs/swagger@^11`). Swagger genera la documentación automáticamente a partir de los decoradores de `class-validator` de tus DTOs, así que no necesitas describir cada campo manualmente (aunque puedes enriquecer con `@ApiProperty`).

## 2. Configuración en `main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // solo si usas @thallesp/nestjs-better-auth (consume el body crudo)
  });

  // CORS si el frontend vive en otro origen
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
      : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // necesario para convertir query params (page, limit, etc.)
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('GYM API')
    .setDescription('Sistema de gestión para gimnasio')
    .setVersion('1.0')
    .addBearerAuth() // registra el esquema "bearer" en components.securitySchemes
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // ⚠️ LÍNEA CLAVE: sin esto Swagger UI JAMÁS envía el header Authorization
  document.security = [{ bearer: [] }];

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

La documentación queda disponible en:

- UI interactiva: `http://localhost:3000/api/docs`
- JSON OpenAPI crudo: `http://localhost:3000/api/docs-json` (útil para verificar)

## 3. Los 3 problemas reales (y sus soluciones)

### Problema 1: Swagger UI nunca envía el header Authorization → 401

**Síntoma:** todos los endpoints protegidos dan 401 desde la UI, pero funcionan perfecto con curl/Postman/PowerShell.

**Causa:** `addBearerAuth()` solo registra el esquema `bearer` en `components.securitySchemes`. No lo marca como *requerido* en ninguna operación. Swagger UI únicamente adjunta el header `Authorization` a las operaciones que declaren ese esquema en su campo `security`. Sin ese campo, la petición sale **sin header**, no con un header inválido.

**Verificación (para confirmar la causa):**

```powershell
$doc = Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/docs-json'
$doc.security                    # vacío → problema confirmado
$doc.paths.'/members'.get.security  # vacío → problema confirmado
$doc.components.securitySchemes  # {"bearer": {...}} → el esquema existe pero no se exige
```

**Solución (una línea):** después de `createDocument`, agregar la seguridad global:

```ts
const document = SwaggerModule.createDocument(app, config);
document.security = [{ bearer: [] }];
SwaggerModule.setup('api/docs', app, document);
```

Todas las operaciones heredan `security: [{ bearer: [] }]` y Swagger UI manda el header a todas.

**Alternativa:** decorar cada controlador protegido con `@ApiBearerAuth()` (aplica a todos sus métodos). Úsala si quieres el candado solo en rutas específicas.

### Problema 2: Better Auth 1.6.30 no lee `Authorization: Bearer` → 401

**Síntoma:** inicias sesión, copias el `token` de la respuesta del sign-in, lo pegas en Authorize y obtienes 401 "No autenticado".

**Causa:** el `getSession` de Better Auth 1.6.30 resuelve la sesión **solo** leyendo la cookie firmada `better-auth.session_token` (`getSignedCookie`). No mira el header `Authorization`. Además, el `token` del body del sign-in es el token *crudo* (guardado en la tabla `session`), que es distinto del valor firmado de la cookie.

**Solución:** en tu guard de autenticación, si la petición trae `Authorization: Bearer <token>`, validar el token crudo directamente contra la tabla `session`:

```ts
// src/auth/guards/auth.guard.ts (patrón)
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest<AuthRequest>();
  const authorization = request.headers.authorization;

  if (authorization) {
    // Normaliza el token: quita espacios y TODOS los prefijos "Bearer " repetidos
    // (soporta "Bearer <t>", "Bearer Bearer <t>", "<t>" pelado, etc.)
    let token = authorization.trim();
    while (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
    if (token) {
      return this.authenticateWithBearer(request, token);
    }
  }

  return this.authenticateWithCookie(request); // flujo normal con cookies
}

private async authenticateWithBearer(request: AuthRequest, token: string) {
  const session = await this.databaseService.query(
    `SELECT id, "userId", "expiresAt"
     FROM "session"
     WHERE token = $1 AND "expiresAt" > now()
     LIMIT 1`,
    [token],
  );

  if (session.rows.length === 0) {
    throw new UnauthorizedException('No autenticado');
  }

  const user = await this.databaseService.query(
    `SELECT id, name, email, "emailVerified", image, banned,
            "banReason", "banExpires", role, "createdAt", "updatedAt"
     FROM "user"
     WHERE id = $1`,
    [session.rows[0].userId],
  );

  if (user.rows.length === 0) {
    throw new UnauthorizedException('No autenticado');
  }

  request.user = { ...user.rows[0] };
  request.session = { ...session.rows[0], token };
  return true;
}
```

> La normalización del token es importante: si el usuario pega `Bearer <token>` en el cuadro de Authorize, Swagger UI envía `Authorization: Bearer Bearer <token>` y la búsqueda en BD falla.

**Alternativa sin cambiar código:** copiar el valor de `Set-Cookie: better-auth.session_token=<firmado>` de la respuesta del sign-in y enviarlo como header `Cookie: better-auth.session_token=<firmado>`. Funciona en Postman/Thunder Client, pero Swagger UI no permite mandar cookies arbitrarias.

### Problema 3: 401 persiste aunque corrijas el código

**Síntoma:** aplicas el fix, reinicias el servidor, y Swagger sigue dando 401.

**Causas:**
- Swagger UI **persiste el estado de autorización en `localStorage`** (por URL). Si antes autorizaste con un valor malo, ese valor sigue ahí y se envía en cada request.
- El navegador **cachea la página** de Swagger (el spec embebido en `swagger-ui-init.js`). Si el servidor cambió el spec, el navegador sigue usando el viejo.

**Solución:**
1. Recarga forzada de la página: `Ctrl+Shift+R` (o `Ctrl+F5`).
2. En el candado **Authorize** → click en **Logout** para limpiar el estado viejo.
3. Volver a abrir Authorize → pegar el token → **Authorize** → cerrar.
4. Probar con **Try it out** → **Execute**.

## 4. Flujo de prueba rápido (no culpes a Swagger antes de tiempo)

1. **Verifica el spec:** `GET /api/docs-json` y comprueba que `security` global = `{"bearer":[]}` y que el esquema `bearer` existe en `components.securitySchemes`.
2. **Prueba el endpoint fuera de la UI** (el header exacto que enviaría Swagger):

```powershell
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/sign-in/email' `
  -ContentType 'application/json' `
  -Body '{"email":"tucorreo@test.com","password":"TuPassword"}'

Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/members?page=1&limit=10' `
  -Headers @{ Authorization = "Bearer $($login.token)" }
```

Si esto responde 200, el backend está bien y el problema está en la UI (secciones 3.1 o 3.3).

3. **Solo entonces** ve a la UI: hard refresh → Logout → Authorize → Execute.

## 5. Notas finales

- **`transform: true` en el ValidationPipe** es necesario para que los query params (`page`, `limit`, fechas) se conviertan a los tipos declarados en tus DTOs de consulta.
- **CORS:** si el frontend está en otro origen, configura `CORS_ORIGIN` (lista separada por comas) tanto en `app.enableCors()` como en `trustedOrigins` de Better Auth.
- **`.env`:** documenta `PORT`, `CORS_ORIGIN`, `BETTER_AUTH_URL` y `BETTER_AUTH_SECRET` en tu `.env.example`.
- **Esquema sin auth:** los endpoints públicos (ej. `GET /health`) no se ven afectados por la seguridad global: Swagger solo *añade* el header cuando hay token autorizado; el servidor sigue decidiendo quién entra.