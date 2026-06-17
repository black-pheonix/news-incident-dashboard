export interface Incident {
    id: number;
    category: string;
    severity: string;
    summary: string;
    location_text: string;
    state: string;
    district: string;
    latitude: number | null;
    longitude: number | null;
    location_confidence: string;
    review_status: string;
    is_duplicate: boolean;
    created_at: string;
    source_title: string;
}

export interface IncidentDetail extends Incident {
    duplicate_score: number | null;
    updated_at: string;
    source_article: {
        id: number;
        title: string;
        source: string;
        published_at: string;
        url: string;
        description: string;
        matched_query: string;
        ingested_at: string;
    };
    duplicates: Incident[];
}

export interface DashboardSummary {
    total_articles: number;
    total_incidents: number;
    needs_review: number;
    accepted: number;
    rejected: number;
    duplicates: number;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}