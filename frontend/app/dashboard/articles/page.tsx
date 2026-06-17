'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

interface Article {
    id: number;
    title: string;
    source: string;
    published_at: string;
    url: string;
    description: string;
    matched_query: string;
    ingested_at: string;
}

interface PaginatedArticles {
    count: number;
    next: string | null;
    previous: string | null;
    results: Article[];
}

export default function ArticlesPage() {
    const router = useRouter();
    const [articles, setArticles] = useState<PaginatedArticles | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    async function load() {
        try {
            const token = getToken();
            if (!token) { router.push('/login'); return; }

            const params = new URLSearchParams({
                page: String(page),
                ...(search ? { search } : {})
            });

            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
            const response = await fetch(
                `${API_BASE}/articles/?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.status === 401) { router.push('/login'); return; }
            const data = await response.json();
            setArticles(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [page, search]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-400 hover:text-white text-sm"
                >
                    ← Back
                </button>
                <h1 className="text-lg font-bold">Raw Articles</h1>
                <span className="text-gray-400 text-sm">
                    {articles?.count} total
                </span>
            </div>

            <div className="p-6 space-y-4">
                <input
                    type="text"
                    placeholder="Search articles..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-80"
                />

                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400">
                                <th className="text-left px-4 py-3">Title</th>
                                <th className="text-left px-4 py-3">Source</th>
                                <th className="text-left px-4 py-3">Query</th>
                                <th className="text-left px-4 py-3">Published</th>
                                <th className="text-left px-4 py-3">Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles?.results.map(article => (
                                <tr key={article.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                    <td className="px-4 py-3 max-w-xs">
                                        <p className="text-gray-300 truncate">
                                            {article.title.split(' - ')[0]}
                                        </p>
                                        {article.description && (
                                            <p className="text-gray-500 text-xs truncate mt-1">
                                                {article.description.slice(0, 80)}...
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                                        {article.source}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                        {article.matched_query}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                        {article.published_at
                                            ? new Date(article.published_at).toLocaleDateString()
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 text-xs"
                                        >
                                            Open
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="px-4 py-3 flex justify-between items-center border-t border-gray-800">
                        <p className="text-gray-400 text-sm">{articles?.count} articles</p>
                        <div className="flex gap-2">
                            <button
                                disabled={!articles?.previous}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 text-gray-400 text-sm">Page {page}</span>
                            <button
                                disabled={!articles?.next}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}