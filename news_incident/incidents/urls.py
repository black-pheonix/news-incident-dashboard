from django.urls import path
from . import views

urlpatterns = [
    path('ingestion/run/', views.trigger_ingestion, name='trigger_ingestion'),
    path('dashboard/summary/', views.dashboard_summary, name = 'dashboard_summary'),
    path('incidents/', views.IncidentListView.as_view(), name = 'incident_list'),
    path('incidents/duplicates/', views.duplicate_groups, name='duplicate_groups'),
    path('incidents/<int:pk>/', views.IncidentDetailView.as_view(), name = 'incident_detail'),
    path('articles/', views.RawArticleListView.as_view(), name = 'article_list'),
]