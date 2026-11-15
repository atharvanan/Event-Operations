import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://backend:5000/api/v1');
export const BACKEND_ORIGIN =
  typeof window !== 'undefined'
    ? window.location.origin
    : API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export function resolveAssetUrl(fileUrl?: string): string {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('blob:')) {
    return fileUrl;
  }
  return `${BACKEND_ORIGIN}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

export async function openProtectedFile(fileUrl: string, downloadFileName?: string): Promise<void> {
  if (typeof window === 'undefined' || !fileUrl) return;
  const fullUrl = resolveAssetUrl(fileUrl);
  const token = localStorage.getItem('eventops_token');
  const res = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Could not open file');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  if (downloadFileName) {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach Bearer token if present in localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('eventops_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth failure (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('eventops_token');
        localStorage.removeItem('eventops_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
