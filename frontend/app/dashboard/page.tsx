'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardSummary, getIncidents, runIngestion, clearToken } from '@/lib/api';
import { DashboardSummary, Incident, PaginatedResponse } from '@/lib/types';

const CATEGORIES = ['Fire', 'Flood / Rain Damage', 'Road Accident', 'Infrastructure Failure', 'Power Outage', 'Health / Food Safety', 'Public Safety', 'Other'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];
const STATUSES = ['needs_review', 'accepted', 'rejected', 'edited'];

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function severityColor(severity: string) {
    const map: Record<string, string> = {
        Critical: 'bg-red-900 text-red-300',
        High: 'bg-orange-900 text-orange-300',
        Medium: 'bg-yellow-900 text-yellow-300',
        Low: 'bg-green-900 text-green-300',
        Unknown: 'bg-gray-800 text-gray-400',
    };
    return map[severity] || 'bg-gray-800 text-gray-400';
}

function statusColor(status: string) {
    const map: Record<string, string> = {
        needs_review: 'bg-blue-900 text-blue-300',
        accepted: 'bg-green-900 text-green-300',
        rejected: 'bg-red-900 text-red-300',
        edited: 'bg-purple-900 text-purple-300',
    };
    return map[status] || 'bg-gray-800 text-gray-400';
}

export default function DashboardPage() {
    const router = useRouter();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [incidents, setIncidents] = useState<PaginatedResponse<Incident> | null>(null);
    const [loading, setLoading] = useState(true);
    const [ingesting, setIngesting] = useState(false);
    const [filters, setFilters] = useState({ category: '', severity: '', review_status: '', search: '', state: '', page: '1' });

    async function loadData() {
        try {
            const [summaryData, incidentData] = await Promise.all([
                getDashboardSummary(),
                getIncidents(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)))
            ]);
            setSummary(summaryData);
            setIncidents(incidentData);
        } catch {
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadData(); }, [filters]);

    async function handleIngestion() {
        setIngesting(true);
        try {
            await runIngestion();
            await loadData();
        } finally {
            setIngesting(false);
        }
    }

    function handleLogout() {
        clearToken();
        router.push('/login');
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">Incident Dashboard</h1>
                <div className="flex gap-3">
                    <button
                        onClick={handleIngestion}
                        disabled={ingesting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        {ingesting ? 'Running...' : 'Run Ingestion'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Logout
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/map')}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Map View
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/articles')}
                        className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Articles
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <SummaryCard label="Articles" value={summary.total_articles} color="text-white" />
                        <SummaryCard label="Incidents" value={summary.total_incidents} color="text-white" />
                        <SummaryCard label="Needs Review" value={summary.needs_review} color="text-blue-400" />
                        <SummaryCard label="Accepted" value={summary.accepted} color="text-green-400" />
                        <SummaryCard label="Rejected" value={summary.rejected} color="text-red-400" />
                        <SummaryCard label="Duplicates" value={summary.duplicates} color="text-yellow-400" />
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={filters.search}
                        onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: '1' }))}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <select
                        value={filters.category}
                        onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: '1' }))}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        value={filters.severity}
                        onChange={e => setFilters(f => ({ ...f, severity: e.target.value, page: '1' }))}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                        <option value="">All Severities</option>
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={filters.review_status}
                        onChange={e => setFilters(f => ({ ...f, review_status: e.target.value, page: '1' }))}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                        <option value="">All Statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Filter by state..."
                        value={filters.state}
                        onChange={e => setFilters(f => ({ ...f, state: e.target.value, page: '1' }))}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Incidents Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400">
                                <th className="text-left px-4 py-3">Title</th>
                                <th className="text-left px-4 py-3">Category</th>
                                <th className="text-left px-4 py-3">Severity</th>
                                <th className="text-left px-4 py-3">Location</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-left px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incidents?.results.map(incident => (
                                <tr key={incident.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                    <td className="px-4 py-3 max-w-xs truncate text-gray-300">
                                        {incident.source_title.split(' - ')[0]}
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{incident.category}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityColor(incident.severity)}`}>
                                            {incident.severity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">
                                        {incident.location_text || '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor(incident.review_status)}`}>
                                            {incident.review_status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => router.push(`/dashboard/incidents/${incident.id}`)}
                                            className="text-blue-400 hover:text-blue-300 text-xs"
                                        >
                                            View →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="px-4 py-3 flex justify-between items-center border-t border-gray-800">
                        <p className="text-gray-400 text-sm">
                            {incidents?.count} total incidents
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={!incidents?.previous}
                                onClick={() => setFilters(f => ({ ...f, page: String(Number(f.page) - 1) }))}
                                className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 text-gray-400 text-sm">
                                Page {filters.page}
                            </span>
                            <button
                                disabled={!incidents?.next}
                                onClick={() => setFilters(f => ({ ...f, page: String(Number(f.page) + 1) }))}
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