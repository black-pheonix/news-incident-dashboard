'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getIncidents } from '@/lib/api';
import { Incident } from '@/lib/types';
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <p className="text-gray-400">Loading map...</p>
        </div>
    )
});

export default function MapPage() {
    const router = useRouter();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                let allIncidents: Incident[] = [];
                let page = 1;
                let hasMore = true;

                while (hasMore) {
                    const data = await getIncidents({
                        page: String(page),
                        page_size: '100'
                    });
                    allIncidents = [...allIncidents, ...data.results];
                    hasMore = !!data.next;
                    page++;
                }
                const withCoords = allIncidents.filter(
                    i => i.latitude !== null && i.longitude !== null
                );
                setIncidents(withCoords);
            } catch {
                router.push('/login');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400">Loading incidents...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-400 hover:text-white text-sm"
                >
                    ← Back
                </button>
                <h1 className="text-lg font-bold">Incident Map</h1>
                <span className="text-gray-400 text-sm">
                    {incidents.length} incidents with location data
                </span>
            </div>
            <div className="flex-1" style={{ height: 'calc(100vh - 57px)' }}>
                <MapComponent incidents={incidents} />
            </div>
        </div>
    );
}