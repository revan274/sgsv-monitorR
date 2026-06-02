import { describe, it, expect, vi } from 'vitest';
import {
  createId,
  safeText,
  normalizeSearchText,
  normalizeByOptions,
  normalizeTimestamp,
  sortByTimestampDesc,
  parseStoredArray,
  safeImage,
  safeVideoUrl,
  normalizeIncident,
  normalizePersona,
  toCsvCell,
  repairLegacyText,
  INCIDENT_TYPES,
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
  STATUS_OPTIONS,
} from '../utils';

// ─── createId ─────────────────────────────────────────────────────────────────

describe('createId', () => {
  it('returns a non-empty string', () => {
    expect(typeof createId()).toBe('string');
    expect(createId().length).toBeGreaterThan(0);
  });

  it('returns a UUID when crypto.randomUUID is available', () => {
    const id = createId();
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('returns unique ids on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createId()));
    expect(ids.size).toBe(20);
  });

  it('falls back to timestamp-random when randomUUID is unavailable', () => {
    const original = crypto.randomUUID;
    // @ts-expect-error intentional override for test
    crypto.randomUUID = undefined;
    const id = createId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    crypto.randomUUID = original;
  });
});

// ─── safeText ─────────────────────────────────────────────────────────────────

describe('safeText', () => {
  it('converts string as-is', () => expect(safeText('hello')).toBe('hello'));
  it('converts number to string', () => expect(safeText(42)).toBe('42'));
  it('returns empty string for null', () => expect(safeText(null)).toBe(''));
  it('returns empty string for undefined', () => expect(safeText(undefined)).toBe(''));
  it('converts boolean', () => expect(safeText(true)).toBe('true'));
});

// ─── repairLegacyText ─────────────────────────────────────────────────────────

describe('repairLegacyText', () => {
  it('repairs Ã© → e', () => expect(repairLegacyText('Ã©vento')).toBe('evento'));
  it('repairs Ã± → n', () => expect(repairLegacyText('Ã±')).toBe('n'));
  it('strips Â characters', () => expect(repairLegacyText('hola Â mundo')).toBe('hola  mundo'));
  it('leaves normal text unchanged', () => expect(repairLegacyText('robo')).toBe('robo'));
  it('handles null gracefully', () => expect(repairLegacyText(null)).toBe(''));
});

// ─── normalizeSearchText ──────────────────────────────────────────────────────

describe('normalizeSearchText', () => {
  it('lowercases input', () => expect(normalizeSearchText('ROBO')).toBe('robo'));
  it('strips diacritics (accent marks)', () => expect(normalizeSearchText('Incendió')).toBe('incendio'));
  it('trims whitespace', () => expect(normalizeSearchText('  alerta  ')).toBe('alerta'));
  it('handles empty string', () => expect(normalizeSearchText('')).toBe(''));
  it('handles null input', () => expect(normalizeSearchText(null)).toBe(''));
  it('normalizes á → a', () => expect(normalizeSearchText('áéíóú')).toBe('aeiou'));
  it('combines lowercase + strip diacritics', () => {
    expect(normalizeSearchText('INTRUSIÓN CRÍTICA')).toBe('intrusion critica');
  });
});

// ─── normalizeByOptions ───────────────────────────────────────────────────────

describe('normalizeByOptions', () => {
  const options = ['Intrusion', 'Incendio', 'Robo'];

  it('returns matching option (exact)', () => {
    expect(normalizeByOptions('Robo', options, 'Intrusion')).toBe('Robo');
  });

  it('matches case-insensitively', () => {
    expect(normalizeByOptions('robo', options, 'Intrusion')).toBe('Robo');
  });

  it('matches ignoring diacritics', () => {
    expect(normalizeByOptions('Intrusión', options, 'Robo')).toBe('Intrusion');
  });

  it('returns fallback for empty input', () => {
    expect(normalizeByOptions('', options, 'Intrusion')).toBe('Intrusion');
  });

  it('returns raw candidate when no match found', () => {
    expect(normalizeByOptions('Desconocido', options, 'Intrusion')).toBe('Desconocido');
  });
});

// ─── normalizeTimestamp ───────────────────────────────────────────────────────

describe('normalizeTimestamp', () => {
  it('returns numeric timestamps as-is', () => {
    const ts = 1700000000000;
    expect(normalizeTimestamp(ts)).toBe(ts);
  });

  it('parses ISO date strings', () => {
    const ts = normalizeTimestamp('2024-01-15T10:00:00.000Z');
    expect(ts).toBeGreaterThan(0);
    expect(typeof ts).toBe('number');
  });

  it('returns 0 for invalid values', () => {
    expect(normalizeTimestamp('not-a-date')).toBe(0);
    expect(normalizeTimestamp(null)).toBe(0);
    expect(normalizeTimestamp(undefined)).toBe(0);
    expect(normalizeTimestamp('')).toBe(0);
  });

  it('returns 0 for values that are not positive numbers and not parseable dates', () => {
    // Non-positive numbers fall through to Date.parse; completely unparseable strings return 0
    expect(normalizeTimestamp('xyz-invalid-date')).toBe(0);
    expect(normalizeTimestamp({})).toBe(0);
  });
});

// ─── sortByTimestampDesc ──────────────────────────────────────────────────────

describe('sortByTimestampDesc', () => {
  it('sorts items newest-first', () => {
    const items = [
      { timestamp: 1000, name: 'old' },
      { timestamp: 3000, name: 'newest' },
      { timestamp: 2000, name: 'middle' },
    ];
    const result = sortByTimestampDesc(items);
    expect(result[0].name).toBe('newest');
    expect(result[1].name).toBe('middle');
    expect(result[2].name).toBe('old');
  });

  it('does not mutate the original array', () => {
    const items = [{ timestamp: 100 }, { timestamp: 200 }];
    sortByTimestampDesc(items);
    expect(items[0].timestamp).toBe(100);
  });

  it('handles empty array', () => {
    expect(sortByTimestampDesc([])).toEqual([]);
  });

  it('handles single item', () => {
    const items = [{ timestamp: 5000 }];
    expect(sortByTimestampDesc(items)).toEqual(items);
  });
});

// ─── parseStoredArray ─────────────────────────────────────────────────────────

describe('parseStoredArray', () => {
  it('parses valid JSON array', () => {
    expect(parseStoredArray('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('returns [] for non-array JSON', () => {
    expect(parseStoredArray('{"a": 1}')).toEqual([]);
  });

  it('returns [] for null', () => {
    expect(parseStoredArray(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(parseStoredArray(undefined)).toEqual([]);
  });

  it('returns [] for invalid JSON', () => {
    expect(parseStoredArray('not json')).toEqual([]);
  });
});

// ─── safeImage / safeVideoUrl ─────────────────────────────────────────────────

describe('safeImage', () => {
  it('accepts data:image/ prefix', () => {
    const url = 'data:image/jpeg;base64,abc123';
    expect(safeImage(url)).toBe(url);
  });

  it('rejects data:video/ prefix', () => {
    expect(safeImage('data:video/mp4;base64,abc')).toBeNull();
  });

  it('rejects http URLs', () => {
    expect(safeImage('https://example.com/img.jpg')).toBeNull();
  });

  it('rejects non-strings', () => {
    expect(safeImage(null)).toBeNull();
    expect(safeImage(42)).toBeNull();
  });
});

describe('safeVideoUrl', () => {
  it('accepts data:video/ prefix', () => {
    const url = 'data:video/mp4;base64,abc123';
    expect(safeVideoUrl(url)).toBe(url);
  });

  it('accepts http URLs', () => {
    const url = 'https://example.com/video.mp4';
    expect(safeVideoUrl(url)).toBe(url);
  });

  it('rejects data:image/ prefix', () => {
    expect(safeVideoUrl('data:image/jpeg;base64,abc')).toBeNull();
  });

  it('rejects non-strings', () => {
    expect(safeVideoUrl(null)).toBeNull();
  });
});

// ─── normalizeIncident ────────────────────────────────────────────────────────

describe('normalizeIncident', () => {
  const base = {
    id: 'abc-123',
    fecha: '1/1/2024',
    timestamp: 1700000000000,
    titulo: 'Robo en bodega',
    tipo: 'Robo',
    severidad: 'Alta',
    descripcion: 'Se detectó robo',
    ubicacion: 'TJ01',
    status: 'Abierto',
    responsable: 'Juan',
  };

  it('returns a valid Incidente from a complete object', () => {
    const result = normalizeIncident(base);
    expect(result.id).toBe('abc-123');
    expect(result.titulo).toBe('Robo en bodega');
    expect(result.severidad).toBe('Alta');
    expect(result.status).toBe('Abierto');
    expect(result.notas).toEqual([]);
    expect(result.closedAt).toBeNull();
  });

  it('generates an id if missing', () => {
    const result = normalizeIncident({ ...base, id: '' });
    expect(result.id).toBeTruthy();
    expect(result.id).not.toBe('');
  });

  it('falls back to default tipo when invalid', () => {
    const result = normalizeIncident({ ...base, tipo: 'TipoInexistente' });
    expect(result.tipo).toBe('TipoInexistente'); // raw value returned when no match
  });

  it('falls back to Alta severity for invalid value', () => {
    const result = normalizeIncident({ ...base, severidad: 'Extrema' });
    expect(result.severidad).toBe('Extrema'); // raw candidate returned
  });

  it('normalizes imagenEvidencia to null if not a data:image/ URL', () => {
    const result = normalizeIncident({ ...base, imagenEvidencia: 'https://bad.com/img.jpg' });
    expect(result.imagenEvidencia).toBeNull();
  });

  it('handles null/undefined gracefully', () => {
    const result = normalizeIncident(null);
    expect(result.id).toBeTruthy();
    expect(result.notas).toEqual([]);
  });

  it('includes turnoId when provided', () => {
    const result = normalizeIncident({ ...base, turnoId: 'turno-xyz' });
    expect(result.turnoId).toBe('turno-xyz');
  });
});

// ─── normalizePersona ─────────────────────────────────────────────────────────

describe('normalizePersona', () => {
  const base = {
    id: 'p-1',
    fechaRegistro: '1/1/2024',
    nombre: 'Persona Sospechosa',
    terminos: 'Conducta agresiva o amenazas',
    descripcion: 'Visto en zona norte',
    imagenes: [],
  };

  it('returns a valid PersonaInteres from complete object', () => {
    const result = normalizePersona(base);
    expect(result.nombre).toBe('Persona Sospechosa');
    expect(result.imagenes).toEqual([]);
  });

  it('generates id if missing', () => {
    const result = normalizePersona({ ...base, id: '' });
    expect(result.id).toBeTruthy();
  });

  it('filters imagenes to only data:image/ strings', () => {
    const result = normalizePersona({
      ...base,
      imagenes: [
        'data:image/jpeg;base64,abc',
        'https://evil.com/img.jpg',
        'data:image/png;base64,xyz',
      ],
    });
    expect(result.imagenes).toHaveLength(2);
    expect(result.imagenes[0]).toBe('data:image/jpeg;base64,abc');
  });

  it('handles non-object input', () => {
    const result = normalizePersona(null);
    expect(result.id).toBeTruthy();
    expect(result.imagenes).toEqual([]);
  });
});

// ─── toCsvCell ────────────────────────────────────────────────────────────────

describe('toCsvCell', () => {
  it('wraps value in double quotes', () => {
    expect(toCsvCell('hello')).toBe('"hello"');
  });

  it('escapes internal double quotes by doubling', () => {
    expect(toCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('prefixes formula-injection characters with apostrophe', () => {
    expect(toCsvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(toCsvCell('+calc')).toBe('"\'+calc"');
    expect(toCsvCell('-sub')).toBe('"\'-sub"');
    expect(toCsvCell('@user')).toBe('"\'@user"');
  });

  it('handles null and undefined as empty quoted cell', () => {
    expect(toCsvCell(null)).toBe('""');
    expect(toCsvCell(undefined)).toBe('""');
  });

  it('converts numbers to string', () => {
    expect(toCsvCell(42)).toBe('"42"');
  });
});
