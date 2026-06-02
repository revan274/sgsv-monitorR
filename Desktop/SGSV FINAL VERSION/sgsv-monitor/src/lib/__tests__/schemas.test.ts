import { describe, it, expect } from 'vitest';
import {
  IncidenteSchema,
  NuevoIncidenteSchema,
  PersonaInteresSchema,
  TurnoSchema,
  AppConfigSchema,
  LoginSchema,
  validateIncidente,
  validatePersonaInteres,
  validateTurno,
  validateNuevoIncidente,
} from '../schemas';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validIncidente = {
  id: 'inc-1',
  fecha: '1/1/2024',
  timestamp: 1700000000000,
  titulo: 'Robo en bodega',
  tipo: 'Robo',
  severidad: 'Alta',
  descripcion: 'Se detectó actividad sospechosa en la bodega.',
  ubicacion: 'TJ01',
  status: 'Abierto',
  responsable: 'Operador01',
  notas: [],
};

const validPersona = {
  id: 'pcp-1',
  fechaRegistro: '1/1/2024',
  nombre: 'Persona Sospechosa',
  terminos: 'Conducta agresiva o amenazas',
  descripcion: 'Vista cerca del área de cajas',
  imagenes: [],
};

const validTurno = {
  id: 'turno-1',
  inicio: 1700000000000,
  fin: null,
  operador: 'Operador01',
  ubicacion: 'TJ01',
  notas: [],
  incidenteIds: [],
};

// ─── IncidenteSchema ──────────────────────────────────────────────────────────

describe('IncidenteSchema', () => {
  it('accepts a valid incidente', () => {
    const result = IncidenteSchema.safeParse(validIncidente);
    expect(result.success).toBe(true);
  });

  it('rejects missing titulo', () => {
    const result = IncidenteSchema.safeParse({ ...validIncidente, titulo: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('titulo'))).toBe(true);
    }
  });

  it('rejects missing descripcion', () => {
    const result = IncidenteSchema.safeParse({ ...validIncidente, descripcion: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid severidad', () => {
    const result = IncidenteSchema.safeParse({ ...validIncidente, severidad: 'Extrema' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = IncidenteSchema.safeParse({ ...validIncidente, status: 'Pendiente' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid severity values', () => {
    for (const sev of ['Baja', 'Media', 'Alta', 'Critica']) {
      const result = IncidenteSchema.safeParse({ ...validIncidente, severidad: sev });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid status values', () => {
    for (const status of ['Abierto', 'En seguimiento', 'Cerrado']) {
      const result = IncidenteSchema.safeParse({ ...validIncidente, status });
      expect(result.success).toBe(true);
    }
  });

  it('sets default notas = [] when omitted', () => {
    const { notas: _, ...withoutNotas } = validIncidente;
    const result = IncidenteSchema.safeParse(withoutNotas);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notas).toEqual([]);
  });

  it('sets default imagenEvidencia = null when omitted', () => {
    const result = IncidenteSchema.safeParse(validIncidente);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.imagenEvidencia).toBeNull();
  });

  it('accepts optional turnoId', () => {
    const result = IncidenteSchema.safeParse({ ...validIncidente, turnoId: 'turno-abc' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.turnoId).toBe('turno-abc');
  });

  it('rejects titulo longer than 200 characters', () => {
    const result = IncidenteSchema.safeParse({
      ...validIncidente,
      titulo: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

// ─── NuevoIncidenteSchema ─────────────────────────────────────────────────────

describe('NuevoIncidenteSchema', () => {
  const validNuevo = {
    titulo: 'Alerta urgente',
    tipo: 'Intrusion',
    severidad: 'Critica',
    descripcion: 'Movimiento detectado en zona restringida',
    ubicacion: 'TJ02',
  };

  it('accepts valid nuevo incidente', () => {
    expect(NuevoIncidenteSchema.safeParse(validNuevo).success).toBe(true);
  });

  it('rejects empty titulo', () => {
    expect(NuevoIncidenteSchema.safeParse({ ...validNuevo, titulo: '' }).success).toBe(false);
  });

  it('rejects empty descripcion', () => {
    expect(NuevoIncidenteSchema.safeParse({ ...validNuevo, descripcion: '' }).success).toBe(false);
  });

  it('rejects invalid severidad', () => {
    expect(NuevoIncidenteSchema.safeParse({ ...validNuevo, severidad: 'Unknown' }).success).toBe(false);
  });
});

// ─── PersonaInteresSchema ─────────────────────────────────────────────────────

describe('PersonaInteresSchema', () => {
  it('accepts a valid persona', () => {
    expect(PersonaInteresSchema.safeParse(validPersona).success).toBe(true);
  });

  it('rejects empty nombre', () => {
    const result = PersonaInteresSchema.safeParse({ ...validPersona, nombre: '' });
    expect(result.success).toBe(false);
  });

  it('rejects nombre longer than 150 characters', () => {
    const result = PersonaInteresSchema.safeParse({
      ...validPersona,
      nombre: 'a'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than MAX_PCP_IMAGES images', () => {
    const result = PersonaInteresSchema.safeParse({
      ...validPersona,
      imagenes: Array(13).fill('data:image/jpeg;base64,abc'),
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly MAX_PCP_IMAGES images', () => {
    const result = PersonaInteresSchema.safeParse({
      ...validPersona,
      imagenes: Array(12).fill('data:image/jpeg;base64,abc'),
    });
    expect(result.success).toBe(true);
  });

  it('sets default descripcion = "" when omitted', () => {
    const { descripcion: _, ...without } = validPersona;
    const result = PersonaInteresSchema.safeParse(without);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.descripcion).toBe('');
  });
});

// ─── TurnoSchema ──────────────────────────────────────────────────────────────

describe('TurnoSchema', () => {
  it('accepts a valid turno', () => {
    expect(TurnoSchema.safeParse(validTurno).success).toBe(true);
  });

  it('rejects zero/negative inicio', () => {
    expect(TurnoSchema.safeParse({ ...validTurno, inicio: 0 }).success).toBe(false);
    expect(TurnoSchema.safeParse({ ...validTurno, inicio: -1 }).success).toBe(false);
  });

  it('rejects empty operador', () => {
    expect(TurnoSchema.safeParse({ ...validTurno, operador: '' }).success).toBe(false);
  });

  it('accepts fin as a positive number', () => {
    const result = TurnoSchema.safeParse({ ...validTurno, fin: 1700001000000 });
    expect(result.success).toBe(true);
  });

  it('accepts notas array with valid entries', () => {
    const result = TurnoSchema.safeParse({
      ...validTurno,
      notas: [{
        id: 'nota-1',
        texto: 'Sin novedad',
        autor: 'Operador01',
        timestamp: 1700000001000,
      }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects nota with empty texto', () => {
    const result = TurnoSchema.safeParse({
      ...validTurno,
      notas: [{ id: 'n1', texto: '', autor: 'Op', timestamp: 1000 }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── AppConfigSchema ──────────────────────────────────────────────────────────

describe('AppConfigSchema', () => {
  it('accepts empty config with defaults', () => {
    const result = AppConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customLocations).toEqual([]);
      expect(result.data.customIncidentTypes).toEqual([]);
      expect(result.data.customPcpTerminos).toEqual([]);
    }
  });

  it('accepts custom locations', () => {
    const result = AppConfigSchema.safeParse({
      customLocations: ['Almacen-Norte', 'Planta-2'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty-string location entries', () => {
    const result = AppConfigSchema.safeParse({
      customLocations: [''],
    });
    expect(result.success).toBe(false);
  });
});

// ─── LoginSchema ──────────────────────────────────────────────────────────────

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'user@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 6 characters', () => {
    const result = LoginSchema.safeParse({ email: 'user@example.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(LoginSchema.safeParse({}).success).toBe(false);
    expect(LoginSchema.safeParse({ email: 'user@example.com' }).success).toBe(false);
  });
});

// ─── Helper functions ─────────────────────────────────────────────────────────

describe('validateIncidente helper', () => {
  it('returns success=true for valid data', () => {
    const result = validateIncidente(validIncidente);
    expect(result.success).toBe(true);
  });

  it('returns success=false for invalid data', () => {
    const result = validateIncidente({ titulo: '' });
    expect(result.success).toBe(false);
  });
});

describe('validatePersonaInteres helper', () => {
  it('returns success=true for valid data', () => {
    expect(validatePersonaInteres(validPersona).success).toBe(true);
  });
});

describe('validateTurno helper', () => {
  it('returns success=true for valid data', () => {
    expect(validateTurno(validTurno).success).toBe(true);
  });
});

describe('validateNuevoIncidente helper', () => {
  it('returns success=true for valid minimal form data', () => {
    const result = validateNuevoIncidente({
      titulo: 'Test',
      tipo: 'Intrusion',
      severidad: 'Alta',
      descripcion: 'Test description',
      ubicacion: 'TJ01',
    });
    expect(result.success).toBe(true);
  });
});
