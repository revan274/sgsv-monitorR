import { requireSupabase, isSupabaseConfigured } from './supabaseClient';
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

// ─── Auth con Supabase ────────────────────────────────────────────────────────

export const getCurrentSession = async (): Promise<ApiSession | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = requireSupabase();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const userProfile: UserProfile = profile
      ? { id: profile.id, email: profile.email, role: normalizeRole(profile.role) }
      : {
          id: session.user.id,
          email: session.user.email || '',
          role: normalizeRole(
            (session.user.app_metadata?.role as string | undefined) ||
            (session.user.user_metadata?.role as string | undefined),
          ),
        };

    return { token: session.access_token, user: userProfile };
  } catch {
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
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error || !data.session) {
    throw new Error(error?.message || 'Error al iniciar sesion');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.session.user.id)
    .single();

  const userProfile: UserProfile = profile
    ? { id: profile.id, email: profile.email, role: normalizeRole(profile.role) }
    : {
        id: data.session.user.id,
        email: data.session.user.email || email,
        role: normalizeRole(
          (data.session.user.app_metadata?.role as string | undefined) ||
          (data.session.user.user_metadata?.role as string | undefined),
        ),
      };

  return { token: data.session.access_token, user: userProfile };
};

export const signOut = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const supabase = requireSupabase();
  await supabase.auth.signOut();
};

export const fetchProfiles = async (): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = requireSupabase();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('email');
    
  if (error || !data) return [];
  
  return data.map((u) => ({ 
    id: u.id,
    email: u.email,
    role: normalizeRole(u.role) 
  }));
};

export const updateProfileRole = async ({
  id,
  role,
}: {
  id: string;
  role: Role;
}): Promise<UserProfile> => {
  const supabase = requireSupabase();
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single();
    
  if (error || !data) {
    throw new Error('Error al actualizar el rol');
  }
  
  return { 
    id: data.id,
    email: data.email,
    role: normalizeRole(data.role) 
  };
};
