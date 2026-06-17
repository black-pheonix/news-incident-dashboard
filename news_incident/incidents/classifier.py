import json
import os

# Load rules once at module level — not on every function call
RULES_PATH = os.path.join(os.path.dirname(__file__), 'classification_rules.json')

with open(RULES_PATH, 'r') as f:
    RULES = json.load(f)

CATEGORY_RULES = RULES['categories']
SEVERITY_RULES = RULES['severity']


def classify_category(text: str) -> str:
    """Match text against category keywords. Returns first match or 'Other'."""
    text_lower = text.lower()

    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                return category

    return 'Other'


def classify_severity(text: str) -> str:
    """Match text against severity keywords. Returns highest severity found."""
    text_lower = text.lower()

    for severity in ['Critical', 'High', 'Medium', 'Low']:
        keywords = SEVERITY_RULES.get(severity, [])
        for keyword in keywords:
            if keyword.lower() in text_lower:
                return severity

    return 'Unknown'


def classify(title: str, description: str = '') -> dict:
    """Run both classifiers on combined text. Returns category and severity."""
    combined = f"{title} {description}"
    return {
        'category': classify_category(combined),
        'severity': classify_severity(combined),
    }