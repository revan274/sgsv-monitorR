import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  loadData,
  loadDataFromIDB,
  saveIncidentesToIDB,
  savePcpToIDB,
  saveTurnosToIDB,
  loadTurnosFromIDB,
  saveConfigToIDB,
  loadConfigFromIDB,
  upsertIncidente,
  deleteIncidenteById,
  upsertPersonaInteres,
  deletePersonaInteresById,
  upsertTurno,
} from '../lib/storage';
import { getSupabaseConfigError, hasSupabaseEnv, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  LOCAL_ADMIN_PROFILE,
  PERMISSIONS,
  ROLES,
  can,
  canAccessView,
  fetchProfiles,
  getCurrentSession,
  getDefaultViewForRole,
  signOut as authSignOut,
  signInWithEmail,
  updateProfileRole,
} from '../lib/auth';
import {
  parseStoredArray,
  normalizeIncident,
  normalizePersona,
  sortByTimestampDesc,
  createId,
} from '../lib/utils';
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

let localPersistenceBound = false;

const assertPermission = (role: Role, permission: string): void => {
  if (!can(role, permission as Parameters<typeof can>[1])) {
    throw new Error('Permiso insuficiente para ejecutar esta operacion.');
  }
};

// ─── Tipos del Store ──────────────────────────────────────────────────────────

export interface AppState {
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

  authReady: boolean;
  dataLoaded: boolean;
  booting: boolean;
  syncError: string | null;
  authError: string | null;
  usersLoaded: boolean;
}

export interface AppActions {
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

    role: ROLES.ADMIN,
    profile: LOCAL_ADMIN_PROFILE,
    session: null,
    cloudEnabled: isSupabaseConfigured() || hasSupabaseEnv(),

    authReady: false,
    dataLoaded: false,
    booting: false,
    syncError: null,
    authError: null,
    usersLoaded: false,

    initializeApp: async () => {
      if (get().booting || get().authReady) return;

      const supabaseConfigError = getSupabaseConfigError();
      const cloudEnabled = isSupabaseConfigured();
      const shouldUseCloudAuth = cloudEnabled || Boolean(supabaseConfigError);
      set({ booting: true, cloudEnabled: shouldUseCloudAuth, syncError: null, authError: null });

      try {
        if (supabaseConfigError) {
          set({
            session: null,
            profile: null,
            role: ROLES.OPERATOR,
            view: getDefaultViewForRole(ROLES.OPERATOR),
            authError: supabaseConfigError,
            authReady: true,
            dataLoaded: true,
          });
          return;
        }

        if (!cloudEnabled) {
          set({
            session: null,
            profile: LOCAL_ADMIN_PROFILE,
            role: ROLES.ADMIN,
            view: getDefaultViewForRole(ROLES.ADMIN),
            authReady: true,
          });
          await get().hydrateData();
          return;
        }

        const session = await getCurrentSession();
        const profile = session?.user ?? null;
        const role = profile?.role || ROLES.OPERATOR;

        set({ session, profile, role, view: getDefaultViewForRole(role), authReady: true });

        if (session) {
          await get().hydrateData();
        } else {
          set({ dataLoaded: true, incidentes: [], personasInteres: [] });
        }
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
      const { cloudEnabled, role, session } = get();
      set({ dataLoaded: false, syncError: null });

      if (cloudEnabled && !session) {
        set({ incidentes: [], personasInteres: [], dataLoaded: true });
        return;
      }

      if (cloudEnabled && role === ROLES.OPERATOR) {
        const { incidentes } = await loadDataFromIDB();
        set({ incidentes, personasInteres: [], dataLoaded: true });
        return;
      }

      try {
        const { incidentes, pcp } = await loadData({ preferCloud: Boolean(cloudEnabled && session) });
        const turnos = await loadTurnosFromIDB();
        const config = await loadConfigFromIDB();
        const turnoActivo = turnos.find((t) => !t.fin) ?? null;

        set({ incidentes, personasInteres: pcp, turnos, turnoActivo, config, dataLoaded: true });
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
      authSignOut();
      set({
        session: null,
        profile: null,
        role: ROLES.OPERATOR,
        view: 'nuevo',
        incidentes: [],
        personasInteres: [],
        usuarios: [],
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
      const { role, incidentes, turnoActivo, profile } = get();
      assertPermission(role, PERMISSIONS.CREATE_INCIDENTS);

      const normalized = normalizeIncident({ ...incidente, turnoId: turnoActivo?.id });
      const nextIncidentes = sortByTimestampDesc([normalized, ...incidentes]);
      set({ incidentes: nextIncidentes, syncError: null });

      if (turnoActivo) {
        const updatedTurno: Turno = {
          ...turnoActivo,
          incidenteIds: [...turnoActivo.incidenteIds, normalized.id],
        };
        const nextTurnos = get().turnos.map((t) => t.id === turnoActivo.id ? updatedTurno : t);
        set({ turnoActivo: updatedTurno, turnos: nextTurnos });
        await saveTurnosToIDB(nextTurnos);
        await upsertTurno(updatedTurno);
      }

      try {
        await upsertIncidente(normalized);
      } catch (error) {
        set({ incidentes, syncError: (error as Error).message || 'Error guardando incidente.' });
        throw error;
      }

      return normalized;
    },

    updateIncidente: async (updated) => {
      const { role, profile, incidentes } = get();
      assertPermission(role, PERMISSIONS.EDIT_INCIDENTS);

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

      const normalized = normalizePersona(persona);
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
        set({ usuarios: [LOCAL_ADMIN_PROFILE], usersLoaded: true });
        return;
      }

      const usuarios = await fetchProfiles();
      set({ usuarios, usersLoaded: true });
    },

    updateUsuarioRole: async ({ id, role }) => {
      const currentRole = get().role;
      assertPermission(currentRole, PERMISSIONS.MANAGE_USERS);

      const updated = await updateProfileRole({ id, role });
      set({ usuarios: get().usuarios.map((u) => u.id === id ? updated : u) });
    },

    // ─── Turnos ───────────────────────────────────────────────────────────────

    abrirTurno: async ({ ubicacion }) => {
      const { profile, turnoActivo, turnos } = get();
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
      await saveTurnosToIDB(nextTurnos);
      await upsertTurno(nuevoTurno);

      return nuevoTurno;
    },

    cerrarTurno: async (id) => {
      const { turnos } = get();
      const turno = turnos.find((t) => t.id === id);
      if (!turno) return;

      const cerrado: Turno = { ...turno, fin: Date.now() };
      const nextTurnos = turnos.map((t) => t.id === id ? cerrado : t);

      set({ turnos: nextTurnos, turnoActivo: null });
      await saveTurnosToIDB(nextTurnos);
      await upsertTurno(cerrado);
    },

    agregarNotaTurno: async (turnoId, texto) => {
      const { turnos, profile, turnoActivo } = get();
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
      await saveTurnosToIDB(nextTurnos);
      const turnoActualizado = nextTurnos.find((t) => t.id === turnoId);
      if (turnoActualizado) await upsertTurno(turnoActualizado);
    },

    // ─── Config ───────────────────────────────────────────────────────────────

    updateConfig: async (patch) => {
      const nextConfig: AppConfig = { ...get().config, ...patch };
      set({ config: nextConfig });
      await saveConfigToIDB(nextConfig);
    },
  })),
);

// ─── Persistencia local reactiva ──────────────────────────────────────────────

const bindLocalPersistence = () => {
  if (localPersistenceBound) return;
  localPersistenceBound = true;

  useAppStore.subscribe(
    (state) => state.incidentes,
    (incidentes) => {
      if (useAppStore.getState().dataLoaded) saveIncidentesToIDB(incidentes);
    },
  );

  useAppStore.subscribe(
    (state) => state.personasInteres,
    (personasInteres) => {
      if (useAppStore.getState().dataLoaded) savePcpToIDB(personasInteres);
    },
  );
};

bindLocalPersistence();
