# 🥒 Pickle Rick - Pickleball Court Management & Reservation System

Pickle Rick is a two-sided web app that combines a **Pickleball Court Management System** for Admins with a **Reservation System** for Players in one platform.
Admins manage courts, inventory, and bookings; Players find courts in their location, reserve time slots, and split games with other Players through "Pasalo" join requests — all in one place.

---

## 🚀 Features

- **Auth & Registration**
  - Role-based signup (Player or Admin) with profile photo upload
  - JWT-based login, logout, and profile editing

- **Court Management** (Admin)
  - Add and manage multiple courts, each with its own hourly rate
  - Per-court **Auto-Approval** or **Manual Approval** booking mode

- **Bookings** (Player)
  - Book a court's open hour time slots, filtered to the Player's own location
  - Consecutive slots booked by the same Player merge into a single block in the UI
  - Manual-approval courts require Admin sign-off before a slot is confirmed

- **Pasalo**
  - Join another Player's approved booking, capped at 8 Players per time slot
  - Approve/disapprove incoming join requests from your own Dashboard

- **Inventory Management** (Admin)
  - Add, update, and remove items available for purchase at each court

- **Account Deletion**
  - Permanent, password-confirmed self-deletion for both Players and Admins
  - Deleting an Admin cascades to their courts and every booking made on them

- 🔨 **In progress** — Shop/checkout (Player-side purchasing against a court's inventory) and the `analytics-service-python` revenue/profit dashboard. See [docs/roadmap.md](docs/roadmap.md) for current status.

---

## 🛠️ Tech Stack

- **Backend:** Node.js + Express, raw SQL via `pg` (no ORM, by design)
- **Analytics (planned):** Python + FastAPI, `psycopg2`, read-only revenue/profit reporting
- **Frontend:** React + Vite
- **Database:** PostgreSQL
- **Infra:** Docker Compose (Postgres, backend, frontend, pgAdmin)
- **Monitoring:** Prometheus + Grafana - HTTP request rate/latency and Node process metrics scraped from the backend
- **CI/CD:** GitHub Actions - Development, QA (Postman + Playwright), and Main (adds k6, a Docker image build check, and a secrets scan) pipelines gate every merge
- **Testing:** Postman (API), k6 (load), Playwright + TypeScript (E2E, run headful for practice/observability)

---

## 📚 Documentation

The full requirements and rules this project is built against live in [`docs/`](docs/):

- [Business Requirements](docs/business-requirements.md)
- [Business Rules](docs/business-rules.md)
- [Software Requirements Specification](docs/software-requirements-specification.md)
- [Use Case Specification](docs/use-case-specification.md)
- [Roadmap](docs/roadmap.md) - what's built vs. what's remaining, kept in sync with reality

---

## ▶️ Getting Started

Requires [Docker](https://www.docker.com/) locally. From the repo root:

```bash
docker compose up --build
```

This runs Postgres, the backend, the frontend, pgAdmin, Prometheus, and Grafana together (deliberately not detached, so you can watch every service's logs). Once it's up:

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| pgAdmin | http://localhost:5050 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (`admin` / `admin`) |

Schema changes require `docker compose down -v` then `up --build` again to re-run `db/schema.sql` against a fresh database.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*This is a portfolio/learning project - see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for how this space is meant to be used.*
