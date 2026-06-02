import { z } from 'zod';
import {
  INCIDENT_TYPES,
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  MAX_PCP_IMAGES,
} from './utils';

// ─── Nota de seguimiento ───────────────────────────────────────────────────────

export const NotaSchema = z.object({
  id: z.string().min(1),
  texto: z.string().min(1, 'La nota no puede estar vacía'),
  autor: z.string().min(1),
  timestamp: z.number().positive(),
});

// ─── Incidente ─────────────────────────────────────────────────────────────────

export const IncidenteSchema = z.object({
  id: z.string().min(1),
  fecha: z.string().min(1),
  timestamp: z.number().nonnegative(),
  titulo: z.string().min(1, 'El título es obligatorio').max(200),
  tipo: z.string().min(1),
  severidad: z.enum(SEVERITY_OPTIONS as [string, ...string[]]),
  descripcion: z.string().min(1, 'La descripción es obligatoria').max(5000),
  ubicacion: z.string().min(1),
  status: z.enum(STATUS_OPTIONS as [string, ...string[]]),
  responsable: z.string().min(1),
  imagenEvidencia: z.string().nullable().optional().default(null),
  imagenPersona: z.string().nullable().optional().default(null),
  videoEvidencia: z.string().nullable().optional().default(null),
  closedAt: z.number().nullable().optional().default(null),
  notas: z.array(NotaSchema).default([]),
  turnoId: z.string().optional(),
});

export type IncidenteInput = z.infer<typeof IncidenteSchema>;

// ─── Formulario de nuevo incidente ────────────────────────────────────────────

export const NuevoIncidenteSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  tipo: z.string().min(1),
  severidad: z.enum(SEVERITY_OPTIONS as [string, ...string[]]),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  ubicacion: z.string().min(1),
  imagenEvidencia: z.string().nullable().optional(),
  imagenPersona: z.string().nullable().optional(),
  videoEvidencia: z.string().nullable().optional(),
});

export type NuevoIncidenteInput = z.infer<typeof NuevoIncidenteSchema>;

// ─── Persona de interés (PCP) ──────────────────────────────────────────────────

export const PersonaInteresSchema = z.object({
  id: z.string().min(1),
  fechaRegistro: z.string().min(1),
  nombre: z.string().min(1, 'El nombre es obligatorio').max(150),
  terminos: z.string().min(1),
  descripcion: z.string().max(2000).default(''),
  imagenes: z
    .array(z.string())
    .max(MAX_PCP_IMAGES, `Máximo ${MAX_PCP_IMAGES} imágenes`)
    .default([]),
});

export type PersonaInteresInput = z.infer<typeof PersonaInteresSchema>;

// ─── Turno ─────────────────────────────────────────────────────────────────────

export const NotaTurnoSchema = z.object({
  id: z.string().min(1),
  texto: z.string().min(1, 'La nota no puede estar vacía'),
  autor: z.string().min(1),
  timestamp: z.number().positive(),
});

export const TurnoSchema = z.object({
  id: z.string().min(1),
  inicio: z.number().positive(),
  fin: z.number().nullable().default(null),
  operador: z.string().min(1),
  ubicacion: z.string().min(1),
  notas: z.array(NotaTurnoSchema).default([]),
  incidenteIds: z.array(z.string()).default([]),
});

export type TurnoInput = z.infer<typeof TurnoSchema>;

// ─── Configuracion dinamica ────────────────────────────────────────────────────

export const AppConfigSchema = z.object({
  customLocations: z.array(z.string().min(1)).default([]),
  customIncidentTypes: z.array(z.string().min(1)).default([]),
  customPcpTerminos: z.array(z.string().min(1)).default([]),
});

export type AppConfigInput = z.infer<typeof AppConfigSchema>;

// ─── Credenciales ─────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ─── Helpers de validacion ─────────────────────────────────────────────────────

export const validateIncidente = (data: unknown) => IncidenteSchema.safeParse(data);
export const validatePersonaInteres = (data: unknown) => PersonaInteresSchema.safeParse(data);
export const validateTurno = (data: unknown) => TurnoSchema.safeParse(data);
export const validateNuevoIncidente = (data: unknown) => NuevoIncidenteSchema.safeParse(data);
