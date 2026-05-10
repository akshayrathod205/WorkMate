# WorkMate

A small project + task manager. Go (Postgres) backend, React frontend, Docker-Compose for local orchestration.

## Stack

- **Backend** — Go 1.23, gorilla/mux, lib/pq, golang-jwt, bcrypt
- **Frontend** — React 18 + Vite 5 (Vitest for tests)
- **DB** — PostgreSQL 16
- **Auth** — JWT in HttpOnly + SameSite=Strict cookie (no token in `localStorage`)

## Quick start (Docker Compose)

```bash
cp .env.example .env             # fill in POSTGRES_PASSWORD and a strong JWT_SECRET
# generate a secret: openssl rand -base64 48
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080/api
- DB: postgres://postgres@localhost:5432/workmate (port not exposed by default)

The Postgres container runs `backend/init.sql` on **first** init. To pick up schema changes you must drop the volume:

```bash
docker compose down -v
docker compose up --build
```

## Environment variables

Root `.env` (consumed by `docker-compose.yml`):

| Var | Required | Default | Notes |
|---|---|---|---|
| `POSTGRES_USER` | no | `postgres` | |
| `POSTGRES_PASSWORD` | **yes** | — | Compose fails fast if unset. |
| `POSTGRES_DB` | no | `workmate` | |
| `JWT_SECRET` | **yes** | — | 32+ random bytes recommended. |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Frontend origin. |
| `COOKIE_SECURE` | no | `false` | Set `true` for HTTPS deployments. |
| `VITE_API_URL` | no | `http://localhost:8080/api` | Baked into frontend at build time. |

`backend/.env` is only used when running the backend outside Docker (e.g., `go run .`).

## Local dev (without Docker)

```bash
# DB
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=2547 -e POSTGRES_DB=workmate postgres:16-alpine
psql -h localhost -U postgres -d workmate -f backend/init.sql

# Backend
cd backend && go run .

# Frontend
cd frontend && npm install && npm run dev
```

## API

All under `/api`. Authenticated routes require the `auth_token` cookie (set by `/login`).

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | public | Health probe. |
| POST | `/register` | public | `{ name, email, password, role }` — role ∈ `Manager`, `Team Member` |
| POST | `/login` | public | Sets `auth_token` cookie. |
| POST | `/logout` | public | Clears cookie. |
| GET | `/me` | yes | Current user. |
| GET | `/users` | Manager | |
| GET | `/projects` | yes | Returns projects scoped to caller. |
| GET | `/projects/{id}` | member/manager | |
| POST | `/projects/create` | Manager | |
| POST | `/projects/{id}/team` | Manager (owner) | Add members. |
| PUT | `/projects/{id}/update` | Manager (owner) | |
| DELETE | `/projects/{id}/delete` | Manager (owner) | |
| GET | `/tasks/{projectId}` | member/manager (owner) | |
| POST | `/tasks/create` | Manager (owner) | |
| PUT | `/tasks/{id}/update` | assignee or owning Manager | |
| DELETE | `/tasks/{id}/delete` | Manager (owner) | |

## Roles

- `Manager` — owns projects they create. Can create/update/delete projects, add team members, create/delete tasks within projects they own.
- `Team Member` — sees projects they're a member of, can update tasks assigned to them.

## Repo layout

```
backend/      Go server (flat package main today; restructure tracked)
frontend/     React app (CRA today; Vite migration tracked)
docker-compose.yml
init.sql      Schema (run once by Postgres on first init)
```

## Known TODOs

- Real migration tooling (golang-migrate / goose) — currently `init.sql` is one-shot
- Package restructure into `internal/` (Server struct vs global vars)
- Broader test coverage

## License

MIT.
