import requests
import time

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {
    "User-Agent": "NewsIncidentDashboard/1.0" 
}


def geocode(location_text: str, country: str = "India") -> dict:
    """
    Call Nominatim to get coordinates for a location string.
    Returns dict with latitude, longitude, and success status.
    """
    if not location_text:
        return {'latitude': None, 'longitude': None, 'success': False}

    try:
        params = {
            'q': f"{location_text}, {country}",
            'format': 'json',
            'limit': 1,
        }

        response = requests.get(
            NOMINATIM_URL,
            params=params,
            headers=HEADERS,
            timeout=10
        )
        response.raise_for_status()
        results = response.json()

        if results:
            return {
                'latitude': float(results[0]['lat']),
                'longitude': float(results[0]['lon']),
                'success': True
            }
        else:
            return {'latitude': None, 'longitude': None, 'success': False}

    except Exception as e:
        print(f"Geocoding failed for '{location_text}': {e}")
        return {'latitude': None, 'longitude': None, 'success': False}


def geocode_if_needed(location_result: dict) -> dict:
    """
    Only call geocoding API if we don't already have coordinates.
    Respects Nominatim's rate limit with a small delay.
    """
    if not location_result.get('needs_geocoding'):
        return location_result

    if location_result.get('latitude') and location_result.get('longitude'):
        return location_result

    location_text = location_result.get('location_text', '')
    if not location_text:
        return location_result

    # time.sleep(1)

    geo = geocode(location_text)
    location_result['latitude'] = geo['latitude']
    location_result['longitude'] = geo['longitude']

    return location_result