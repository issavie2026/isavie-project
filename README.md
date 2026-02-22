# ISSAVIE MVP

Group trip planning: create trips, invite/join via link, day-by-day itinerary with organizer/co-organizer control, change requests (approve/deny), announcements, comments, notifications, essentials, and PDF export.

## Stack

- **Backend:** Node.js, Express, Prisma (PostgreSQL), JWT, magic-link auth
- **Frontend:** React 18, Vite, React Router

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env (DATABASE_URL, JWT_SECRET, etc.)
npx prisma generate
npx prisma db push
npm run dev
```

API runs at `http://localhost:3004`.

### Frontend

```bash
cd frontend
npm install
# Optional: copy project logo into public so the header shows it
cp ../logo/Photoroom_20260103_130025.png public/logo.png
npm run dev
```

App runs at `http://localhost:5173` and proxies `/api` to the backend.

### Run both

From project root:

```bash
npm install
npm run dev
```

(Requires `concurrently`; runs backend and frontend together.)

## Env (backend)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL URL |
| `JWT_SECRET` | Min 32 chars for session tokens |
| `INVITE_SECRET` | For signed invite tokens |
| `FRONTEND_URL` | e.g. `http://localhost:5173` (magic link base) |
| `SMTP_URL` | Optional SMTP transport URL |
| `RESEND_API_KEY` | Optional; Resend API key (preferred over SMTP) |
| `SMTP_FROM` | Sender email, e.g. `Issavie <no-reply@issavie.com>` |

## Deploying to Vercel

- Create **2 Vercel projects** from this repo:
  - Frontend project root: `frontend`
  - Backend project root: `backend`
- Frontend env:
  - `VITE_API_BASE_URL=https://<your-backend-domain>/api`
- Backend env:
  - `DATABASE_URL`, `JWT_SECRET`, `MAGIC_LINK_SECRET`, `INVITE_SECRET`, `FRONTEND_URL`, `RESEND_API_KEY`, `SMTP_FROM`
- Backend uses `backend/api/[...all].js` for Vercel Functions and runs `prisma db push` during build.

## Features (MVP)

- **Auth:** Magic link email (passwordless)
- **Trips:** Create, get, delete (organizer only)
- **Invites:** Signed link, 30-day expiry, preview + auto-join
- **Itinerary:** Day-by-day items, TBD time, create/edit/delete (organizer/co-organizer)
- **Change requests:** Members propose edits; organizer/co-organizer approve/deny
- **Announcements:** List + create (organizer/co-organizer)
- **Comments:** On itinerary items (and announcements); soft delete, own or org/co-org delete any
- **Notifications:** In-app for announcements, itinerary updates, change requests
- **Export:** PDF itinerary from trip page
- **Members:** List, roles (organizer/co-organizer/member), promote/demote/remove, leave trip, delete trip (organizer)

## API base

All under `/api`:

- `POST /auth/magic-link`, `POST /auth/verify`, `GET /auth/me`
- `GET /invites/:token/preview`, `POST /invites/:token/join`
- `GET|POST /trips`, `GET|DELETE /trips/:tripId`, `POST /trips/:tripId/invites`, `GET|PATCH|DELETE /trips/:tripId/members/:userId`
- `GET /trips/:tripId/itinerary`, `POST|PATCH|DELETE /trips/:tripId/itinerary/items/:itemId`, `POST /trips/:tripId/itinerary/items/:itemId/change-requests`
- `GET /trips/:tripId/change-requests`, `POST /trips/:tripId/change-requests/:id/approve`, `POST .../deny`
- `GET|POST /trips/:tripId/announcements`
- `GET|POST /trips/:tripId/comments`, `DELETE /trips/:tripId/comments/:commentId`
- `GET /notifications`, `POST /notifications/:id/read`
- `POST /trips/:tripId/export/itinerary.pdf`
- `POST /analytics/event`

RBAC is enforced server-side; see blueprint for role rules.
