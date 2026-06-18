// Implementación del repositorio sobre IndexedDB (idb-keyval).
// Incluye migración automática y única desde localStorage (formato legado).

import { get, set } from 'idb-keyval';
import { STORAGE_KEYS } from '../domain/constants.js';
import { normalizeIncident, normalizePersona } from '../domain/normalize.js';
import { parseStoredArray, sortByTimestampDesc } from '../domain/utils.js';

const migrateFromLocalStorage = async (key, normalizer) => {
  const legacy = parseStoredArray(localStorage.getItem(key)).map(normalizer);
  if (legacy.length > 0) await set(key, legacy);
  return legacy;
};

export const createIndexedDbRepository = () => ({
  async loadIncidents() {
    let saved = await get(STORAGE_KEYS.incidentes);
    if (!saved) saved = await migrateFromLocalStorage(STORAGE_KEYS.incidentes, normalizeIncident);
    return sortByTimestampDesc((saved || []).map(normalizeIncident));
  },

  async saveIncidents(incidents) {
    await set(STORAGE_KEYS.incidentes, incidents.map(normalizeIncident));
  },

  async loadPersonas() {
    let saved = await get(STORAGE_KEYS.pcp);
    if (!saved) saved = await migrateFromLocalStorage(STORAGE_KEYS.pcp, normalizePersona);
    return (saved || []).map(normalizePersona);
  },

  async savePersonas(personas) {
    await set(STORAGE_KEYS.pcp, personas.map(normalizePersona));
  },
});
