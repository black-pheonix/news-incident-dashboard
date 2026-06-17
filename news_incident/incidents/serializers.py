from rest_framework import serializers
from .models import RawArticle, Incident


class RawArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawArticle
        fields = [
            'id', 'title', 'source', 'published_at',
            'url', 'description', 'matched_query', 'ingested_at'
        ]


class IncidentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    source_title = serializers.CharField(
        source='source_article.title',
        read_only=True
    )

    class Meta:
        model = Incident
        fields = [
            'id', 'category', 'severity', 'summary',
            'location_text', 'state', 'district',
            'latitude', 'longitude', 'location_confidence',
            'review_status', 'is_duplicate', 'created_at',
            'source_title'
        ]


class IncidentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail view including source article."""
    source_article = RawArticleSerializer(read_only=True)
    duplicates = IncidentListSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'category', 'severity', 'summary',
            'location_text', 'state', 'district',
            'latitude', 'longitude', 'location_confidence',
            'review_status', 'is_duplicate', 'duplicate_score',
            'source_article', 'duplicates', 'created_at', 'updated_at'
        ]