import { describe, it, expect } from 'vitest';
import { IncidenteSchema, PersonaInteresSchema, validateIncidente, validatePersonaInteres } from '../schemas';
import { createId } from '../utils';

describe('IncidenteSchema', () => {
  it('validates a correct incident', () => {
    const data = {
      id: createId(),
      fecha: '2024-01-01',
      timestamp: Date.now(),
      titulo: 'Test',
      tipo: 'Robo',
      severidad: 'Alta',
      descripcion: 'Un test',
      ubicacion: 'TJ01',
      status: 'Abierto',
      responsable: 'Admin',
      notas: [],
    };
    const result = validateIncidente(data);
    expect(result.success).toBe(true);
  });

  it('rejects incident without required fields', () => {
    const data = {
      titulo: 'Test', // missing id, fecha, etc.
    };
    const result = validateIncidente(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid severidad', () => {
    const data = {
      id: createId(),
      fecha: '2024-01-01',
      timestamp: Date.now(),
      titulo: 'Test',
      tipo: 'Robo',
      severidad: 'Desconocida', // Invalid severity
      descripcion: 'Un test',
      ubicacion: 'TJ01',
      status: 'Abierto',
      responsable: 'Admin',
      notas: [],
    };
    const result = validateIncidente(data);
    expect(result.success).toBe(false);
  });
});

describe('PersonaInteresSchema', () => {
  it('validates a correct PCP', () => {
    const data = {
      id: createId(),
      fechaRegistro: '2024-01-01',
      nombre: 'Juan Perez',
      terminos: 'Merodeo sospechoso reiterado',
      descripcion: '',
      imagenes: [],
    };
    const result = validatePersonaInteres(data);
    expect(result.success).toBe(true);
  });

  it('rejects too many images', () => {
    const data = {
      id: createId(),
      fechaRegistro: '2024-01-01',
      nombre: 'Juan Perez',
      terminos: 'Merodeo sospechoso reiterado',
      descripcion: '',
      imagenes: Array(20).fill('https://example.com/img.jpg'), // Max is 12
    };
    const result = validatePersonaInteres(data);
    expect(result.success).toBe(false);
  });
});
