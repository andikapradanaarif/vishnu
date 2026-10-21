.PHONY: db migrate migratedown migratestatus dev build test lint format tidy up logs deploy push-api push-web

# Host-side targets read api/.env via godotenv (internal/config init) —
# no env plumbing needed here. deploy/.env stays compose-only so its
# VISHNU_ENV=production never leaks into dev (Secure cookies on http).

dev:
	VISHNU_WEB_DIR=../web/dist go run cmd/server/main.go

web:
	cd ../web && bun run build

build: web
	rm -rf internal/webui/dist
	mkdir -p internal/webui/dist
	cp -R ../web/dist/ internal/webui/dist/
	CGO_ENABLED=0 go build -o bin/vishnu-api cmd/server/main.go

db:
	docker compose -f deploy/docker-compose.yml up -d postgres

up:
	docker compose -f deploy/docker-compose.yml up -d --build

logs:
	docker compose -f deploy/docker-compose.yml logs -f

# Prod flow: build+push GHCR images (push-api / push-web), then on the
# server run `make deploy` — pulls, migrates, recreates, health-checks.
deploy:
	./deploy/deploy.sh

push-api:
	./scripts/deploy-ghcr.sh

push-web:
	cd ../web && ./scripts/deploy-ghcr.sh

migrate:
	go run ./cmd/migrate up

migratedown:
	go run ./cmd/migrate down

migratestatus:
	go run ./cmd/migrate status

test:
	go test ./...

lint:
	golangci-lint run ./...

format:
	gofmt -s -w . && goimports -w .

tidy:
	go mod tidy
