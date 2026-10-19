CREATE TABLE auth_sessions (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash   text NOT NULL,
    expires_at   timestamptz NOT NULL,
    last_seen_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX auth_sessions_token_hash ON auth_sessions (token_hash);
