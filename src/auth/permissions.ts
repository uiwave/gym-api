import { createAccessControl } from 'better-auth/plugins/access';

const statement = {
  members: ['create', 'read', 'update', 'delete'],
  memberships: ['create', 'read', 'update', 'delete'],
  payments: ['create', 'read', 'update', 'delete'],
  attendance: ['create', 'read'],
  trainers: ['create', 'read', 'update', 'delete'],
  routines: ['create', 'read', 'update', 'delete'],
  exercises: ['create', 'read', 'update', 'delete'],
  reports: ['read'],
  user: [
    'create',
    'get',
    'list',
    'update',
    'delete',
    'ban',
    'set-role',
    'set-email',
    'set-password',
  ],
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
  members: ['create', 'read', 'update', 'delete'],
  memberships: ['create', 'read', 'update', 'delete'],
  payments: ['create', 'read', 'update', 'delete'],
  attendance: ['create', 'read'],
  trainers: ['create', 'read', 'update', 'delete'],
  routines: ['create', 'read', 'update', 'delete'],
  exercises: ['create', 'read', 'update', 'delete'],
  reports: ['read'],
  user: [
    'create',
    'get',
    'list',
    'update',
    'delete',
    'ban',
    'set-role',
    'set-email',
    'set-password',
  ],
  
});

export const trainer = ac.newRole({
  members: ['read'],
  memberships: ['read'],
  attendance: ['read'],
  trainers: ['read'],
  routines: ['create', 'read', 'update', 'delete'],
  exercises: ['create', 'read', 'update', 'delete'],
});

export const receptionist = ac.newRole({
  members: ['create', 'read', 'update'],
  memberships: ['create', 'read', 'update'],
  payments: ['create', 'read'],
  attendance: ['create', 'read'],
  user: ['get', 'list'],
});

export const member = ac.newRole({
  members: ['read'],
  memberships: ['read'],
  payments: ['read'],
  attendance: ['read'],
  routines: ['read'],
  exercises: ['read'],
});
