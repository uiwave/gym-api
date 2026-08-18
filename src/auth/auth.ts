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

console.log('DATABASE_HOST:', databaseHost);
console.log('DATABASE_PORT:', databasePort);
console.log('DATABASE_USER:', databaseUser);
console.log(
  'DATABASE_PASSWORD:',
  databasePassword ? 'EXISTE' : 'NO EXISTE',
);
console.log('DATABASE_NAME:', databaseName);

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