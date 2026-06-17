'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Incident } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

interface Props {
    incidents: Incident[];
}

function severityColor(severity: string): string {
    const colors: Record<string, string> = {
        Critical: '#ef4444',
        High: '#f97316',
        Medium: '#eab308',
        Low: '#22c55e',
        Unknown: '#6b7280',
    };
    return colors[severity] || '#6b7280';
}

export default function MapComponent({ incidents }: Props) {
    return (
        <MapContainer
            center={[17.5, 80.0]}
            zoom={6}
            style={{ height: '100vh', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {incidents.map(incident => (
                <CircleMarker
                    key={incident.id}
                    center={[incident.latitude!, incident.longitude!]}
                    radius={8}
                    pathOptions={{
                        color: severityColor(incident.severity),
                        fillColor: severityColor(incident.severity),
                        fillOpacity: 0.7,
                        weight: 1,
                    }}
                >
                    <Popup>
                        <div style={{ minWidth: '200px' } as React.CSSProperties}>
                            <p style={{ fontWeight: 'bold', marginBottom: '4px' } as React.CSSProperties}>
                                {incident.category}
                            </p>
                            <p style={{ fontSize: '12px', marginBottom: '4px' } as React.CSSProperties}>
                                {incident.source_title?.split(' - ')[0]}
                            </p>
                            <p style={{ fontSize: '12px', color: '#666' } as React.CSSProperties}>
                                📍 {incident.location_text}
                            </p>
                            <p style={{ fontSize: '12px', color: '#666' } as React.CSSProperties}>
                                ⚠️ {incident.severity}
                            </p>
                            <a
                                href={`/dashboard/incidents/${incident.id}`}
                                style={{ fontSize: '12px', color: '#3b82f6' }}
                            >
                                View details
                            </a>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </MapContainer>
    );
}