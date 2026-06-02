const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export const isApiConfigured = (): boolean => true;

interface ApiError extends Error {
  status: number;
}

let _authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  _authToken = token;
};

const base = (): string => {
  return API_URL;
};

const fetchJson = async (url: string, init?: RequestInit): Promise<unknown> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const err = new Error(`API ${res.status}: ${text}`) as ApiError;
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json() as Promise<unknown>;
};

export const apiGet = (path: string): Promise<unknown> =>
  fetchJson(`${base()}${path}`);

export const apiPost = (path: string, body: unknown): Promise<unknown> =>
  fetchJson(`${base()}${path}`, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = (path: string, body: unknown): Promise<unknown> =>
  fetchJson(`${base()}${path}`, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = (path: string): Promise<unknown> =>
  fetchJson(`${base()}${path}`, { method: 'DELETE' });

export const apiUpsert = async (path: string, id: string, body: unknown): Promise<unknown> => {
  try {
    return await apiPatch(`${path}/${id}`, body);
  } catch (err) {
    if ((err as ApiError).status === 404) {
      return apiPost(path, { ...(body as object), id });
    }
    throw err;
  }
};

// Multipart upload — no pone Content-Type para que el browser añada el boundary
export const apiUpload = async (path: string, formData: FormData): Promise<unknown> => {
  const headers: Record<string, string> = {};
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
  const res = await fetch(`${base()}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const err = new Error(`API ${res.status}: ${text}`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<unknown>;
};
