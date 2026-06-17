from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from .models import RawArticle, Incident
from .serializers import (
    RawArticleSerializer,
    IncidentListSerializer,
    IncidentDetailSerializer
)
from .ingestion import run_ingestion


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_ingestion(request):
    """Run the ingestion pipeline and return stats."""
    try:
        stats = run_ingestion()
        return Response({'success': True, 'stats': stats})
    except Exception as e:
        return Response(
            {'success': False, 'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Return counts for dashboard summary cards."""
    total_articles = RawArticle.objects.count()
    total_incidents = Incident.objects.count()
    needs_review = Incident.objects.filter(
        review_status='needs_review'
    ).count()
    accepted = Incident.objects.filter(
        review_status='accepted'
    ).count()
    rejected = Incident.objects.filter(
        review_status='rejected'
    ).count()
    duplicates = Incident.objects.filter(
        is_duplicate=True
    ).count()

    return Response({
        'total_articles': total_articles,
        'total_incidents': total_incidents,
        'needs_review': needs_review,
        'accepted': accepted,
        'rejected': rejected,
        'duplicates': duplicates,
    })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def duplicate_groups(request):
    """Return groups of duplicate incidents."""
    duplicates = Incident.objects.filter(
        is_duplicate=True
    ).select_related('source_article', 'duplicate_of')

    groups = []
    for incident in duplicates:
        groups.append({
            'id': incident.id,
            'summary': incident.summary[:100],
            'category': incident.category,
            'location_text': incident.location_text,
            'duplicate_score': incident.duplicate_score,
            'duplicate_of_id': incident.duplicate_of.id if incident.duplicate_of else None,
            'duplicate_of_summary': incident.duplicate_of.summary[:100] if incident.duplicate_of else None,
        })

    return Response({'count': len(groups), 'results': groups})

class IncidentListView(generics.ListAPIView):
    serializer_class = IncidentListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Incident.objects.select_related('source_article')

        category = self.request.query_params.get('category')
        severity = self.request.query_params.get('severity')
        state = self.request.query_params.get('state')
        review_status = self.request.query_params.get('review_status')
        search = self.request.query_params.get('search')

        if category:
            queryset = queryset.filter(category=category)
        if severity:
            queryset = queryset.filter(severity=severity)
        if state:
            queryset = queryset.filter(state__icontains=state)
        if review_status:
            queryset = queryset.filter(review_status=review_status)
        if search:
            queryset = queryset.filter(
                Q(summary__icontains=search) |
                Q(location_text__icontains=search)
            )

        return queryset


class IncidentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = IncidentDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = Incident.objects.select_related(
        'source_article'
    ).prefetch_related('duplicates')

    def patch(self, request, *args, **kwargs):
        """Allow partial updates for review actions."""
        instance = self.get_object()
        allowed_fields = {
            'review_status', 'category',
            'severity', 'summary', 'location_text'
        }
        data = {
            k: v for k, v in request.data.items()
            if k in allowed_fields
        }

        if any(f in data for f in ['category', 'severity', 'summary']):
            data['review_status'] = 'edited'

        serializer = self.get_serializer(
            instance, data=data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RawArticleListView(generics.ListAPIView):
    serializer_class = RawArticleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = RawArticle.objects.all()
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(source__icontains=search)
            )
        return queryset