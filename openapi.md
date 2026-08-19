# Referencia Open API de Better Auth

Guía para documentar y probar los endpoints de Better Auth usando el complemento `openAPI`, que genera una referencia OpenAPI 3.1.1 renderizada con **Scalar**.

## 1. ¿Qué hace?

- Muestra **todos los endpoints** de Better Auth: los del núcleo, los añadidos por los complementos (`admin`, etc.) y los esquemas del modelo.
- Permite **probar** los endpoints desde el navegador (botón *Try it out* → *Send*).
- Genera un **esquema OpenAPI 3.1.1** en JSON reutilizable con generadores de clientes o documentación.

Agrupación en la UI:

- **Default** → endpoints del núcleo (`sign-up`, `sign-in`, `sign-out`, `get-session`, `change-password`, ...).
- **Admin** → endpoints del plugin `admin` (`/admin/*`).
- **Models** → esquemas (`user`, `session`, `account`, `verification`).

## 2. Instalación

Instala el plugin en la configuración de Better Auth (`src/auth/auth.ts`):

```ts
import { betterAuth } from 'better-auth';
import { admin, openAPI } from 'better-auth/plugins';

export const auth = betterAuth({
  // ...configuración existente...

  plugins: [
    admin({
      // ...configuración del admin plugin...
    }),

    openAPI(), // <- agrega la referencia Open API
  ],
});
```

> En este proyecto el plugin ya está agregado en `src/auth/auth.ts`.

## 3. Cómo verla

Levanta el servidor:

```bash
pnpm start:dev
```

Abre en el navegador:

```
http://localhost:3000/api/auth/reference
```

## 4. Cómo usarla (probar endpoints)

1. **Endpoints públicos** (ej. `POST /sign-up/email`):
   - Click en el endpoint → botón **Try it out** → edita el body JSON → **Send**.
   - Si responde `200` con `token` + `user`, Better Auth guarda la cookie `better-auth.session_token` en el navegador (mismo origen) y quedas autenticado.

2. **Endpoints protegidos** (ej. `GET /get-session`, `POST /sign-out`):
   - Con la cookie de sesión activa se envían automáticamente.
   - Los endpoints `/admin/*` requieren rol `admin`; si no lo tienes devuelven `403`.

3. **Token Bearer** (para pruebas fuera del navegador):
   - El `token` de la respuesta de `sign-up`/`sign-in` es el token crudo de la sesión.
   - Úsalo como header: `Authorization: Bearer <token>` (el `AuthGuard` del proyecto lo soporta).

## 5. Esquema OpenAPI generado

### Como endpoint HTTP

```
GET /api/auth/open-api/generate-schema
```

Devuelve el esquema OpenAPI 3.1.1 como JSON.

### Desde el código

```ts
import { auth } from '@/lib/auth';

const openAPISchema = await auth.api.generateOpenAPISchema();
console.log(openAPISchema);
```

> Asegúrate de que las herramientas que consuman el esquema sean compatibles con la semántica de **OpenAPI 3.1**.

## 6. Integración con Swagger (NestJS)

El proyecto fusiona el esquema de Better Auth dentro del Swagger propio en `/api/docs`.

`src/main.ts` hace lo siguiente:

```ts
// 1. Crea el documento Swagger normal
const document = SwaggerModule.createDocument(app, config);

// 2. Obtiene el esquema de Better Auth
const response = await fetch(
  `http://localhost:${port}/api/auth/open-api/generate-schema`,
);
const authDoc = await response.json();

// 3. Fusiona paths y schemas (ignora /open-api/* y /reference)
for (const [path, methods] of Object.entries(authDoc.paths ?? {})) {
  if (path.includes('/open-api/') || path.includes('/reference')) {
    continue;
  }
  const fullPath = `/api/auth${path.startsWith('/') ? path : `/${path}`}`;
  // ...copia los métodos y agrega security: [{ bearer: [] }]
}

document.components.schemas = {
  ...document.components.schemas,
  ...(authDoc.components?.schemas ?? {}),
};

// 4. Sirve Swagger con todo fusionado
SwaggerModule.setup('api/docs', app, document);
```

Resultado: **dos formas de documentación**, sin conflicto entre sí:

| URL                                        | Contenido                                        |
| ------------------------------------------ | ------------------------------------------------ |
| `http://localhost:3000/api/docs`           | Swagger: endpoints de la app + endpoints de auth |
| `http://localhost:3000/api/auth/reference` | Scalar: solo endpoints de Better Auth            |

## 7. Opciones de configuración

```ts
openAPI({
  path: '/reference',               // Ruta de la UI (relativa al basePath del auth).
                                   // Por defecto: /reference -> /api/auth/reference
  disableDefaultReference: false,  // true desactiva la UI de Scalar (devuelve 404).
                                   // El endpoint /open-api/generate-schema sigue activo.
  theme: 'default',                // Tema de Scalar (ej. 'default', 'purple', 'kepler', ...).
  nonce: undefined,                // Nonce para scripts inline (cumplimiento de CSP).
});
```

Ejemplo: servir la referencia en otra ruta con un tema distinto:

```ts
openAPI({
  path: '/docs-auth',
  theme: 'purple',
}),
```

Quedaría disponible en `http://localhost:3000/api/auth/docs-auth`.

> `disableDefaultReference: true` se usa cuando solo te interesa el JSON del esquema (o ya lo fusionas en Swagger) y no quieres exponer la UI.

## 8. Scalar con múltiples fuentes

Si usas Scalar para documentar tu API principal, puedes agregar Better Auth como fuente adicional:

```ts
app.get('/docs', Scalar({
  pageTitle: 'API Documentation',
  sources: [
    { url: '/api/open-api', title: 'API' },
    { url: '/api/auth/open-api/generate-schema', title: 'Auth' }, // Better Auth
  ],
}));
```

## 9. Solución de problemas

| Problema                               | Solución                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `EADDRINUSE: address already in use`   | Hay otra instancia corriendo en el puerto. Ciérrala con `Stop-Process` o mata el proceso de `node` que ocupa el puerto y vuelve a ejecutar `pnpm start:dev`. |
| `/api/auth/reference` devuelve `404`   | El plugin está configurado con `disableDefaultReference: true`. Quítalo o ponlo en `false`. |
| Endpoints `/admin/*` devuelven `403`   | Tu sesión no tiene rol `admin` (usa `POST /admin/set-role` con un admin existente o crea el usuario admin en BD). |
| Los cambios no se reflejan en la UI    | Reinicia `pnpm start:dev` y fuerza recarga del navegador (`Ctrl+Shift+R`). |
