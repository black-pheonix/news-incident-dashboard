import csv
import os

LOCATION_PATH = os.path.join(os.path.dirname(__file__), 'location_reference.csv')

LOCATIONS = []

with open(LOCATION_PATH, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        LOCATIONS.append(row)


def extract_location(title: str, description: str = '') -> dict:
    """
    Scan article text for known location names.
    Returns location dict with text, state, district, lat, lng, confidence.
    """
    combined = f"{title} {description}"
    combined_lower = combined.lower()

    for loc in LOCATIONS:
        place = loc.get('place_name', '')
        if place and place.lower() in combined_lower:
            return {
                'location_text': place,
                'state': loc.get('state', ''),
                'district': loc.get('district', ''),
                'latitude': float(loc['latitude']) if loc.get('latitude') else None,
                'longitude': float(loc['longitude']) if loc.get('longitude') else None,
                'confidence': 'high',
                'needs_geocoding': False
            }

    seen_districts = set()
    for loc in LOCATIONS:
        district = loc.get('district', '')
        if district and district not in seen_districts:
            seen_districts.add(district)
            if district.lower() in combined_lower:
                return {
                    'location_text': district,
                    'state': loc.get('state', ''),
                    'district': district,
                    'latitude': float(loc['latitude']) if loc.get('latitude') else None,
                    'longitude': float(loc['longitude']) if loc.get('longitude') else None,
                    'confidence': 'medium',
                    'needs_geocoding': False
                }

    seen_states = set()
    for loc in LOCATIONS:
        state = loc.get('state', '')
        if state and state not in seen_states:
            seen_states.add(state)
            if state.lower() in combined_lower:
                return {
                    'location_text': state,
                    'state': state,
                    'district': '',
                    'latitude': None,
                    'longitude': None,
                    'confidence': 'low',
                    'needs_geocoding': True  
                }

    return {
        'location_text': '',
        'state': '',
        'district': '',
        'latitude': None,
        'longitude': None,
        'confidence': 'low',
        'needs_geocoding': True
    }