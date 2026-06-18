// Catálogos y constantes del dominio SGSV.
// Congelados para evitar mutaciones accidentales.

export const STORAGE_KEYS = Object.freeze({
  incidentes: 'sgsv_incidentes',
  pcp: 'sgsv_pcp',
});

export const INCIDENT_TYPES = Object.freeze([
  'Intrusion',
  'Incendio',
  'Robo',
  'Accidente Medico',
  'Falla Tecnica',
  'Otro',
]);

export const SEVERITY_OPTIONS = Object.freeze(['Baja', 'Media', 'Alta', 'Critica']);

export const STATUS_OPTIONS = Object.freeze(['Abierto', 'En seguimiento', 'Cerrado']);

export const LOCATION_OPTIONS = Object.freeze(['TJ01', 'TJ02', 'TJ03', 'TC01', 'CeDis']);

export const PCP_TERMINO_OPTIONS = Object.freeze([
  'Intento de sustraccion de mercancia',
  'Conducta agresiva o amenazas',
  'Alteracion del orden publico',
  'Dano a propiedad privada',
  'Consumo de producto no pagado',
  'Merodeo sospechoso reiterado',
]);

// Términos estáticos que marcan un incidente como coincidencia de lista negra.
export const BLACKLIST_TERMS = Object.freeze([]);

export const MAX_PCP_IMAGES = 12;

export const DEFAULT_INCIDENT_TYPE = INCIDENT_TYPES[0];
export const DEFAULT_SEVERITY = 'Alta';
export const DEFAULT_STATUS = 'Abierto';
export const DEFAULT_LOCATION = 'TJ01';
export const DEFAULT_RESPONSABLE = 'Operador Turno';
export const DEFAULT_PCP_TERMINO = PCP_TERMINO_OPTIONS[0];

export const SEVERITY_RANK = Object.freeze({ Critica: 4, Alta: 3, Media: 2, Baja: 1 });

export const CHART_COLORS = Object.freeze({
  Intrusion: '#ef4444',
  Incendio: '#f97316',
  Robo: '#eab308',
  'Accidente Medico': '#3b82f6',
  'Falla Tecnica': '#8b5cf6',
  Otro: '#6b7280',
});
