// Punto único de acceso a datos. La app NUNCA importa una implementación
// concreta: siempre usa `repository`. Para migrar a un backend, basta crear
// `apiRepository.js` con la misma interfaz y cambiar la línea de abajo.
//
// Interfaz (todas async):
//   loadIncidents()        -> Incident[]
//   saveIncidents(items)   -> void
//   loadPersonas()         -> Persona[]
//   savePersonas(items)    -> void

import { createIndexedDbRepository } from './indexedDbRepository.js';

// Backend de almacenamiento activo. Cambiar aquí cuando exista un servidor.
const BACKEND = import.meta.env.VITE_STORAGE_BACKEND || 'indexeddb';

const factories = {
  indexeddb: createIndexedDbRepository,
  // api: createApiRepository,  // <- futuro
};

const factory = factories[BACKEND] || createIndexedDbRepository;

export const repository = factory();
