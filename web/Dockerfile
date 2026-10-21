# syntax=docker/dockerfile:1
#
# Build context is the repository root (web/ depends on the shared-ui and
# contract workspaces):
#   docker build -f web/Dockerfile -t vishnu-web .
#
FROM oven/bun:1 AS build
WORKDIR /src
COPY package.json bun.lock ./
COPY shared-ui/package.json shared-ui/
COPY contract/package.json contract/
COPY web/package.json web/
# Only manifests are present here, so skip the workspaces' `prepare` hooks;
# the explicit `bun run build` builds every workspace in order.
RUN bun install --frozen-lockfile --ignore-scripts
COPY shared-ui/ shared-ui/
COPY contract/ contract/
COPY web/ web/
RUN bun run build

FROM nginx:alpine
COPY --from=build /src/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
