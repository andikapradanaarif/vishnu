CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id         uuid PRIMARY KEY,
    email      citext      NOT NULL,
    name       text,
    role       text        NOT NULL DEFAULT 'member',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE deleted_at IS NULL;
