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