CREATE TABLE otp_codes (
    id          uuid PRIMARY KEY,
    email       citext      NOT NULL,
    code_hash   text        NOT NULL,
    attempts    int         NOT NULL DEFAULT 0,
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_codes_email_created ON otp_codes (email, created_at DESC);
