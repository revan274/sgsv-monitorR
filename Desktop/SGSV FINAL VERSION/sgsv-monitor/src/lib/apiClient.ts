// En producción (Cloudflare Pages) la API está en el mismo origen: /auth, /incidentes, etc.
// En desarrollo local con wrangler pages dev también usa mismo origen.
// VITE_API_URL solo es necesario si corres el frontend y el backend en puertos distintos.
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || '').replace(/\/$/, '');
const TOKEN_KEY = 'sgsv_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string | null): void => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

// Siempre configurada: en Pages Functions el API vive en el mismo origen
export const isApiConfigured = (): boolean => true;

const buildHeaders = (): HeadersInit => {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const apiFetch = async (path: string, init: RequestInit = {}): Promise<unknown> => {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...buildHeaders(), ...(init.headers || {}) },
  });

  if (res.status === 401) {
    setToken(null);
    throw new Error('Sesion expirada. Por favor, vuelva a iniciar sesion.');
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((body as { error?: string }).error || `Error ${res.status}`);
  }

  return body;
};

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
};
