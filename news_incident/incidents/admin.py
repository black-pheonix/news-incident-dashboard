from django.contrib import admin
from .models import Incident, RawArticle

@admin.register(RawArticle)
class RawArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'source', 'published_at', 'ingested_at']
    search_fields = ['title', 'source']

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['category', 'severity','location_text','state','review_status', 'created_at']
    search_fields = ['summary', 'location_text']
    list_filter = ['category', 'severity', 'review_status', 'state']