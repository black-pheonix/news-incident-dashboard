import json
import os
import feedparser
from datetime import datetime
from dateutil import parser as dateparser
from rapidfuzz import fuzz
from django.utils import timezone
from datetime import timedelta
import re

from .models import RawArticle, Incident
from .classifier import classify
from .locator import extract_location
from .geocoder import geocode_if_needed

QUERIES_PATH = os.path.join(os.path.dirname(__file__), 'feed_queries.json')
with open(QUERIES_PATH, 'r') as f:
    FEED_QUERIES = json.load(f)['queries']

def strip_html(text: str) -> str:
    if not text:
        return ''
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'<[^>]*$', '', text)
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
def build_rss_url(query: str) -> str:
    """Build Google News RSS URL for a search query."""
    import urllib.parse
    encoded = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"


def fetch_feed(query_config: dict) -> list:
    """Fetch and parse a Google News RSS feed."""
    url = build_rss_url(query_config['query'])
    print(f"Fetching: {query_config['name']} → {url}")

    try:
        feed = feedparser.parse(url)
        articles = []

        for entry in feed.entries[:10]:
            articles.append({
                'title': entry.get('title', ''),
                'url': entry.get('link', ''),
                'description': entry.get('summary', ''),
                'published_at': entry.get('published', ''),
                'source': entry.get('source', {}).get('title', 'Google News'),
                'matched_query': query_config['name'],
                'raw_payload': dict(entry),
            })

        print(f"  Found {len(articles)} articles")
        return articles

    except Exception as e:
        print(f"  Feed fetch failed: {e}")
        return []


def parse_datetime(dt_string: str):
    """Parse datetime string safely."""
    if not dt_string:
        return timezone.now()
    try:
        return dateparser.parse(dt_string)
    except Exception:
        return timezone.now()


def store_article(article: dict) -> RawArticle | None:
    """
    Store a raw article. Returns None if duplicate URL exists.
    url field has unique=True so we use get_or_create.
    """
    try:
        raw_payload = article.get('raw_payload', {})
        serializable_payload = {}
        for k, v in raw_payload.items():
            try:
                json.dumps({k: v})
                serializable_payload[k] = v
            except (TypeError, ValueError):
                serializable_payload[k] = str(v)

        obj, created = RawArticle.objects.get_or_create(
            url=article['url'],
            defaults={
                'title': article['title'],
                'source': article['source'][:499],
                'published_at': parse_datetime(article['published_at']),
                'description': strip_html(article['description']),
                'matched_query': article['matched_query'],
                'raw_payload': serializable_payload,
            }
        )

        if created:
            return obj
        else:
            print(f"  Skipping duplicate URL: {article['url'][:60]}")
            return None

    except Exception as e:
        print(f"  Failed to store article: {e}")
        return None


def check_duplicate_incident(summary: str, location_text: str,
                              category: str, published_at) -> tuple:
    

    time_window = timezone.now() - timedelta(days=7)

    recent_incidents = Incident.objects.filter(
        category=category,
        created_at__gte=time_window
    ).order_by('-created_at')[:50]

    for incident in recent_incidents:
        title_score = fuzz.token_sort_ratio(summary, incident.summary)
        location_score = fuzz.ratio(
            location_text.lower(),
            incident.location_text.lower()
        )
        combined_score = (title_score * 0.7) + (location_score * 0.3)

        if combined_score > 75:
            return True, incident, combined_score

    return False, None, 0.0


def create_incident(raw_article: RawArticle) -> Incident | None:
    """
    Extract incident from raw article and store it.
    """
    try:
        title = raw_article.title
        description = raw_article.description
        classification = classify(title, description)
        location = extract_location(title, description)
        location = geocode_if_needed(location)
        summary = strip_html(f"{title}. {description[:200]}" if description else title)
        is_dup, dup_incident, dup_score = check_duplicate_incident(
            summary,
            location.get('location_text', ''),
            classification['category'],
            raw_article.published_at
        )

        incident = Incident.objects.create(
            source_article=raw_article,
            category=classification['category'],
            severity=classification['severity'],
            summary=summary,
            location_text=location.get('location_text', ''),
            state=location.get('state', ''),
            district=location.get('district', ''),
            latitude=location.get('latitude'),
            longitude=location.get('longitude'),
            location_confidence=location.get('confidence', 'low'),
            is_duplicate=is_dup,
            duplicate_of=dup_incident if is_dup else None,
            duplicate_score=dup_score if is_dup else None,
            review_status='needs_review',
        )

        return incident

    except Exception as e:
        print(f"  Failed to create incident: {e}")
        return None


def run_ingestion() -> dict:
    """
    Main ingestion function. Fetches all feeds and processes articles.
    Returns summary stats.
    """
    stats = {
        'feeds_fetched': 0,
        'articles_found': 0,
        'articles_stored': 0,
        'incidents_created': 0,
        'duplicates_found': 0,
        'errors': 0,
    }

    for query_config in FEED_QUERIES:
        articles = fetch_feed(query_config)
        stats['feeds_fetched'] += 1
        stats['articles_found'] += len(articles)

        for article in articles:
            raw = store_article(article)
            if raw is None:
                continue

            stats['articles_stored'] += 1
            incident = create_incident(raw)

            if incident:
                stats['incidents_created'] += 1
                if incident.is_duplicate:
                    stats['duplicates_found'] += 1
            else:
                stats['errors'] += 1

    print(f"\nIngestion complete: {stats}")
    return stats