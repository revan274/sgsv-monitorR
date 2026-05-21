import { isApiConfigured, apiGet, apiPatch } from './apiClient';
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

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = Object.freeze({
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

export const LOCAL_ADMIN_PROFILE: UserProfile = Object.freeze({
  id: 'local-admin',
  email: 'admin@sgsv',
  role: ROLES.ADMIN,
});

export const normalizeRole = (role: unknown): Role =>
  role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.OPERATOR;

export const can = (role: Role | undefined, permission: Permission): boolean =>
  Boolean(ROLE_PERMISSIONS[normalizeRole(role)]?.includes(permission));

export const canAccessView = (role: Role | undefined, view: string): boolean => {
  if (normalizeRole(role) === ROLES.ADMIN) return true;
  return view === 'nuevo';
};

export const getDefaultViewForRole = (role: Role | undefined): string =>
  normalizeRole(role) === ROLES.ADMIN ? 'dashboard' : 'nuevo';

// ─── Auth (API mode — no real login, pseudo-session) ─────────────────────────

export const getCurrentSession = async (): Promise<ApiSession | null> => {
  if (!isApiConfigured()) return null;
  return { token: 'api', user: LOCAL_ADMIN_PROFILE };
};

export const signInWithEmail = async (_credentials: {
  email: string;
  password: string;
}): Promise<ApiSession> => {
  throw new Error('Autenticación por contraseña no habilitada en este modo.');
};

export const signOut = async (): Promise<void> => {
  // No-op: no real session to invalidate
};

export const fetchProfiles = async (): Promise<UserProfile[]> => {
  if (!isApiConfigured()) return [LOCAL_ADMIN_PROFILE];

  const raw = (await apiGet('/api/profiles')) as Record<string, unknown>[];
  return (raw || []).map((u) => ({
    id: String(u.id || ''),
    email: String(u.email || ''),
    role: normalizeRole(u.role),
    created_at: u.created_at as string | undefined,
    updated_at: u.updated_at as string | undefined,
  }));
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
