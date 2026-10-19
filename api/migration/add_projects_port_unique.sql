CREATE UNIQUE INDEX projects_port_unique
    ON projects (port)
    WHERE port IS NOT NULL AND deleted_at IS NULL;
