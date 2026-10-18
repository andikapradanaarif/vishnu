# syntax=docker/dockerfile:1

# Build context is the repository root: the SPA is built here so its output
# can be embedded into the Go binary.
ARG CRUSH_VERSION=v0.98.1

FROM oven/bun:1 AS web
WORKDIR /src
COPY package.json bun.lock ./
COPY shared-ui/package.json shared-ui/
COPY contract/package.json contract/
COPY web/package.json web/
# Only manifests are present here, so skip the workspaces' `prepare` hooks
# (they shell out to scripts/ that arrives with the sources below); the
# explicit `bun run build` builds every workspace in order.
RUN bun install --frozen-lockfile --ignore-scripts
COPY shared-ui/ shared-ui/
COPY contract/ contract/
COPY web/ web/
RUN bun run build

FROM golang:1.26-alpine AS api
ENV GOTOOLCHAIN=local CGO_ENABLED=0
WORKDIR /src
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api/ ./
COPY --from=web /src/web/dist/ ./internal/webui/dist/
RUN go build -trimpath -ldflags="-s -w" -o /out/vishnu-api ./cmd/server \
 && go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

# crush's own go.mod requires a newer toolchain than the api module.
FROM golang:1.27-alpine AS crush
ARG CRUSH_VERSION
ENV GOTOOLCHAIN=local CGO_ENABLED=0
RUN go install github.com/charmbracelet/crush@${CRUSH_VERSION}

FROM alpine:3.22
RUN apk add --no-cache ca-certificates curl git openssh-client tzdata
WORKDIR /app
COPY --from=api /out/vishnu-api /out/migrate ./
COPY --from=crush /go/bin/crush /usr/local/bin/crush
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
