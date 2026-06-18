# News-to-Incident Mapping Dashboard

A full-stack application that ingests public news/RSS feeds, automatically detects real-world incidents, extracts locations, and presents them for human review on an interactive map dashboard.

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | https://news-incident-dashboard.vercel.app |
| Backend API | https://news-incident-dashboard.onrender.com |
| API Docs | https://news-incident-dashboard.onrender.com/api/ |

**Test Credentials:**
- Username: `reviewer`
- Password: `reviewer123`

> Note: The backend is hosted on Render's free tier and may take 30–60 seconds to wake up after inactivity. Please wait for the first request to complete.

---

## Project Overview

This application solves the problem of manually monitoring news sources for real-world incidents. It:

1. Fetches articles from Google News RSS using predefined incident-related queries
2. Classifies each article by incident type (Fire, Flood, Road Accident, etc.) and severity
3. Extracts location information and geocodes it to coordinates
4. Detects possible duplicate incidents across multiple articles
5. Presents everything on a dashboard for human review, acceptance, or rejection

---

## Tech Stack

### Backend
- **Django 6.0** — web framework
- **Django REST Framework** — REST API layer
- **PostgreSQL** — production database (Supabase)
- **SQLite** — local development database
- **JWT Authentication** — via `djangorestframework-simplejwt`

### Frontend
- **Next.js 15** — React framework with App Router
- **TypeScript** — type safety
- **TailwindCSS** — utility-first styling
- **Leaflet / react-leaflet** — interactive map

### Infrastructure
- **Render** — Django backend hosting
- **Vercel** — Next.js frontend hosting
- **Supabase** — managed PostgreSQL

### External APIs
- **Google News RSS** — free, no API key required
- **OpenStreetMap Nominatim** — free geocoding, no API key required

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/black-pheonix/news-incident-dashboard.git
cd news-incident-dashboard
```

### 2. Backend Setup

```bash
cd news_incident
python -m venv venv

# Activate virtual environment
venv\Scripts\activate      # Windows
source venv/bin/activate   # Linux / macOS

pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside `news_incident/`:

```env
SECRET_KEY=your-secret-key-here
# DATABASE_URL is optional — omit to use SQLite locally
# DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Generate a secret key:
```python
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 4. Run Migrations

```bash
python manage.py migrate
python manage.py create_users
```

This creates two default users:
- `admin` / `admin123` — superuser with Django admin access
- `reviewer` / `reviewer123` — standard dashboard user

### 5. Start the Backend

```bash
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`

### 6. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

### 7. Start the Frontend

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Environment Variables

### Backend (`news_incident/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | Django secret key for cryptographic signing |
| `DATABASE_URL` | No | PostgreSQL connection string. Omit to use SQLite |

### Backend (Production — Render dashboard)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `DJANGO_SETTINGS_MODULE` | Set to `news_incident.production_settings` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

### Frontend (Production — Vercel dashboard)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://news-incident-dashboard.onrender.com/api` |

---

## Migration Instructions

```bash
# Create new migrations after model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Check migration status
python manage.py showmigrations
```

---

## Running Ingestion

After setup, click **Run Ingestion** on the dashboard, or call the API directly:

```bash
curl -X POST https://news-incident-dashboard.onrender.com/api/ingestion/run/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Ingestion fetches 10 articles per query × 10 queries = up to 100 new articles per run. Run multiple times to accumulate data. Duplicate URLs are automatically skipped.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Obtain JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/ingestion/run/` | Trigger news ingestion |
| GET | `/api/dashboard/summary/` | Dashboard counts |
| GET | `/api/incidents/` | List incidents (filterable) |
| GET | `/api/incidents/{id}/` | Incident detail |
| PATCH | `/api/incidents/{id}/` | Update incident fields or status |
| GET | `/api/incidents/duplicates/` | Duplicate groups |
| GET | `/api/articles/` | List raw articles |

### Incident List Query Parameters
- `?category=Fire` — filter by category
- `?severity=Critical` — filter by severity
- `?review_status=needs_review` — filter by status
- `?state=Telangana` — filter by state
- `?search=hyderabad` — full text search
- `?page=2` — pagination (20 per page)

---

## Deployment

### Backend (Render)

1. Connect GitHub repo to Render
2. Set Root Directory to `news_incident`
3. Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py create_users`
4. Start Command: `gunicorn news_incident.wsgi --log-file - --timeout 300 --workers 1`
5. Add environment variables in Render dashboard

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set Root Directory to `frontend`
3. Add `NEXT_PUBLIC_API_URL` environment variable
4. Deploy

### Database (Supabase)

1. Create a new Supabase project
2. Go to Database → Settings → Connection String
3. Select Session Pooler mode
4. Copy URI and set as `DATABASE_URL` in Render

---

## Known Limitations

- **Location coverage** — only 25 Indian cities are in `location_reference.csv`. Articles mentioning neighborhoods or smaller towns will have low confidence and no map marker.
- **Ingestion volume** — limited to 10 articles per feed to avoid HTTP timeout on Render's free tier. Run ingestion multiple times to accumulate data.
- **Severity classification** — keyword-based and context-unaware. "Collapsed" triggers Critical severity even if no casualties occurred.
- **Google News URLs** — RSS feed returns Google redirect URLs, not direct article URLs. The redirect resolves in the browser.
- **Deduplication accuracy** — fuzzy string matching may miss duplicates with very different wording, or false-positive on unrelated incidents in the same location.
- **Render cold start** — free tier sleeps after 15 minutes of inactivity. First request after sleep takes 30–60 seconds.
- **Geocoding** — state-level location matches skip geocoding and show approximate state-center coordinates.

---

## AI / Tool Usage

This project was built with **Claude (Anthropic)** as an AI coding assistant throughout development.

**What Claude generated:**
- Initial Django project structure, model definitions, and migration setup
- Ingestion pipeline architecture (RSS fetching, classification, location extraction, deduplication)
- Django REST Framework serializers, views, and URL routing
- JWT authentication configuration
- Next.js dashboard components, TypeScript types, and API client
- Leaflet map integration
- Deployment configuration (Procfile, production_settings.py, runtime.txt)

**What I manually reviewed and changed:**
- Debugged Gunicorn worker timeout issues in production by analyzing Render logs
- Identified and fixed PostgreSQL `character varying` constraint errors that SQLite silently ignored
- Fixed HTML entity encoding issues (`&nbsp;` remaining after tag stripping)
- Adjusted ingestion article limits and removed unnecessary geocoding delays for production
- Verified all API endpoints manually using Django's browsable API

**AI-generated mistakes I caught and fixed:**
- Missing opening `<a` tag in `MapComponent.tsx` that broke JSX parsing
- Mutable default argument (`messages=messages`) in agent function signature
- Hardcoded `localhost` URL in articles page that broke production deployment
- Missing slash in API base URL causing `/apidashboard/summary/` instead of `/api/dashboard/summary/`
