import { apiGet, apiPatch, apiPost, setAuthToken } from './apiClient';
import type { Role, Permission, UserProfile, ApiSession } from '../types';

export const ROLES = Object.freeze({
  OPERATOR: 'operador' as Role,
  ADMIN: 'administrador' as Role,
});

export const ROLE_LABELS: Record<Role, string> = Object.freeze({
  operador: 'Operador',
  administrador: 'Administrador',
});

export const PERMISSIONS = Object.freeze({
  CREATE_INCIDENTS: 'create_incidents' as Permission,
  DELETE_INCIDENTS: 'delete_incidents' as Permission,
  EDIT_INCIDENTS: 'edit_incidents' as Permission,
  EXPORT_INCIDENTS: 'export_incidents' as Permission,
  MANAGE_PCP: 'manage_pcp' as Permission,
  MANAGE_USERS: 'manage_users' as Permission,
});

const ROLE_PERMISSIONS: Record<Role, Permission[]> = Object.freeze({
  operador: [PERMISSIONS.CREATE_INCIDENTS],
  administrador: [
    PERMISSIONS.CREATE_INCIDENTS,
    PERMISSIONS.DELETE_INCIDENTS,
    PERMISSIONS.EDIT_INCIDENTS,
    PERMISSIONS.EXPORT_INCIDENTS,
    PERMISSIONS.MANAGE_PCP,
    PERMISSIONS.MANAGE_USERS,
  ],
});

const LOCAL_ADMIN_PROFILE: UserProfile = Object.freeze({
  id: 'local-admin',
  email: 'admin@sgsv',
  role: ROLES.ADMIN,
});

const TOKEN_KEY = 'sgsv_auth_token';

const normalizeRole = (role: unknown): Role =>
  role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.OPERATOR;

export const can = (role: Role | undefined, permission: Permission): boolean =>
  Boolean(ROLE_PERMISSIONS[normalizeRole(role)]?.includes(permission));

export const canAccessView = (role: Role | undefined, view: string): boolean => {
  if (normalizeRole(role) === ROLES.ADMIN) return true;
  return view === 'nuevo';
};

export const getDefaultViewForRole = (role: Role | undefined): string =>
  normalizeRole(role) === ROLES.ADMIN ? 'dashboard' : 'nuevo';

// ─── Auth cloud ───────────────────────────────────────────────────────────────

export const getCurrentSession = async (): Promise<ApiSession | null> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  setAuthToken(token);
  try {
    const raw = (await apiGet('/api/auth/session')) as { user?: UserProfile };
    if (!raw?.user) throw new Error('Sesion invalida.');
    return { token, user: { ...raw.user, role: normalizeRole(raw.user.role) } };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    return null;
  }
};

export const signInWithEmail = async (_credentials: {
  email: string;
  password: string;
}): Promise<ApiSession> => {
  const raw = (await apiPost('/api/auth/login', _credentials)) as ApiSession;
  const session = {
    token: String(raw.token || ''),
    user: { ...raw.user, role: normalizeRole(raw.user?.role) },
  };
  if (!session.token || !session.user?.id) throw new Error('Respuesta de autenticacion invalida.');
  localStorage.setItem(TOKEN_KEY, session.token);
  setAuthToken(session.token);
  return session;
};

export const signOut = async (): Promise<void> => {
  try { await apiPost('/api/auth/logout', {}); } catch { /* ignore */ }
  localStorage.removeItem(TOKEN_KEY);
  setAuthToken(null);
};

export const fetchProfiles = async (): Promise<UserProfile[]> => {
  const raw = (await apiGet('/api/profiles')) as Record<string, unknown>[];
  return (raw || []).map((u) => ({
    id: String(u.id || ''),
    email: String(u.email || ''),
    role: normalizeRole(u.role),
    created_at: u.created_at as string | undefined,
    updated_at: u.updated_at as string | undefined,
  }));
};

export const createProfile = async ({
  email,
  password,
  role,
}: {
  email: string;
  password: string;
  role: Role;
}): Promise<UserProfile> => {
  const created = (await apiPost('/api/profiles', { email, password, role })) as Record<string, unknown>;
  return {
    id: String(created.id || ''),
    email: String(created.email || email),
    role: normalizeRole(created.role),
    created_at: created.created_at as string | undefined,
    updated_at: created.updated_at as string | undefined,
  };
};

export const updateProfileRole = async ({
  id,
  role,
}: {
  id: string;
  role: Role;
}): Promise<UserProfile> => {
  const updated = (await apiPatch(`/api/profiles/${id}`, { role })) as Record<string, unknown>;
  return {
    id: String(updated.id || id),
    email: String(updated.email || ''),
    role: normalizeRole(updated.role),
  };
};
