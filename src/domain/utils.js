// Utilidades puras: texto, búsqueda, fechas, IDs y CSV.

// Marcas diacríticas combinantes (U+0300–U+036F) para eliminar acentos tras NFD.
const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g');

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const safeText = (value) => (value == null ? '' : String(value));

// Repara "mojibake" típico de UTF-8 mal decodificado (Ã¡ -> a, etc.).
export const repairLegacyText = (value) =>
  safeText(value)
    .replace(/Ã¡/g, 'a')
    .replace(/Ã©/g, 'e')
    .replace(/Ã­/g, 'i')
    .replace(/Ã³/g, 'o')
    .replace(/Ãº/g, 'u')
    .replace(/Ã±/g, 'n')
    .replace(/Â/g, '');

// Normaliza texto para búsqueda: sin acentos, minúsculas, sin espacios extra.
export const normalizeSearchText = (value) =>
  repairLegacyText(value).toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '').trim();

// Devuelve la opción canónica del catálogo o el valor saneado / fallback.
export const normalizeByOptions = (value, options, fallback) => {
  const candidate = repairLegacyText(value).trim();
  if (!candidate) return fallback;
  const nc = normalizeSearchText(candidate);
  return options.find((o) => normalizeSearchText(o) === nc) || candidate;
};

export const normalizeTimestamp = (value) => {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortByTimestampDesc = (items) =>
  [...items].sort((a, b) => normalizeTimestamp(b.timestamp) - normalizeTimestamp(a.timestamp));

export const parseStoredArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const safeImage = (value) =>
  typeof value === 'string' && value.startsWith('data:image/') ? value : null;

// Escapa una celda CSV y neutraliza fórmulas (prevención de CSV injection).
export const toCsvCell = (value) => {
  const raw = safeText(value);
  const guarded = /^[\s\t]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
};
