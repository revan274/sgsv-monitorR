// ─── Enums de negocio ──────────────────────────────────────────────────────────

export type SeverityLevel = 'Baja' | 'Media' | 'Alta' | 'Critica';
export type StatusOption = 'Abierto' | 'En seguimiento' | 'Cerrado';
export type IncidentType = 'Intrusion' | 'Incendio' | 'Robo' | 'Accidente Medico' | 'Falla Tecnica' | 'Otro' | string;
export type LocationOption = string;
export type PcpTermino = string;

export type Role = 'operador' | 'administrador';
export type Permission =
  | 'create_incidents'
  | 'delete_incidents'
  | 'edit_incidents'
  | 'export_incidents'
  | 'manage_pcp'
  | 'manage_users';

// ─── Modelos de datos ──────────────────────────────────────────────────────────

export interface Nota {
  id: string;
  texto: string;
  autor: string;
  timestamp: number;
}

export interface Incidente {
  id: string;
  fecha: string;
  timestamp: number;
  titulo: string;
  tipo: IncidentType;
  severidad: SeverityLevel;
  descripcion: string;
  ubicacion: LocationOption;
  status: StatusOption;
  responsable: string;
  imagenEvidencia: string | null;
  imagenPersona: string | null;
  videoEvidencia: string | null;
  closedAt: number | null;
  notas: Nota[];
  turnoId?: string;
}

export interface PersonaInteres {
  id: string;
  fechaRegistro: string;
  nombre: string;
  terminos: PcpTermino;
  descripcion: string;
  imagenes: string[];
}

// ─── Turnos ────────────────────────────────────────────────────────────────────

export interface NotaTurno {
  id: string;
  texto: string;
  autor: string;
  timestamp: number;
}

export interface Turno {
  id: string;
  inicio: number;
  fin: number | null;
  operador: string;
  ubicacion: LocationOption;
  notas: NotaTurno[];
  incidenteIds: string[];
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  created_at?: string;
  updated_at?: string;
}

export interface ApiSession {
  token: string;
  user: UserProfile;
}

// ─── Configuracion dinamica ────────────────────────────────────────────────────

export interface AppConfig {
  customLocations: string[];
  customIncidentTypes: string[];
  customPcpTerminos: string[];
}

// ─── Notificaciones ────────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'warning';

export interface Notificacion {
  message: string;
  type: NotificationType;
}

// ─── Busqueda global ───────────────────────────────────────────────────────────

export type GlobalSearchResult =
  | { kind: 'incident'; item: Incidente }
  | { kind: 'pcp'; item: PersonaInteres };
