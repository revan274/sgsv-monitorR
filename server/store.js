import crypto from 'node:crypto';
import { query } from './db.js';
import { createPasswordHash, publicUser } from './auth.js';
import { config, isProduction } from './config.js';

const jsonArray = (value) => (Array.isArray(value) ? value : []);

const toIncident = (row) => ({
  id: row.id,
  fecha: row.fecha || '',
  timestamp: Number(row.timestamp) || 0,
  titulo: row.titulo || '',
  tipo: row.tipo || 'Otro',
  severidad: row.severidad || 'Alta',
  descripcion: row.descripcion || '',
  ubicacion: row.ubicacion || '',
  status: row.status || 'Abierto',
  responsable: row.responsable || '',
  imagenEvidencia: row.imagen_evidencia || null,
  imagenPersona: row.imagen_persona || null,
  videoEvidencia: row.video_evidencia || null,
  closedAt: row.closed_at === null || row.closed_at === undefined ? null : Number(row.closed_at),
  notas: jsonArray(row.notas),
  turnoId: row.turno_id || undefined,
});

const toPersona = (row) => ({
  id: row.id,
  fechaRegistro: row.fecha_registro || '',
  nombre: row.nombre || '',
  terminos: row.terminos || '',
  descripcion: row.descripcion || '',
  imagenes: jsonArray(row.imagenes),
});

const toTurno = (row) => ({
  id: row.id,
  inicio: Number(row.inicio) || Date.now(),
  fin: row.fin === null || row.fin === undefined ? null : Number(row.fin),
  operador: row.operador || '',
  ubicacion: row.ubicacion || '',
  notas: jsonArray(row.notas),
  incidenteIds: jsonArray(row.incidente_ids),
});

export async function ensureInitialAdmin() {
  const { rows } = await query('select count(*)::int as count from users');
  if (rows[0]?.count > 0) return;

  const email = String(config.initialAdminEmail || 'admin@sgsv.local').trim().toLowerCase();
  const password = String(config.initialAdminPassword || '');
  if (!password || password.length < 10) {
    if (isProduction) {
      throw new Error('ADMIN_PASSWORD de al menos 10 caracteres es requerido para inicializar SGSV.');
    }
    console.warn('[sgsv] ADMIN_PASSWORD no configurado; usando password local temporal.');
  }

  await query(
    `insert into users (email, password_hash, role)
     values ($1, $2, 'administrador')`,
    [email, createPasswordHash(password || 'ChangeMe.SGSV.123')],
  );
  console.log(`[sgsv] Usuario administrador inicial creado: ${email}`);
}

async function audit(actor, action, entity, entityId, payload = {}) {
  await query(
    `insert into audit_events (actor_id, actor_email, action, entity, entity_id, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [actor?.id || null, actor?.email || null, action, entity, entityId || null, JSON.stringify(payload)],
  );
}

export async function getUserByEmail(email) {
  const { rows } = await query('select * from users where lower(email) = lower($1) limit 1', [email]);
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await query('select * from users where id = $1 limit 1', [id]);
  return rows[0] || null;
}

export async function listUsers() {
  const { rows } = await query('select id, email, role, created_at, updated_at from users order by email asc');
  return rows.map(publicUser);
}

export async function createUser(input, actor) {
  const email = String(input?.email || '').trim().toLowerCase();
  const password = String(input?.password || '');
  const role = input?.role === 'administrador' ? 'administrador' : 'operador';

  if (!email || !email.includes('@')) {
    const error = new Error('Correo invalido.');
    error.status = 400;
    throw error;
  }
  if (password.length < 10) {
    const error = new Error('La contrasena debe tener al menos 10 caracteres.');
    error.status = 400;
    throw error;
  }

  try {
    const { rows } = await query(
      `insert into users (email, password_hash, role)
       values ($1, $2, $3)
       returning id, email, role, created_at, updated_at`,
      [email, createPasswordHash(password), role],
    );
    await audit(actor, 'user.create', 'users', rows[0].id, { email, role });
    return publicUser(rows[0]);
  } catch (error) {
    if (error?.code === '23505') {
      const conflict = new Error('Ya existe un usuario con ese correo.');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

export async function updateUserRole(id, role, actor) {
  const normalizedRole = role === 'administrador' ? 'administrador' : 'operador';
  const { rows } = await query(
    `update users set role = $2, updated_at = now()
     where id = $1
     returning id, email, role, created_at, updated_at`,
    [id, normalizedRole],
  );
  if (!rows[0]) return null;
  await audit(actor, 'user.role.update', 'users', id, { role: normalizedRole });
  return publicUser(rows[0]);
}

export async function listIncidentes() {
  const { rows } = await query('select * from incidentes order by timestamp desc, created_at desc');
  return rows.map(toIncident);
}

export async function getIncidente(id) {
  const { rows } = await query('select * from incidentes where id = $1', [id]);
  return rows[0] ? toIncident(rows[0]) : null;
}

export async function upsertIncidente(input, actor) {
  const id = String(input.id || crypto.randomUUID());
  const { rows } = await query(
    `insert into incidentes (
      id, fecha, timestamp, titulo, tipo, severidad, descripcion, ubicacion, status,
      responsable, imagen_evidencia, imagen_persona, video_evidencia, closed_at, notas, turno_id, created_by
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17)
    on conflict (id) do update set
      fecha = excluded.fecha,
      timestamp = excluded.timestamp,
      titulo = excluded.titulo,
      tipo = excluded.tipo,
      severidad = excluded.severidad,
      descripcion = excluded.descripcion,
      ubicacion = excluded.ubicacion,
      status = excluded.status,
      responsable = excluded.responsable,
      imagen_evidencia = excluded.imagen_evidencia,
      imagen_persona = excluded.imagen_persona,
      video_evidencia = excluded.video_evidencia,
      closed_at = excluded.closed_at,
      notas = excluded.notas,
      turno_id = excluded.turno_id,
      updated_at = now()
    returning *`,
    [
      id,
      String(input.fecha || new Date().toLocaleString()),
      Number(input.timestamp) || Date.now(),
      String(input.titulo || ''),
      String(input.tipo || 'Otro'),
      String(input.severidad || 'Alta'),
      String(input.descripcion || ''),
      String(input.ubicacion || ''),
      String(input.status || 'Abierto'),
      String(input.responsable || actor?.email || 'Operador'),
      input.imagen_evidencia ?? input.imagenEvidencia ?? null,
      input.imagen_persona ?? input.imagenPersona ?? null,
      input.video_evidencia ?? input.videoEvidencia ?? null,
      input.closed_at ?? input.closedAt ?? null,
      JSON.stringify(jsonArray(input.notas)),
      input.turno_id ?? input.turnoId ?? null,
      actor?.id || null,
    ],
  );
  await audit(actor, 'incident.upsert', 'incidentes', id);
  return toIncident(rows[0]);
}

export async function deleteIncidente(id, actor) {
  const { rowCount } = await query('delete from incidentes where id = $1', [id]);
  if (rowCount > 0) await audit(actor, 'incident.delete', 'incidentes', id);
  return rowCount > 0;
}

export async function listPersonas() {
  const { rows } = await query('select * from personas_interes order by created_at desc');
  return rows.map(toPersona);
}

export async function getPersona(id) {
  const { rows } = await query('select * from personas_interes where id = $1', [id]);
  return rows[0] ? toPersona(rows[0]) : null;
}

export async function upsertPersona(input, actor) {
  const id = String(input.id || crypto.randomUUID());
  const { rows } = await query(
    `insert into personas_interes (id, fecha_registro, nombre, terminos, descripcion, imagenes, created_by)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7)
     on conflict (id) do update set
       fecha_registro = excluded.fecha_registro,
       nombre = excluded.nombre,
       terminos = excluded.terminos,
       descripcion = excluded.descripcion,
       imagenes = excluded.imagenes,
       updated_at = now()
     returning *`,
    [
      id,
      String(input.fecha_registro || input.fechaRegistro || new Date().toLocaleDateString()),
      String(input.nombre || ''),
      String(input.terminos || ''),
      String(input.descripcion || ''),
      JSON.stringify(jsonArray(input.imagenes)),
      actor?.id || null,
    ],
  );
  await audit(actor, 'persona.upsert', 'personas_interes', id);
  return toPersona(rows[0]);
}

export async function deletePersona(id, actor) {
  const { rowCount } = await query('delete from personas_interes where id = $1', [id]);
  if (rowCount > 0) await audit(actor, 'persona.delete', 'personas_interes', id);
  return rowCount > 0;
}

export async function listTurnos() {
  const { rows } = await query('select * from turnos order by inicio desc');
  return rows.map(toTurno);
}

export async function upsertTurno(input, actor) {
  const id = String(input.id || crypto.randomUUID());
  const { rows } = await query(
    `insert into turnos (id, inicio, fin, operador, ubicacion, notas, incidente_ids, created_by)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)
     on conflict (id) do update set
       inicio = excluded.inicio,
       fin = excluded.fin,
       operador = excluded.operador,
       ubicacion = excluded.ubicacion,
       notas = excluded.notas,
       incidente_ids = excluded.incidente_ids,
       updated_at = now()
     returning *`,
    [
      id,
      Number(input.inicio) || Date.now(),
      input.fin ?? null,
      String(input.operador || actor?.email || 'Operador'),
      String(input.ubicacion || ''),
      JSON.stringify(jsonArray(input.notas)),
      JSON.stringify(jsonArray(input.incidente_ids ?? input.incidenteIds)),
      actor?.id || null,
    ],
  );
  await audit(actor, 'turno.upsert', 'turnos', id);
  return toTurno(rows[0]);
}

export async function getConfig() {
  const { rows } = await query('select * from app_config where id = $1', ['global']);
  const row = rows[0];
  return {
    customLocations: jsonArray(row?.custom_locations),
    customIncidentTypes: jsonArray(row?.custom_incident_types),
    customPcpTerminos: jsonArray(row?.custom_pcp_terminos),
  };
}

export async function saveConfig(input, actor) {
  const next = {
    customLocations: jsonArray(input.customLocations ?? input.custom_locations),
    customIncidentTypes: jsonArray(input.customIncidentTypes ?? input.custom_incident_types),
    customPcpTerminos: jsonArray(input.customPcpTerminos ?? input.custom_pcp_terminos),
  };
  await query(
    `insert into app_config (id, custom_locations, custom_incident_types, custom_pcp_terminos)
     values ('global', $1::jsonb, $2::jsonb, $3::jsonb)
     on conflict (id) do update set
       custom_locations = excluded.custom_locations,
       custom_incident_types = excluded.custom_incident_types,
       custom_pcp_terminos = excluded.custom_pcp_terminos,
       updated_at = now()`,
    [
      JSON.stringify(next.customLocations),
      JSON.stringify(next.customIncidentTypes),
      JSON.stringify(next.customPcpTerminos),
    ],
  );
  await audit(actor, 'config.update', 'app_config', 'global', next);
  return next;
}
