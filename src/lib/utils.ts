import type {
  Incidente,
  PersonaInteres,
  SeverityLevel,
  StatusOption,
  IncidentType,
} from '../types';

export const BLACKLIST_TERMS: string[] = [];

export const STORAGE_KEYS = Object.freeze({
  incidentes: 'sgsv_incidentes',
  pcp: 'sgsv_pcp',
  turnos: 'sgsv_turnos',
  config: 'sgsv_config',
} as const);

export const INCIDENT_TYPES: string[] = Object.freeze([
  'Intrusion', 'Incendio', 'Robo', 'Accidente Medico', 'Falla Tecnica', 'Otro',
]) as unknown as string[];

export const SEVERITY_OPTIONS: SeverityLevel[] = Object.freeze([
  'Baja', 'Media', 'Alta', 'Critica',
]) as unknown as SeverityLevel[];

export const STATUS_OPTIONS: StatusOption[] = Object.freeze([
  'Abierto', 'En seguimiento', 'Cerrado',
]) as unknown as StatusOption[];

export const LOCATION_OPTIONS: string[] = Object.freeze([
  'TJ01', 'TJ02', 'TJ03', 'TC01', 'CeDis',
]) as unknown as string[];

export const PCP_TERMINO_OPTIONS: string[] = Object.freeze([
  'Intento de sustraccion de mercancia',
  'Conducta agresiva o amenazas',
  'Alteracion del orden publico',
  'Dano a propiedad privada',
  'Consumo de producto no pagado',
  'Merodeo sospechoso reiterado',
]) as unknown as string[];

export const MAX_PCP_IMAGES = 12;
export const DEFAULT_INCIDENT_TYPE: string = INCIDENT_TYPES[0];
export const DEFAULT_PCP_TERMINO: string = PCP_TERMINO_OPTIONS[0];

export const severityRank: Record<string, number> = Object.freeze({
  Critica: 4, Crítica: 4, Alta: 3, Media: 2, Baja: 1,
});

export const CHART_COLORS: Record<string, string> = {
  Intrusion: '#ef4444',
  Incendio: '#f97316',
  Robo: '#eab308',
  'Accidente Medico': '#3b82f6',
  'Falla Tecnica': '#8b5cf6',
  Otro: '#6b7280',
};

// ─── IDs ──────────────────────────────────────────────────────────────────────

export const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// ─── Texto seguro ─────────────────────────────────────────────────────────────

export const safeText = (value: unknown): string =>
  value == null ? '' : String(value);

export const repairLegacyText = (value: unknown): string =>
  safeText(value)
    .replace(/Ã¡/g, 'a').replace(/Ã©/g, 'e').replace(/Ã­/g, 'i')
    .replace(/Ã³/g, 'o').replace(/Ãº/g, 'u').replace(/Ã±/g, 'n')
    .replace(/Â/g, '');

export const normalizeSearchText = (value: unknown): string =>
  repairLegacyText(value).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').trim();

export const normalizeByOptions = (
  value: unknown,
  options: readonly string[],
  fallback: string,
): string => {
  const candidate = repairLegacyText(value).trim();
  if (!candidate) return fallback;
  const nc = normalizeSearchText(candidate);
  return options.find((o) => normalizeSearchText(o) === nc) ?? candidate;
};

// ─── Timestamps ───────────────────────────────────────────────────────────────

export const normalizeTimestamp = (value: unknown): number => {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  const parsed = Date.parse(value as string);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortByTimestampDesc = <T extends { timestamp: unknown }>(items: T[]): T[] =>
  [...items].sort(
    (a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp),
  );


export const safeImage = (value: unknown): string | null =>
  typeof value === 'string' &&
  (value.startsWith('data:image/') || value.startsWith('https://'))
    ? value
    : null;

export const safeVideoUrl = (value: unknown): string | null =>
  typeof value === 'string' &&
  (value.startsWith('data:video/') || value.startsWith('http'))
    ? value
    : null;

// ─── Normalizadores de modelos ────────────────────────────────────────────────

export const normalizeIncident = (incidente: unknown): Incidente => {
  const n = (
    incidente && typeof incidente === 'object' ? incidente : {}
  ) as Record<string, unknown>;
  return {
    id: safeText(n.id) || createId(),
    fecha: safeText(n.fecha) || new Date().toLocaleString(),
    timestamp: normalizeTimestamp(n.timestamp ?? n.fecha),
    titulo: safeText(n.titulo),
    tipo: normalizeByOptions(n.tipo, INCIDENT_TYPES, DEFAULT_INCIDENT_TYPE),
    severidad: normalizeByOptions(n.severidad, SEVERITY_OPTIONS, 'Alta') as SeverityLevel,
    descripcion: safeText(n.descripcion),
    ubicacion: normalizeByOptions(n.ubicacion, LOCATION_OPTIONS, 'TJ01'),
    status: normalizeByOptions(n.status, STATUS_OPTIONS, 'Abierto') as StatusOption,
    responsable: safeText(n.responsable) || 'Operador Turno',
    imagenEvidencia: safeImage(n.imagenEvidencia),
    imagenPersona: safeImage(n.imagenPersona),
    videoEvidencia: safeVideoUrl(n.videoEvidencia),
    closedAt: n.closedAt ? normalizeTimestamp(n.closedAt) : null,
    notas: Array.isArray(n.notas) ? (n.notas as Incidente['notas']) : [],
    turnoId: n.turnoId ? safeText(n.turnoId) : undefined,
  };
};

export const normalizePersona = (persona: unknown): PersonaInteres => {
  const n = (
    persona && typeof persona === 'object' ? persona : {}
  ) as Record<string, unknown>;
  const imagenes = Array.isArray(n.imagenes)
    ? (n.imagenes as unknown[])
        .filter(
          (img): img is string =>
            typeof img === 'string' &&
            (img.startsWith('data:image/') || img.startsWith('https://')),
        )
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

export const stripPreviewForStorage = (incidente: unknown): Incidente => {
  const normalized = normalizeIncident(incidente);
  const onlyUrl = (v: string | null): string | null =>
    typeof v === 'string' && v.startsWith('https://') ? v : null;
  return {
    ...normalized,
    imagenEvidencia: onlyUrl(normalized.imagenEvidencia),
    imagenPersona: onlyUrl(normalized.imagenPersona),
    videoEvidencia: onlyUrl(normalized.videoEvidencia),
  };
};

// ─── Compresion de imagen ─────────────────────────────────────────────────────

export const compressImage = (
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.7,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = (event.target as FileReader).result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('No se pudo comprimir la imagen'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });

// ─── CSV ──────────────────────────────────────────────────────────────────────

export const toCsvCell = (value: unknown): string => {
  const raw = safeText(value);
  const fs = /^[\s\t]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${fs.replace(/"/g, '""')}"`;
};
