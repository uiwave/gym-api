import 'dotenv/config';

import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { Pool } from 'pg';

import {
  ac,
  admin as adminRole,
  trainer,
  receptionist,
  member,
} from './permissions';

const databaseHost = process.env.DATABASE_HOST;
const databasePort = Number(process.env.DATABASE_PORT);
const databaseUser = process.env.DATABASE_USER;
const databasePassword = process.env.DATABASE_PASSWORD;
const databaseName = process.env.DATABASE_NAME;

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL;

const corsOrigin = process.env.CORS_ORIGIN;
const trustedOrigins = corsOrigin
  ? corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

export const auth = betterAuth({
  database: new Pool({
    host: databaseHost,
    port: databasePort,
    user: databaseUser,
    password: databasePassword,
    database: databaseName,
  }),

  secret: betterAuthSecret,

  baseURL: betterAuthUrl,

  trustedOrigins,

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    admin({
      ac,

      roles: {
        admin: adminRole,
        trainer,
        receptionist,
        member,
      },

      defaultRole: 'member',

      adminRoles: ['admin'],
    }),
  ],
});
