import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  loadBootstrap,
  saveConfig,
  insertIncidente,
  upsertIncidente,
  deleteIncidenteById,
  upsertPersonaInteres,
  deletePersonaInteresById,
  upsertTurno,
} from '../lib/storage';
import { isApiConfigured, setAuthToken } from '../lib/apiClient';
import {
  PERMISSIONS,
  ROLES,
  can,
  canAccessView,
  createProfile,
  fetchProfiles,
  getCurrentSession,
  getDefaultViewForRole,
  signOut as authSignOut,
  signInWithEmail,
  updateProfileRole,
} from '../lib/auth';
import {
  normalizeIncident,
  normalizePersona,
  sortByTimestampDesc,
  createId,
} from '../lib/utils';
import { validateIncidente, validatePersonaInteres } from '../lib/schemas';
import type {
  Incidente,
  PersonaInteres,
  Turno,
  NotaTurno,
  UserProfile,
  Role,
  AppConfig,
  ApiSession,
} from '../types';

const assertPermission = (role: Role, permission: string): void => {
  if (!can(role, permission as Parameters<typeof can>[1])) {
    throw new Error('Permiso insuficiente para ejecutar esta operacion.');
  }
};

const assertCloudOnline = (): void => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('SGSV Cloud requiere conexion para guardar cambios.');
  }
};

// ─── Tipos del Store ──────────────────────────────────────────────────────────

interface AppState {
  view: string;
  incidentes: Incidente[];
  personasInteres: PersonaInteres[];
  usuarios: UserProfile[];
  turnos: Turno[];
  turnoActivo: Turno | null;
  config: AppConfig;

  role: Role;
  profile: UserProfile | null;
  session: ApiSession | null;
  cloudEnabled: boolean;
  realAuthEnabled: boolean;

  authReady: boolean;
  dataLoaded: boolean;
  booting: boolean;
  syncError: string | null;
  authError: string | null;
  usersLoaded: boolean;
}

interface AppActions {
  initializeApp: () => Promise<void>;
  hydrateData: () => Promise<void>;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setView: (view: string) => void;

  addIncidente: (incidente: Partial<Incidente>) => Promise<Incidente>;
  updateIncidente: (updated: Incidente) => Promise<void>;
  deleteIncidente: (id: string) => Promise<void>;

  addPersonaInteres: (persona: Partial<PersonaInteres>) => Promise<PersonaInteres>;
  updatePersonaInteres: (updated: PersonaInteres) => Promise<void>;
  deletePersonaInteres: (id: string) => Promise<void>;

  loadUsuarios: () => Promise<void>;
  createUsuario: (params: { email: string; password: string; role: Role }) => Promise<UserProfile>;
  updateUsuarioRole: (params: { id: string; role: Role }) => Promise<void>;

  abrirTurno: (params: { ubicacion: string }) => Promise<Turno>;
  cerrarTurno: (id: string) => Promise<void>;
  agregarNotaTurno: (turnoId: string, texto: string) => Promise<void>;

  updateConfig: (patch: Partial<AppConfig>) => Promise<void>;
}

export type AppStore = AppState & AppActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    view: 'dashboard',
    incidentes: [],
    personasInteres: [],
    usuarios: [],
    turnos: [],
    turnoActivo: null,
    config: { customLocations: [], customIncidentTypes: [], customPcpTerminos: [] },

    role: ROLES.OPERATOR,
    profile: null,
    session: null,
    cloudEnabled: isApiConfigured(),
    realAuthEnabled: true,

    authReady: false,
    dataLoaded: false,
    booting: false,
    syncError: null,
    authError: null,
    usersLoaded: false,

    initializeApp: async () => {
      if (get().booting || get().authReady) return;
      set({ booting: true, syncError: null, authError: null });

      try {
        const session = await getCurrentSession();
        if (!session) {
          setAuthToken(null);
          set({
            session: null,
            profile: null,
            role: ROLES.OPERATOR,
            cloudEnabled: isApiConfigured(),
            realAuthEnabled: true,
            view: getDefaultViewForRole(ROLES.OPERATOR),
            authReady: true,
            dataLoaded: true,
          });
          return;
        }

        setAuthToken(session.token);
        const profile = session.user;
        const role = profile.role;

        set({
          session,
          profile,
          role,
          cloudEnabled: true,
          realAuthEnabled: true,
          view: getDefaultViewForRole(role),
          authReady: true,
        });

        await get().hydrateData();
      } catch (error) {
        set({
          authError: (error as Error).message || 'Error al iniciar SGSV Monitor.',
          authReady: true,
          dataLoaded: true,
        });
      } finally {
        set({ booting: false });
      }
    },

    hydrateData: async () => {
      const { session } = get();
      set({ dataLoaded: false, syncError: null });

      try {
        if (!session) {
          set({ dataLoaded: true });
          return;
        }
        const { incidentes, pcp, turnos, config, usuarios } = await loadBootstrap();
        const turnoActivo = turnos.find((t) => !t.fin) ?? null;

        set({
          incidentes,
          personasInteres: pcp,
          turnos,
          turnoActivo,
          config,
          usuarios,
          usersLoaded: usuarios.length > 0,
          dataLoaded: true,
        });
      } catch (error) {
        set({
          syncError: (error as Error).message || 'Error al cargar datos.',
          dataLoaded: true,
        });
      }
    },

    signIn: async ({ email, password }) => {
      set({ authError: null, dataLoaded: false });
      try {
        const session = await signInWithEmail({ email, password });
        setAuthToken(session.token);
        const profile = session.user;
        const role = profile.role || ROLES.OPERATOR;

        set({ session, profile, role, view: getDefaultViewForRole(role), authReady: true });
        await get().hydrateData();
      } catch (error) {
        set({ authError: (error as Error).message || 'Credenciales invalidas.', dataLoaded: true });
        throw error;
      }
    },

    signOut: async () => {
      await authSignOut();
      setAuthToken(null);
      set({
        session: null,
        profile: null,
        role: ROLES.OPERATOR,
        view: 'nuevo',
        usersLoaded: false,
        dataLoaded: true,
      });
    },

    setView: (view) => {
      const { role } = get();
      set({ view: canAccessView(role, view) ? view : getDefaultViewForRole(role) });
    },

    // ─── Incidentes ───────────────────────────────────────────────────────────

    addIncidente: async (incidente) => {
      const { role, incidentes, turnoActivo, turnos } = get();
      assertPermission(role, PERMISSIONS.CREATE_INCIDENTS);
      assertCloudOnline();

      const normalized = normalizeIncident({ ...incidente, turnoId: turnoActivo?.id });
      const v = validateIncidente(normalized);
      if (!v.success) throw new Error(v.error.issues[0].message);
      const nextIncidentes = sortByTimestampDesc([normalized, ...incidentes]);
      set({ incidentes: nextIncidentes, syncError: null });

      let nextTurnos = turnos;
      let updatedTurno: Turno | null = null;
      if (turnoActivo) {
        updatedTurno = {
          ...turnoActivo,
          incidenteIds: [...turnoActivo.incidenteIds, normalized.id],
        };
        nextTurnos = turnos.map((t) => t.id === turnoActivo.id ? updatedTurno as Turno : t);
        set({ turnoActivo: updatedTurno, turnos: nextTurnos });
      }

      try {
        if (updatedTurno) {
          await upsertTurno(updatedTurno);
        }
        await insertIncidente(normalized);
      } catch (error) {
        set({ incidentes, turnos, turnoActivo, syncError: (error as Error).message || 'Error guardando incidente.' });
        throw error;
      }

      return normalized;
    },

    updateIncidente: async (updated) => {
      const { role, profile, incidentes } = get();
      assertPermission(role, PERMISSIONS.EDIT_INCIDENTS);
      assertCloudOnline();

      const prevIncidente = incidentes.find((inc) => inc.id === updated.id);
      if (prevIncidente) {
        const changes: string[] = [];
        if (prevIncidente.status !== updated.status)
          changes.push(`Estado: ${prevIncidente.status} → ${updated.status}`);
        if (prevIncidente.severidad !== updated.severidad)
          changes.push(`Severidad: ${prevIncidente.severidad} → ${updated.severidad}`);
        if (prevIncidente.responsable !== updated.responsable)
          changes.push(`Responsable: ${prevIncidente.responsable} → ${updated.responsable}`);

        if (changes.length > 0) {
          const auditNote = {
            id: createId(),
            texto: `[SISTEMA] ${changes.join(', ')}`,
            autor: profile?.email || 'Sistema',
            timestamp: Date.now(),
          };
          updated.notas = Array.isArray(updated.notas) ? [...updated.notas, auditNote] : [auditNote];
        }
      }

      const vu = validateIncidente(updated);
      if (!vu.success) throw new Error(vu.error.issues[0].message);

      const prevIncidentes = incidentes;
      set({
        incidentes: incidentes.map((inc) => inc.id === updated.id ? { ...inc, ...updated } : inc),
        syncError: null,
      });

      try {
        await upsertIncidente(updated);
      } catch (error) {
        set({ incidentes: prevIncidentes, syncError: (error as Error).message || 'Error actualizando.' });
        throw error;
      }
    },

    deleteIncidente: async (id) => {
      const { role, incidentes } = get();
      assertPermission(role, PERMISSIONS.DELETE_INCIDENTS);
      assertCloudOnline();

      set({ incidentes: incidentes.filter((inc) => inc.id !== id), syncError: null });

      try {
        await deleteIncidenteById(id);
      } catch (error) {
        set({ incidentes, syncError: (error as Error).message || 'Error eliminando.' });
        throw error;
      }
    },

    // ─── PCP ─────────────────────────────────────────────────────────────────

    addPersonaInteres: async (persona) => {
      const { role, personasInteres } = get();
      assertPermission(role, PERMISSIONS.MANAGE_PCP);
      assertCloudOnline();

      const normalized = normalizePersona(persona);
      const vp = validatePersonaInteres(normalized);
      if (!vp.success) throw new Error(vp.error.issues[0].message);
      set({ personasInteres: [normalized, ...personasInteres], syncError: null });

      try {
        await upsertPersonaInteres(normalized);
      } catch (error) {
        set({ personasInteres, syncError: (error as Error).message || 'Error guardando PCP.' });
        throw error;
      }

      return normalized;
    },

    updatePersonaInteres: async (updated) => {
      const { role, personasInteres } = get();
      assertPermission(role, PERMISSIONS.MANAGE_PCP);
      assertCloudOnline();

      const vpu = validatePersonaInteres(updated);
      if (!vpu.success) throw new Error(vpu.error.issues[0].message);

      const prev = personasInteres;
      set({ personasInteres: personasInteres.map((p) => p.id === updated.id ? { ...p, ...updated } : p) });

      try {
        await upsertPersonaInteres(updated);
      } catch (error) {
        set({ personasInteres: prev, syncError: (error as Error).message || 'Error actualizando PCP.' });
        throw error;
      }
    },

    deletePersonaInteres: async (id) => {
      const { role, personasInteres } = get();
      assertPermission(role, PERMISSIONS.MANAGE_PCP);
      assertCloudOnline();

      set({ personasInteres: personasInteres.filter((p) => p.id !== id) });

      try {
        await deletePersonaInteresById(id);
      } catch (error) {
        set({ personasInteres, syncError: (error as Error).message || 'Error eliminando PCP.' });
        throw error;
      }
    },

    // ─── Usuarios ─────────────────────────────────────────────────────────────

    loadUsuarios: async () => {
      const { role, cloudEnabled } = get();
      assertPermission(role, PERMISSIONS.MANAGE_USERS);

      if (!cloudEnabled) {
        set({ usuarios: [], usersLoaded: true });
        return;
      }

      const usuarios = await fetchProfiles();
      set({ usuarios, usersLoaded: true });
    },

    createUsuario: async ({ email, password, role }) => {
      const currentRole = get().role;
      assertPermission(currentRole, PERMISSIONS.MANAGE_USERS);
      assertCloudOnline();

      const created = await createProfile({ email, password, role });
      set({ usuarios: [...get().usuarios, created].sort((a, b) => a.email.localeCompare(b.email)) });
      return created;
    },

    updateUsuarioRole: async ({ id, role }) => {
      const currentRole = get().role;
      assertPermission(currentRole, PERMISSIONS.MANAGE_USERS);
      assertCloudOnline();

      const updated = await updateProfileRole({ id, role });
      set({ usuarios: get().usuarios.map((u) => u.id === id ? updated : u) });
    },

    // ─── Turnos ───────────────────────────────────────────────────────────────

    abrirTurno: async ({ ubicacion }) => {
      const { profile, turnoActivo, turnos } = get();
      assertCloudOnline();
      if (turnoActivo) throw new Error('Ya hay un turno activo. Ciérralo primero.');

      const nuevoTurno: Turno = {
        id: createId(),
        inicio: Date.now(),
        fin: null,
        operador: profile?.email || 'Operador',
        ubicacion,
        notas: [],
        incidenteIds: [],
      };

      const nextTurnos = [nuevoTurno, ...turnos];
      set({ turnos: nextTurnos, turnoActivo: nuevoTurno });

      try {
        await upsertTurno(nuevoTurno);
      } catch (error) {
        set({ turnos, turnoActivo, syncError: (error as Error).message || 'Error guardando turno.' });
        throw error;
      }

      return nuevoTurno;
    },

    cerrarTurno: async (id) => {
      const { turnos, turnoActivo } = get();
      assertCloudOnline();
      const turno = turnos.find((t) => t.id === id);
      if (!turno) return;

      const cerrado: Turno = { ...turno, fin: Date.now() };
      const nextTurnos = turnos.map((t) => t.id === id ? cerrado : t);

      set({ turnos: nextTurnos, turnoActivo: null });

      try {
        await upsertTurno(cerrado);
      } catch (error) {
        set({ turnos, turnoActivo, syncError: (error as Error).message || 'Error cerrando turno.' });
        throw error;
      }
    },

    agregarNotaTurno: async (turnoId, texto) => {
      const { turnos, profile, turnoActivo } = get();
      assertCloudOnline();
      const nota: NotaTurno = {
        id: createId(),
        texto,
        autor: profile?.email || 'Operador',
        timestamp: Date.now(),
      };

      const nextTurnos = turnos.map((t) =>
        t.id === turnoId ? { ...t, notas: [...t.notas, nota] } : t,
      );
      const nextActivo =
        turnoActivo?.id === turnoId
          ? { ...turnoActivo, notas: [...turnoActivo.notas, nota] }
          : turnoActivo;

      set({ turnos: nextTurnos, turnoActivo: nextActivo });
      const turnoActualizado = nextTurnos.find((t) => t.id === turnoId);

      try {
        if (turnoActualizado) await upsertTurno(turnoActualizado);
      } catch (error) {
        set({ turnos, turnoActivo, syncError: (error as Error).message || 'Error guardando nota de turno.' });
        throw error;
      }
    },

    // ─── Config ───────────────────────────────────────────────────────────────

    updateConfig: async (patch) => {
      assertCloudOnline();
      const prevConfig = get().config;
      const nextConfig: AppConfig = { ...get().config, ...patch };
      set({ config: nextConfig });
      try {
        await saveConfig(nextConfig);
      } catch (error) {
        set({
          config: prevConfig,
          syncError: (error as Error).message || 'Error guardando configuracion.',
        });
        await saveConfig(prevConfig);
        throw error;
      }
    },
  })),
);

// SGSV Cloud: la API es la fuente de verdad. No hay persistencia local operativa.
