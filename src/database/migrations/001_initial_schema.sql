-- ============================================================
-- GYM API - 001_initial_schema.sql
-- VERSIÓN 1 - Esquema completo de la base de datos
-- Ejecutar con: psql -f src/database/migrations/001_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- Extensiones
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Better Auth
-- ------------------------------------------------------------
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "role" text, "banned" boolean, "banReason" text, "banExpires" timestamptz);

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade, "impersonatedBy" text);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");

-- ------------------------------------------------------------
-- members
-- ------------------------------------------------------------
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id TEXT NOT NULL UNIQUE,

    document_number VARCHAR(20) UNIQUE,
    phone VARCHAR(20),
    birth_date DATE,
    address TEXT,

    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT members_user_id_fk
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    CONSTRAINT members_status_check
        CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX members_user_id_idx
ON members(user_id);

CREATE INDEX members_status_idx
ON members(status);

-- ------------------------------------------------------------
-- plans
-- ------------------------------------------------------------
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- memberships
-- ------------------------------------------------------------
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING')),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT memberships_end_date_check CHECK (end_date >= start_date)
);

-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'YAPE', 'PLIN', 'OTHER')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- trainers
-- ------------------------------------------------------------
CREATE TABLE trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    phone VARCHAR(20),
    bio TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- exercises
-- ------------------------------------------------------------
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    muscle_group VARCHAR(100),
    equipment VARCHAR(100),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'BEGINNER' CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    instructions TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- routines
-- ------------------------------------------------------------
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT routines_end_date_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- ------------------------------------------------------------
-- routine_exercises
-- ------------------------------------------------------------
CREATE TABLE routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    sets INTEGER NOT NULL CHECK (sets > 0),
    repetitions INTEGER NOT NULL CHECK (repetitions > 0),
    weight NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (weight >= 0),
    rest_seconds INTEGER NOT NULL DEFAULT 60 CHECK (rest_seconds >= 0),
    notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT routine_exercises_unique_order UNIQUE (routine_id, order_index),
    CONSTRAINT routine_exercises_unique_exercise UNIQUE (routine_id, exercise_id)
);

-- ------------------------------------------------------------
-- attendance
-- ------------------------------------------------------------
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out TIMESTAMPTZ,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_check_out_check CHECK (check_out IS NULL OR check_out >= check_in)
);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'SUCCESS', 'PAYMENT', 'MEMBERSHIP', 'SYSTEM')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Trigger: actualizar updated_at automáticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plans_set_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER memberships_set_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payments_set_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trainers_set_updated_at
    BEFORE UPDATE ON trainers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER exercises_set_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER routines_set_updated_at
    BEFORE UPDATE ON routines
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER routine_exercises_set_updated_at
    BEFORE UPDATE ON routine_exercises
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Índices para columnas usadas frecuentemente en búsquedas
-- ------------------------------------------------------------
CREATE INDEX members_document_number_idx ON members(document_number);

CREATE INDEX memberships_member_id_idx ON memberships(member_id);
CREATE INDEX memberships_plan_id_idx ON memberships(plan_id);
CREATE INDEX memberships_status_idx ON memberships(status);
CREATE INDEX memberships_end_date_idx ON memberships(end_date);

CREATE INDEX payments_member_id_idx ON payments(member_id);
CREATE INDEX payments_membership_id_idx ON payments(membership_id);
CREATE INDEX payments_payment_date_idx ON payments(payment_date);
CREATE INDEX payments_status_idx ON payments(status);

CREATE INDEX trainers_user_id_idx ON trainers(user_id);
CREATE INDEX trainers_status_idx ON trainers(status);

CREATE INDEX exercises_muscle_group_idx ON exercises(muscle_group);
CREATE INDEX exercises_difficulty_idx ON exercises(difficulty);

CREATE INDEX routines_member_id_idx ON routines(member_id);
CREATE INDEX routines_trainer_id_idx ON routines(trainer_id);
CREATE INDEX routines_status_idx ON routines(status);

CREATE INDEX routine_exercises_routine_id_idx ON routine_exercises(routine_id);
CREATE INDEX routine_exercises_exercise_id_idx ON routine_exercises(exercise_id);

CREATE INDEX attendance_member_id_idx ON attendance(member_id);
CREATE INDEX attendance_date_idx ON attendance(date);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(read);
