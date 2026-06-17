'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getIncident, updateIncident } from '@/lib/api';
import { IncidentDetail } from '@/lib/types';
import Modal from '@/components/Modal';

function Badge({ text, color }: { text: string; color: string }) {
    return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
            {text}
        </span>
    );
}

function severityColor(s: string) {
    const m: Record<string, string> = {
        Critical: 'bg-red-900 text-red-300',
        High: 'bg-orange-900 text-orange-300',
        Medium: 'bg-yellow-900 text-yellow-300',
        Low: 'bg-green-900 text-green-300',
        Unknown: 'bg-gray-800 text-gray-400',
    };
    return m[s] || 'bg-gray-800 text-gray-400';
}

function confidenceColor(c: string) {
    const m: Record<string, string> = {
        high: 'bg-green-900 text-green-300',
        medium: 'bg-yellow-900 text-yellow-300',
        low: 'bg-red-900 text-red-300',
    };
    return m[c] || 'bg-gray-800 text-gray-400';
}

const CATEGORIES = ['Fire', 'Flood / Rain Damage', 'Road Accident', 'Infrastructure Failure', 'Power Outage', 'Health / Food Safety', 'Public Safety', 'Other'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];

export default function IncidentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [incident, setIncident] = useState<IncidentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [editData, setEditData] = useState({
        category: '',
        severity: '',
        summary: '',
        location_text: '',
    });

    async function load() {
        try {
            const data = await getIncident(Number(params.id));
            setIncident(data);
            setEditData({
                category: data.category,
                severity: data.severity,
                summary: data.summary,
                location_text: data.location_text,
            });
        } catch {
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [params.id]);

    async function updateStatus(status: string) {
        if (!incident) return;
        setUpdating(true);
        try {
            const updated = await updateIncident(incident.id, { review_status: status });
            setIncident(updated);
        } finally {
            setUpdating(false);
            setShowAcceptModal(false);
            setShowRejectModal(false);
        }
    }

    async function handleEdit() {
        if (!incident) return;
        setUpdating(true);
        try {
            const updated = await updateIncident(incident.id, editData);
            setIncident(updated);
            setShowEditModal(false);
        } finally {
            setUpdating(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400">Loading...</p>
            </div>
        );
    }

    if (!incident) return null;

    return (
        <div className="min-h-screen bg-gray-950 text-white">

            {/* Accept Confirmation Modal */}
            <Modal
                isOpen={showAcceptModal}
                onClose={() => setShowAcceptModal(false)}
                title="Accept Incident"
            >
                <p className="text-gray-300 text-sm mb-6">
                    Are you sure you want to accept this incident? This marks it as verified.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => setShowAcceptModal(false)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => updateStatus('accepted')}
                        disabled={updating}
                        className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                        {updating ? 'Accepting...' : 'Accept'}
                    </button>
                </div>
            </Modal>

            {/* Reject Confirmation Modal */}
            <Modal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                title="Reject Incident"
            >
                <p className="text-gray-300 text-sm mb-6">
                    Are you sure you want to reject this incident? This marks it as not relevant.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => setShowRejectModal(false)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => updateStatus('rejected')}
                        disabled={updating}
                        className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                        {updating ? 'Rejecting...' : 'Reject'}
                    </button>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Incident"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Category</label>
                        <select
                            value={editData.category}
                            onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Severity</label>
                        <select
                            value={editData.severity}
                            onChange={e => setEditData(d => ({ ...d, severity: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                            {SEVERITIES.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Location</label>
                        <input
                            type="text"
                            value={editData.location_text}
                            onChange={e => setEditData(d => ({ ...d, location_text: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Summary</label>
                        <textarea
                            value={editData.summary}
                            onChange={e => setEditData(d => ({ ...d, summary: e.target.value }))}
                            rows={4}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            onClick={() => setShowEditModal(false)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleEdit}
                            disabled={updating}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                        >
                            {updating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-400 hover:text-white text-sm"
                >
                    ← Back
                </button>
                <h1 className="text-lg font-bold">Incident Detail</h1>
            </div>

            <div className="p-6 max-w-4xl mx-auto space-y-6">

                {/* Review Actions */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Review Status</p>
                            <Badge
                                text={incident.review_status.replace('_', ' ')}
                                color={
                                    incident.review_status === 'accepted' ? 'bg-green-900 text-green-300' :
                                    incident.review_status === 'rejected' ? 'bg-red-900 text-red-300' :
                                    incident.review_status === 'edited' ? 'bg-purple-900 text-purple-300' :
                                    'bg-blue-900 text-blue-300'
                                }
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setShowAcceptModal(true)}
                                disabled={incident.review_status === 'accepted'}
                                className="bg-green-700 hover:bg-green-600 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Accept
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={incident.review_status === 'rejected'}
                                className="bg-red-700 hover:bg-red-600 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>

                {/* Incident Fields */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                    <h2 className="font-semibold text-gray-200">Incident Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Category</p>
                            <p className="text-white">{incident.category}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Severity</p>
                            <Badge text={incident.severity} color={severityColor(incident.severity)} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Location</p>
                            <p className="text-white">{incident.location_text || '—'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">State</p>
                            <p className="text-white">{incident.state || '—'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">District</p>
                            <p className="text-white">{incident.district || '—'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Location Confidence</p>
                            <Badge
                                text={incident.location_confidence}
                                color={confidenceColor(incident.location_confidence)}
                            />
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Coordinates</p>
                            <p className="text-white text-sm">
                                {incident.latitude && incident.longitude
                                    ? `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Duplicate</p>
                            <p className="text-white">
                                {incident.is_duplicate
                                    ? `Yes (score: ${incident.duplicate_score?.toFixed(1)})`
                                    : 'No'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs mb-1">Summary</p>
                        <p className="text-white text-sm leading-relaxed break-words overflow-hidden">
                            {incident.summary}
                        </p>
                    </div>
                </div>

                {/* Source Article */}
                {incident.source_article && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                        <h2 className="font-semibold text-gray-200">Source Article</h2>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs mb-1">Source</p>
                                <p className="text-white">{incident.source_article.source}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs mb-1">Published</p>
                                <p className="text-white">
                                    {new Date(incident.source_article.published_at).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs mb-1">Matched Query</p>
                                <p className="text-white">{incident.source_article.matched_query}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs mb-1">Ingested At</p>
                                <p className="text-white">
                                    {new Date(incident.source_article.ingested_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Title</p>
                            <p className="text-white text-sm">{incident.source_article.title}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs mb-1">Description</p>
                            <p className="text-gray-300 text-sm leading-relaxed break-words overflow-hidden">
                                {incident.source_article.description || '—'}
                            </p>
                        </div>
                        <a
                            href={incident.source_article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm inline-block"
                        >
                            View original article
                        </a>
                    </div>
                )}

                {/* Possible Duplicates */}
                {incident.duplicates && incident.duplicates.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h2 className="font-semibold text-gray-200 mb-3">
                            Possible Duplicates ({incident.duplicates.length})
                        </h2>
                        <div className="space-y-2">
                            {incident.duplicates.map(dup => (
                                <div
                                    key={dup.id}
                                    className="flex justify-between items-center p-3 bg-gray-800 rounded-lg"
                                >
                                    <div>
                                        <p className="text-white text-sm">{dup.source_title}</p>
                                        <p className="text-gray-400 text-xs">{dup.location_text}</p>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/dashboard/incidents/${dup.id}`)}
                                        className="text-blue-400 hover:text-blue-300 text-xs ml-4"
                                    >
                                        View
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}