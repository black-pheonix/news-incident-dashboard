# Architecture Note

## Overview

The system is a full-stack web application with three deployed services:

```
Vercel (Next.js)  ──────►  Render (Django + Gunicorn)  ──────►  Supabase (PostgreSQL)
                                        │
                                        ▼
                              Google News RSS (ingest)
                              OpenStreetMap Nominatim (geocode)
```

---

## Data Model

Two core database tables:

### RawArticle
Stores exactly what came from the RSS feed — no transformation.

| Field | Type | Notes |
|-------|------|-------|
| title | TextField | Full article headline |
| source | CharField(500) | Publisher name |
| url | URLField(2000, unique) | Unique constraint prevents duplicate ingestion |
| published_at | DateTimeField | Original publication time |
| description | TextField | Article snippet or summary |
| matched_query | CharField | Which feed query found this article |
| raw_payload | JSONField | Complete feedparser entry for debugging |
| ingested_at | DateTimeField(auto) | When we stored it |

### Incident
Derived from a RawArticle — structured, reviewable, geospatial.

| Field | Type | Notes |
|-------|------|-------|
| source_article | ForeignKey(RawArticle) | CASCADE delete |
| category | CharField | Fire, Flood, Road Accident, etc. |
| severity | CharField | Critical, High, Medium, Low, Unknown |
| summary | TextField | Cleaned title + snippet |
| location_text | CharField | Human-readable location name |
| state | CharField | Extracted state |
| district | CharField | Extracted district/city |
| latitude | FloatField | From CSV or Nominatim |
| longitude | FloatField | From CSV or Nominatim |
| location_confidence | CharField | high / medium / low |
| review_status | CharField | needs_review / accepted / rejected / edited |
| is_duplicate | BooleanField | Flagged by content similarity |
| duplicate_of | ForeignKey(self) | Points to the original incident |
| duplicate_score | FloatField | 0–100 similarity score |

---

## Ingestion Flow

```
1. Load feed_queries.json (10 predefined incident queries)
        │
        ▼
2. Build Google News RSS URL for each query
   https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en
        │
        ▼
3. Parse feed with feedparser — take first 10 entries per feed
        │
        ▼
4. For each article:
   ├── store_article()
   │   ├── Try get_or_create on URL (unique constraint)
   │   ├── If URL exists: skip (duplicate article)
   │   └── If new: store as RawArticle
   │
   └── create_incident()
       ├── classify() → category + severity via keyword matching
       ├── extract_location() → scan text against location_reference.csv
       ├── geocode_if_needed() → call Nominatim if no coordinates
       ├── check_duplicate_incident() → fuzzy match against recent incidents
       └── Incident.objects.create(...)
```

---

## Incident Detection Approach

**Method:** Rule-based keyword matching using `classification_rules.json`

**Category classification:**
- Iterate category → keyword mappings in order
- Scan combined title + description for each keyword (case-insensitive)
- Return first matching category, or "Other" if no match

**Severity classification:**
- Check severity levels in fixed priority order: Critical → High → Medium → Low
- Return first match found, or "Unknown" if no match
- Priority order ensures Critical beats High when both keywords appear

**Explainability:** Every classification decision is traceable to a specific keyword in `classification_rules.json`. No black-box LLM involved.

**Known limitation:** Context-unaware. "No casualties were reported after the building collapsed" correctly classifies as Infrastructure Failure but incorrectly scores Critical severity because "collapsed" is in the Critical keyword list regardless of context.

---

## Location Extraction and Geocoding

**Three-tier approach:**

**Tier 1 — Place name match (high confidence)**
Scan article text for exact place names from `location_reference.csv` (25 Indian cities). Returns pre-stored lat/lng directly — no API call needed.

**Tier 2 — District match (medium confidence)**
If no place name match, scan for district names from the same CSV. Returns approximate district-center coordinates.

**Tier 3 — State match + Nominatim geocoding (low confidence)**
If no district match, look for state names. Call Nominatim geocoding API with the state name to get approximate coordinates. Incidents with only state-level location are marked low confidence and are less reliable map markers.

**No location found:**
Incident is still stored with empty location fields and `confidence = low`. It appears in the table but not on the map.

---

## Deduplication

**Two-layer approach:**

**Layer 1 — URL deduplication (article level)**
Django's `get_or_create` with `url` as the lookup field. PostgreSQL unique constraint enforces this at the database level. Prevents the same article from being stored twice across ingestion runs.

**Layer 2 — Content similarity (incident level)**
Uses `rapidfuzz` library for fuzzy string matching:

```
combined_score = (title_similarity × 0.7) + (location_similarity × 0.3)
```

- Title similarity: `fuzz.token_sort_ratio` — handles word order differences
- Location similarity: `fuzz.ratio` — exact location string comparison
- Threshold: 75% combined score
- Scope: same category only, within 7-day time window

An incident scoring above threshold is flagged `is_duplicate=True` with a reference to the original incident and the similarity score.

**Known limitation:** Articles describing the same incident in very different words (e.g., "fire at Nampally factory" vs "blaze destroys industrial unit in Hyderabad") may not be caught by string similarity alone. Semantic embedding-based deduplication would improve this.

---

## API Design

REST API built with Django REST Framework. JWT authentication via `djangorestframework-simplejwt`.

**Authentication flow:**
```
POST /api/auth/login/ → {access, refresh}
GET  /api/incidents/  → Authorization: Bearer {access}
```

**Two serializer pattern to avoid N+1 queries:**
- `IncidentListSerializer` — lightweight, used for paginated list view
- `IncidentDetailSerializer` — full, includes nested source_article and duplicates
  - Uses `select_related('source_article')` for JOIN
  - Uses `prefetch_related('duplicates')` for reverse FK batch

**Pagination:** 20 results per page via DRF's `PageNumberPagination`.

---

## Frontend Architecture

Next.js 15 App Router. All pages are client components (`'use client'`) since they fetch live data from the API after authentication.

**Authentication pattern:**
- JWT access token stored in `sessionStorage` (survives page refresh, cleared on tab close)
- All API calls go through `apiFetch()` in `lib/api.ts` which injects the Bearer token automatically
- 401 responses trigger a redirect to `/login`

**Map implementation:**
- Leaflet loaded with `dynamic(() => import(...), { ssr: false })` to avoid server-side rendering errors (Leaflet requires `window`)
- Incidents fetched in pages and accumulated client-side before rendering
- `CircleMarker` with severity-based color coding
- Popup on click showing incident summary and link to detail page

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel (CDN + Edge Network)                 │
│              Next.js 15 Frontend                         │
│              news-incident-dashboard.vercel.app          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS API calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Render (Free Web Service)                   │
│              Django 6 + Gunicorn (1 worker)              │
│              news-incident-dashboard.onrender.com        │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────┐    │
│  │ Django REST API  │    │ Background: feedparser   │    │
│  │ JWT Auth        │    │ Nominatim geocoding       │    │
│  │ DRF Serializers │    │ rapidfuzz deduplication  │    │
│  └────────┬────────┘    └──────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ PostgreSQL wire protocol
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (Free tier)                        │
│              PostgreSQL 15                               │
│              ap-south-1 (Mumbai)                         │
└─────────────────────────────────────────────────────────┘
```

**Free tier constraints and mitigations:**
- Render sleeps after 15min inactivity → documented in README, acceptable for demo
- Render 30s HTTP timeout → Gunicorn timeout set to 300s, ingestion limited to 10 articles/feed
- Supabase 500MB storage limit → well within range for this data volume

---

## What I Would Improve With More Time

**Short term (1–2 days):**
- Expand `location_reference.csv` to cover all major Indian cities and districts (currently 25 locations)
- Add Celery + Redis for async ingestion — remove HTTP timeout dependency entirely
- Add scheduled ingestion (Django-cron or Celery beat) to run automatically every hour

**Medium term (3–5 days):**
- Replace keyword classification with spaCy NER for context-aware incident detection
- Implement semantic embedding-based deduplication using sentence-transformers
- Add citation display showing which text fragment triggered each classification decision
- Add pagination to map view (currently loads all incidents at once)

**Long term:**
- Multi-source ingestion beyond Google News (GDELT, direct RSS feeds from Indian news outlets)
- Alert/notification system when Critical incidents are detected
- Historical trend analysis — incident frequency by region and category over time
- User management with role-based permissions (viewer vs editor vs admin)
