// Saneado defensivo de entidades: garantiza forma consistente aunque
// los datos vengan corruptos, incompletos o de una versión anterior.

import {
  INCIDENT_TYPES,
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  LOCATION_OPTIONS,
  PCP_TERMINO_OPTIONS,
  MAX_PCP_IMAGES,
  DEFAULT_INCIDENT_TYPE,
  DEFAULT_SEVERITY,
  DEFAULT_STATUS,
  DEFAULT_LOCATION,
  DEFAULT_RESPONSABLE,
  DEFAULT_PCP_TERMINO,
} from './constants.js';
import {
  createId,
  safeText,
  safeImage,
  normalizeByOptions,
  normalizeTimestamp,
} from './utils.js';

export const normalizeIncident = (incidente) => {
  const n = incidente && typeof incidente === 'object' ? incidente : {};
  return {
    id: safeText(n.id) || createId(),
    fecha: safeText(n.fecha) || new Date().toLocaleString(),
    timestamp: normalizeTimestamp(n.timestamp || n.fecha),
    titulo: safeText(n.titulo),
    tipo: normalizeByOptions(n.tipo, INCIDENT_TYPES, DEFAULT_INCIDENT_TYPE),
    severidad: normalizeByOptions(n.severidad, SEVERITY_OPTIONS, DEFAULT_SEVERITY),
    descripcion: safeText(n.descripcion),
    ubicacion: normalizeByOptions(n.ubicacion, LOCATION_OPTIONS, DEFAULT_LOCATION),
    videoFile: safeText(n.videoFile) || null,
    status: normalizeByOptions(n.status, STATUS_OPTIONS, DEFAULT_STATUS),
    responsable: safeText(n.responsable) || DEFAULT_RESPONSABLE,
    imagenEvidencia: safeImage(n.imagenEvidencia),
    imagenPersona: safeImage(n.imagenPersona),
  };
};

export const normalizePersona = (persona) => {
  const n = persona && typeof persona === 'object' ? persona : {};
  const imagenes = Array.isArray(n.imagenes)
    ? n.imagenes
        .filter((img) => typeof img === 'string' && img.startsWith('data:image/'))
        .slice(0, MAX_PCP_IMAGES)
    : [];
  return {
    id: safeText(n.id) || createId(),
    fechaRegistro: safeText(n.fechaRegistro) || new Date().toLocaleDateString(),
    nombre: safeText(n.nombre),
    terminos: normalizeByOptions(n.terminos, PCP_TERMINO_OPTIONS, DEFAULT_PCP_TERMINO),
    descripcion: safeText(n.descripcion),
    imagenes,
  };
};
