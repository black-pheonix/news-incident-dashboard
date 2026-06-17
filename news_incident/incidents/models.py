from django.db import models


class RawArticle(models.Model):
    title = models.TextField()
    source = models.CharField(max_length=255)
    published_at = models.DateTimeField(null=True, blank=True)
    url = models.URLField(unique=True)  
    description = models.TextField(blank=True)
    matched_query = models.CharField(max_length=255, blank=True)
    raw_payload = models.JSONField(default=dict)
    ingested_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-ingested_at']


class Incident(models.Model):
    CATEGORY_CHOICES = [
        ('Fire', 'Fire'),
        ('Flood / Rain Damage', 'Flood / Rain Damage'),
        ('Road Accident', 'Road Accident'),
        ('Infrastructure Failure', 'Infrastructure Failure'),
        ('Power Outage', 'Power Outage'),
        ('Health / Food Safety', 'Health / Food Safety'),
        ('Public Safety', 'Public Safety'),
        ('Other', 'Other'),
    ]

    SEVERITY_CHOICES = [
        ('Critical', 'Critical'),
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
        ('Unknown', 'Unknown'),
    ]

    REVIEW_STATUS_CHOICES = [
        ('needs_review', 'Needs Review'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('edited', 'Edited'),
    ]

    
    source_article = models.ForeignKey(
        RawArticle,
        on_delete=models.CASCADE,
        related_name='incidents'
    )
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES)
    summary = models.TextField()
    severity = models.CharField(
        max_length=50,
        choices=SEVERITY_CHOICES,
        default='Unknown'
    )

    
    location_text = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_confidence = models.CharField(
        max_length=20,
        choices=[('high', 'High'), ('medium', 'Medium'), ('low', 'Low')],
        default='low'
    )

    
    review_status = models.CharField(
        max_length=20,
        choices=REVIEW_STATUS_CHOICES,
        default='needs_review'
    )

    
    is_duplicate = models.BooleanField(default=False)
    duplicate_of = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='duplicates'
    )
    duplicate_score = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.category} - {self.location_text}"

    class Meta:
        ordering = ['-created_at']