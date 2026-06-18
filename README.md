# News-to-Incident Mapping Dashboard

A full-stack application that ingests public news/RSS feeds, detects real-world incidents, extracts locations, and presents them for human review on an interactive map dashboard.

## Live Demo

- **Frontend:** https://news-incident-dashboard.vercel.app
- **Backend API:** https://news-incident-dashboard.onrender.com
- **Test credentials:** reviewer / reviewer123

## Tech Stack

- **Backend:** Django, Django REST Framework, PostgreSQL (Supabase)
- **Frontend:** Next.js, TypeScript, TailwindCSS
- **Deployment:** Render (backend), Vercel (frontend), Supabase (database)

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
cd news_incident
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

Create `.env` file in `news_incident/`:
- SECRET_KEY=your_secret_key
- DATABASE_URL=your_postgresql_url  # optional, uses SQLite by default
Run migrations and start server:
```bash
python manage.py migrate
python manage.py create_users
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:
- NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
Start development server:
```bash
npm run dev
```

## Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| SECRET_KEY | Django secret key |
| DATABASE_URL | PostgreSQL connection string |
| DJANGO_SETTINGS_MODULE | Set to `news_incident.production_settings` in production |

### Frontend
| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_API_URL | Backend API base URL |

## External APIs Used

- **Google News RSS** — Free, no API key required
- **OpenStreetMap Nominatim** — Free geocoding, no API key required

## Architecture

See `ARCHITECTURE.md`

## Known Limitations

- Ingestion fetches 10 articles per feed query — run multiple times to accumulate data
- Location extraction limited to 25 predefined Indian locations in `location_reference.csv`
- Deduplication uses fuzzy string matching — may miss duplicates with very different wording
- Severity classification is keyword-based — context-unaware (e.g. "collapsed" triggers Critical even if no casualties)
- Google News RSS returns redirect URLs, not direct article URLs
- Render free tier sleeps after 15 minutes of inactivity — first request takes 30-60 seconds to wake up
