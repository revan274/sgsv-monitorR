import { get, set } from 'idb-keyval';
import { api, isApiConfigured, getToken } from './apiClient';
import {
  STORAGE_KEYS,
  normalizeIncident,
  normalizePersona,
  stripPreviewForStorage,
  parseStoredArray,
  sortByTimestampDesc,
} from './utils';
import type { Incidente, PersonaInteres, Turno, AppConfig } from '../types';

const canUseCloud = (): boolean => isApiConfigured() && Boolean(getToken());

// ─── IDB ─────────────────────────────────────────────────────────────────────

export const loadDataFromIDB = async (): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  try {
    let savedIncidentes = await get<Incidente[]>(STORAGE_KEYS.incidentes);
    let savedPCP = await get<PersonaInteres[]>(STORAGE_KEYS.pcp);

    if (!savedIncidentes) {
      const localInc = parseStoredArray(localStorage.getItem(STORAGE_KEYS.incidentes)).map(normalizeIncident);
      if (localInc.length > 0) {
        await set(STORAGE_KEYS.incidentes, localInc);
        savedIncidentes = localInc;
      }
    }

    if (!savedPCP) {
      const localPcp = parseStoredArray(localStorage.getItem(STORAGE_KEYS.pcp)).map(normalizePersona);
      if (localPcp.length > 0) {
        await set(STORAGE_KEYS.pcp, localPcp);
        savedPCP = localPcp;
      }
    }

    return {
      incidentes: sortByTimestampDesc(savedIncidentes || []),
      pcp: savedPCP || [],
    };
  } catch (error) {
    console.error('Error al cargar datos desde IndexedDB:', error);
    throw error;
  }
};

export const saveIncidentesToIDB = async (incidentes: Incidente[]): Promise<void> => {
  try { await set(STORAGE_KEYS.incidentes, incidentes.map(stripPreviewForStorage)); } catch { /* ignore */ }
};

export const savePcpToIDB = async (pcp: PersonaInteres[]): Promise<void> => {
  try { await set(STORAGE_KEYS.pcp, pcp.map(normalizePersona)); } catch { /* ignore */ }
};

export const saveTurnosToIDB = async (turnos: Turno[]): Promise<void> => {
  try { await set(STORAGE_KEYS.turnos, turnos); } catch { /* ignore */ }
};

export const loadTurnosFromIDB = async (): Promise<Turno[]> => {
  try { return (await get<Turno[]>(STORAGE_KEYS.turnos)) || []; } catch { return []; }
};

export const saveConfigToIDB = async (config: AppConfig): Promise<void> => {
  try { await set(STORAGE_KEYS.config, config); } catch { /* ignore */ }
};

export const loadConfigFromIDB = async (): Promise<AppConfig> => {
  try {
    return (await get<AppConfig>(STORAGE_KEYS.config)) || {
      customLocations: [], customIncidentTypes: [], customPcpTerminos: [],
    };
  } catch {
    return { customLocations: [], customIncidentTypes: [], customPcpTerminos: [] };
  }
};

// ─── Carga desde API ──────────────────────────────────────────────────────────

export const loadDataFromCloud = async (): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  const [incRes, pcpRes] = await Promise.all([
    api.get('/incidentes?limit=500') as Promise<{ incidentes: unknown[] }>,
    api.get('/personas') as Promise<unknown[]>,
  ]);

  const incidentes = sortByTimestampDesc(
    (incRes.incidentes || []).map(normalizeIncident),
  );
  const pcp = (Array.isArray(pcpRes) ? pcpRes : []).map(normalizePersona);

  await Promise.all([saveIncidentesToIDB(incidentes), savePcpToIDB(pcp)]);
  return { incidentes, pcp };
};

export const loadData = async ({
  preferCloud = true,
}: { preferCloud?: boolean } = {}): Promise<{ incidentes: Incidente[]; pcp: PersonaInteres[] }> => {
  if (preferCloud && canUseCloud()) return loadDataFromCloud();
  return loadDataFromIDB();
};

// ─── Paginacion server-side ───────────────────────────────────────────────────

export interface IncidentPage {
  incidentes: Incidente[];
  total: number;
  page: number;
  pageSize: number;
}

export const loadIncidentesPage = async (
  page = 1,
  pageSize = 20,
): Promise<IncidentPage> => {
  if (!canUseCloud()) {
    const { incidentes } = await loadDataFromIDB();
    const start = (page - 1) * pageSize;
    return { incidentes: incidentes.slice(start, start + pageSize), total: incidentes.length, page, pageSize };
  }

  const res = await api.get(`/incidentes?page=${page}&limit=${pageSize}`) as {
    incidentes: unknown[];
    total: number;
  };

  return {
    incidentes: (res.incidentes || []).map(normalizeIncident),
    total: res.total ?? 0,
    page,
    pageSize,
  };
};

// ─── CRUD Cloud ───────────────────────────────────────────────────────────────

export const upsertIncidente = async (incidente: Incidente): Promise<Incidente> => {
  const normalized = stripPreviewForStorage(incidente);
  if (canUseCloud()) {
    await api.post('/incidentes', normalized);
  }
  return normalized;
};

export const deleteIncidenteById = async (id: string): Promise<void> => {
  if (canUseCloud()) await api.delete(`/incidentes/${id}`);
};

export const upsertPersonaInteres = async (persona: PersonaInteres): Promise<PersonaInteres> => {
  const normalized = normalizePersona(persona);
  if (canUseCloud()) {
    await api.post('/personas', normalized);
  }
  return normalized;
};

export const deletePersonaInteresById = async (id: string): Promise<void> => {
  if (canUseCloud()) await api.delete(`/personas/${id}`);
};

export const upsertTurno = async (turno: Turno): Promise<void> => {
  if (canUseCloud()) await api.post('/turnos', turno);
};
