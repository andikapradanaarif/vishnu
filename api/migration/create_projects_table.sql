CREATE TABLE projects (
    id         uuid PRIMARY KEY,
    name       text        NOT NULL,
    path       text,
    mode       text        NOT NULL,
    port       integer,
    repo_url   text,
    upstream   text,
    status     text        NOT NULL,
    error      text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE UNIQUE INDEX projects_path_unique    ON projects (path)     WHERE path IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX projects_repo_url_unique ON projects (repo_url) WHERE repo_url IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX projects_upstream_unique ON projects (upstream) WHERE upstream IS NOT NULL AND deleted_at IS NULL;
