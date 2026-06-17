import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'news_incident.settings')
django.setup()

from incidents.ingestion import run_ingestion
print("--- INGESTION TEST ---")
stats = run_ingestion()
print(stats)