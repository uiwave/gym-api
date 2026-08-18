import type { Request } from 'express';
import type { auth } from '../auth';

export type AuthSession = typeof auth.$Infer.Session;

export interface AuthRequest extends Request {
  user: AuthSession['user'];
  session: AuthSession['session'];
}