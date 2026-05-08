import { api, getToken, setToken, isApiConfigured } from './apiClient';
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
  email: 'modo.local@sgsv',
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

// ─── Auth con JWT ─────────────────────────────────────────────────────────────

export const getCurrentSession = async (): Promise<ApiSession | null> => {
  if (!isApiConfigured()) return null;
  const token = getToken();
  if (!token) return null;

  try {
    const user = await api.get('/auth/me') as UserProfile;
    return { token, user: { ...user, role: normalizeRole(user.role) } };
  } catch {
    setToken(null);
    return null;
  }
};

export const signInWithEmail = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<ApiSession> => {
  const data = await api.post('/auth/login', { email, password }) as {
    token: string;
    user: UserProfile;
  };
  setToken(data.token);
  return { token: data.token, user: { ...data.user, role: normalizeRole(data.user.role) } };
};

export const signOut = (): void => {
  setToken(null);
};

export const fetchProfiles = async (): Promise<UserProfile[]> => {
  const data = await api.get('/usuarios') as UserProfile[];
  return data.map((u) => ({ ...u, role: normalizeRole(u.role) }));
};

export const updateProfileRole = async ({
  id,
  role,
}: {
  id: string;
  role: Role;
}): Promise<UserProfile> => {
  const data = await api.put(`/usuarios/${id}/role`, { role }) as UserProfile;
  return { ...data, role: normalizeRole(data.role) };
};
