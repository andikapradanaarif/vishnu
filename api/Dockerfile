# syntax=docker/dockerfile:1

# Build context is the repository root (for .dockerignore + api/ sources).
# api-only image — the SPA ships in the separate vishnu-web nginx image.
# Pinned fork commit + its `git describe` version — bump both together.
ARG CRUSH_REF=630a3a9dbe0095a0d06473d3e50889487a31a00e
ARG CRUSH_VERSION=v0.98.3-fork-7-g630a3a9db

FROM golang:1.26-alpine AS api
ENV GOTOOLCHAIN=local CGO_ENABLED=0
WORKDIR /src
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api/ ./
RUN go build -trimpath -ldflags="-s -w" -o /out/vishnu-api ./cmd/server \
 && go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

# crush's own go.mod requires a newer toolchain than the api module.
# Build the fork — upstream rejects the crushrc's fork-only option keys
# and exits. `go install` can't reach it (the fork keeps module
# github.com/charmbracelet/crush), so fetch the pinned SHA and build.
FROM golang:1.27-alpine AS crush
ARG CRUSH_REF
ARG CRUSH_VERSION
ENV GOTOOLCHAIN=local CGO_ENABLED=0 GOEXPERIMENT=greenteagc
RUN apk add --no-cache git
RUN git init /src \
 && cd /src \
 && git remote add origin https://github.com/andikapradanaarif/crush \
 && git fetch --depth 1 origin "$CRUSH_REF" \
 && git checkout -q FETCH_HEAD \
 && go build -buildvcs=false -trimpath -ldflags="-s -w \
    -X github.com/charmbracelet/crush/internal/version.Version=${CRUSH_VERSION} \
    -X github.com/charmbracelet/crush/internal/version.Commit=${CRUSH_REF}" \
    -o /crush .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates curl git openssh-client tzdata

# The cloner only supports github.com — pin its published SSH host keys
# (api.github.com/meta, fingerprints verified at authoring time) so
# ls-remote/clone inside the container never depends on the mounted
# ~/.ssh/known_hosts. The mount is still needed for the private key.
RUN printf '%s\n' \
	'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl' \
	'github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=' \
	'github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q4zMjA2n1nGrlTDkzwDCsw+wqFPGQA179cnfGWOWRVruj16z6XyvxvjJwbz0wQZ75XK5tKSb7FNyeIEs4TT4jk+S4dhPeAUC5y+bDYirYgM4GC7uEnztnZyaVWQ7B381AK4Qdrwt51ZqExKbQpTUNn+EjqoTwvqNj4kqx5QUCI0ThS/YkOxJCXmPUWZbhjpCg56i+2aB6CmK2JGhn57K5mj0MNdBXA4/WnwH6XoPWJzK5Nyu2zB3nAZp+S5hpQs+p1vN1/wsjk=' \
	> /etc/ssh/ssh_known_hosts

WORKDIR /app
COPY --from=api /out/vishnu-api /out/migrate ./
COPY --from=crush /crush /usr/local/bin/crush
COPY api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# The published port stays host-loopback; binding all interfaces inside the
# container is what lets the host reach it, and the agent needs a shell.
ENV VISHNU_LISTEN_ADDR=0.0.0.0:8080 \
    VISHNU_DATA_DIR=/data \
    VISHNU_CRUSH_BIN=/usr/local/bin/crush

VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
