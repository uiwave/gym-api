# 13 — Guía de Implementación React + Vite

Guía completa para consumir la GYM API desde un frontend **React + TypeScript + Vite**. Código listo para copiar/adaptar.

## 1. Configuración del proyecto

### 1.1 Variables de entorno

`.env` (frontend):
```env
VITE_API_URL=http://localhost:3000
```

`vite.config.ts` (proxy opcional — evita CORS en desarrollo):
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/members': { target: 'http://localhost:3000', changeOrigin: true },
      // ... un proxy por prefijo, o usa VITE_API_URL en apiClient y omite esto
    },
  },
});
```

> **Recomendación:** usa `VITE_API_URL` en el cliente y configura CORS en el backend con tu origen (`CORS_ORIGIN`). Más simple y funciona en producción.

### 1.2 Tipos base (`src/types/api.ts`)

```ts
// Envelope de respuestas
export interface Meta { total: number; page: number; limit: number }
export interface Envelope<T> { data: T }
export interface Paginated<T> { data: T[]; meta: Meta }

// Usuario (Better Auth, id = texto 32 chars)
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: 'admin' | 'trainer' | 'receptionist' | 'member';
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  updatedAt: string;
}

// ⚠️ Las filas vienen en snake_case, tipa tal cual:
export interface Member {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  document_number: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type UserRole = User['role'];
```

## 2. Cliente HTTP (`src/lib/apiClient.ts`)

```ts
import type { Meta } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'gym_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Callback que se dispara en 401 (lo conecta tu AuthProvider)
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, unknown> } = {},
): Promise<T> {
  const { method = 'GET', body, query } = options;

  const url = new URL(path, API_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    setToken(null);
    onUnauthorized?.();
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    let details: unknown;
    try {
      const errorBody = await response.json();
      // message puede ser string o array (validación)
      message = Array.isArray(errorBody.message)
        ? errorBody.message.join(', ')
        : (errorBody.message ?? message);
      details = errorBody;
    } catch { /* sin body JSON */ }
    throw new ApiError(response.status, message, details);
  }

  return (await response.json()) as T;
}

// Helpers tipados
export const get = <T>(path: string, query?: Record<string, unknown>) =>
  api<T>(path, { query });
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body });
export const patch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
```

**Uso:**
```ts
import { get, post } from '../lib/apiClient';
import type { Paginated, Member, Envelope } from '../types/api';

const { data, meta } = await get<Paginated<Member>>('/members', {
  page: 1, limit: 20, search: 'juan', status: 'active',
});

const { data: member } = await post<Envelope<Member>>('/members', {
  documentNumber: '12345678', phone: '999888777',
});
```

## 3. Autenticación (`src/auth/AuthContext.tsx`)

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { get, post, setOnUnauthorized, setToken, getToken } from '../lib/apiClient';
import type { Envelope, User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
  }, []);

  // Restaurar sesión al cargar: si hay token, validar con /auth/me
  useEffect(() => {
    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const { data } = await get<Envelope<User>>('/auth/me');
        setUser(data);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await post<{ user: User; session: { token: string } }>(
      '/api/auth/sign-in/email',
      { email, password },
    );
    setToken(result.session.token);
    const { data } = await get<Envelope<User>>('/auth/me');
    setUser(data);
  };

  const logout = async () => {
    try { await post('/api/auth/sign-out'); } catch { /* ignora */ }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
```

## 4. Rutas protegidas por rol (`src/auth/RequireRole.tsx`)

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from '../types/api';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

**Router:**
```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
    <Route index element={<Dashboard />} />
    <Route path="members" element={<MembersPage />} />
    {/* Solo admin y receptionist */}
    <Route path="reports" element={
      <RequireRole roles={['admin', 'receptionist']}><ReportsPage /></RequireRole>
    } />
    {/* Solo admin */}
    <Route path="users" element={
      <RequireRole roles={['admin']}><UsersPage /></RequireRole>
    } />
    {/* Ocultar a recepcionista (el backend también da 403) */}
    <Route path="routines" element={
      <RequireRole roles={['admin', 'trainer', 'member']}><RoutinesPage /></RequireRole>
    } />
  </Route>
</Routes>
```

## 5. Página de Login (`src/pages/LoginPage.tsx`)

```tsx
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/apiClient';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <h1>Iniciar sesión</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required />
      <button type="submit">Ingresar</button>
    </form>
  );
}
```

## 6. Listado paginado + búsqueda (`src/pages/MembersPage.tsx`)

```tsx
import { useEffect, useState } from 'react';
import { get } from '../lib/apiClient';
import type { Member, Paginated } from '../types/api';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await get<Paginated<Member>>('/members', {
        page,
        limit: meta.limit,
        search,
        status,
      });
      setMembers(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, [search, status]); // búsqueda/filtro reinician a página 1

  return (
    <div>
      <h1>Miembros</h1>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Todos</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="suspended">Suspendidos</option>
      </select>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Cargando...</p>}

      <table>
        <thead>
          <tr><th>Nombre</th><th>Email</th><th>Documento</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.user_name}</td>
              <td>{m.user_email}</td>
              <td>{m.document_number}</td>
              <td>{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>← Anterior</button>
        <span>Página {meta.page} de {Math.max(1, Math.ceil(meta.total / meta.limit))} ({meta.total} resultados)</span>
        <button disabled={meta.page >= Math.ceil(meta.total / meta.limit)} onClick={() => load(meta.page + 1)}>Siguiente →</button>
      </div>
    </div>
  );
}
```

## 7. Crear un recurso (ejemplo: registrar pago que activa membresía)

```tsx
import { post } from '../lib/apiClient';
import type { Envelope } from '../types/api';

interface PaymentRow { id: string; status: string; /* ...snake_case */ }

// Campos del DTO (camelCase en el body, snake_case en la respuesta)
await post<Envelope<PaymentRow>>('/payments', {
  memberId: memberId,          // uuid
  membershipId: membershipId,  // uuid
  amount: 89.9,
  paymentMethod: 'YAPE',       // CASH | CARD | TRANSFER | YAPE | PLIN | OTHER
  status: 'COMPLETED',         // PENDING | COMPLETED | FAILED | REFUNDED
  reference: 'YAPE-123',
});
```

## 8. Ocultar UI según rol (ejemplo: navbar)

```tsx
import { useAuth } from '../auth/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const canManagePayments = user.role === 'admin' || user.role === 'receptionist';
  const canSeeReports = user.role === 'admin' || user.role === 'receptionist';
  const isAdmin = user.role === 'admin';

  return (
    <nav>
      <span>{user.name} ({user.role})</span>
      <a href="/members">Miembros</a>
      {canManagePayments && <a href="/payments">Pagos</a>}
      {canSeeReports && <a href="/reports">Reportes</a>}
      {isAdmin && <a href="/users">Usuarios</a>}
      <button onClick={logout}>Cerrar sesión</button>
    </nav>
  );
}
```

## 9. Errores frecuentes de integración

| Error | Causa | Fix |
|---|---|---|
| 401 en todo | Token no enviado o expirado | Revisa `getToken()` y el interceptor; re-login |
| 400 "property X should not exist" | Enviaste un campo que no está en el DTO | Elimina el campo extra del body |
| 400 en query | `page`/`limit` no numéricos o `limit > 100` | Envía siempre números |
| 403 | Rol sin permiso para el endpoint | Oculta la UI según `user.role` |
| 404 en recurso ajeno (member) | Anti-IDOR por diseño | Trata como inexistente |
| 409 | Duplicado (nombre, documento) o check-in abierto | Muestra el mensaje del error |
| CORS | Origen no permitido | Agrega tu origen a `CORS_ORIGIN` en el backend |

## 10. Checklist final

1. [ ] `VITE_API_URL` configurada (o proxy).
2. [ ] Login guarda `session.token`; apiClient lo envía en `Authorization: Bearer`.
3. [ ] `onUnauthorized` → logout y redirect a `/login`.
4. [ ] Restaurar sesión con `/auth/me` al cargar la app.
5. [ ] Rutas protegidas con `RequireAuth` + `RequireRole`.
6. [ ] Enums con la caja exacta (UPPER/lowercase según módulo).
7. [ ] Respuestas tipadas en snake_case.
8. [ ] Paginación con `page`/`limit` (máx 100).
9. [ ] Badge de notificaciones con `GET /notifications?read=false` + `meta.unread`.
10. [ ] Ocultar módulos según rol (especialmente payments/reports para non-staff, routines para receptionist).