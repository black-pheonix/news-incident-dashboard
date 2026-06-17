const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000/api';

let accessToken:string | null=null;

export function setToken (token:string) {
    accessToken=token;
    sessionStorage.setItem('access_token', token);
}
export function getToken():string | null {
    if (accessToken) return accessToken;
    return sessionStorage.getItem('access_token');
}
export function clearToken() {
    accessToken=null;
    sessionStorage.removeItem('access_token');
}
async function apiFetch(endpoint:string, options:RequestInit = {}) {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? {Authorization:`Bearer ${token}`} : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        clearToken();
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    return response;
}
export async function login(username:string, password:string) {
    const response = await fetch(`${API_BASE}/auth/login/`, {
        method:'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password}),
    });
    if(!response.ok) throw new Error('Invalid credentials');
    const data = await response.json();
    setToken(data.access);
    return data;
}
export async function getDashboardSummary() {
    const response = await apiFetch('/dashboard/summary/');
    return response.json();
}
export async function getIncidents(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`/incidents/${query ? '?' + query : ''}`);
    return response.json()
}
export async function getIncident(id: number) {
    const response = await apiFetch(`/incidents/${id}/`);
    return response.json();
}
export async function updateIncident(id: number, data: Record<string, string>) {
    const response = await apiFetch(`/incidents/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
    return response.json();
}
export async function runIngestion() {
    const response = await apiFetch('/ingestion/run/', { method: 'POST' });
    return response.json();
}