.PHONY: db migrate migratedown migratestatus dev build test lint format tidy

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
	docker compose up -d postgres

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
