import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

const needsSsl = (url) => url && !/localhost|127\.0\.0\.1/i.test(url);

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: needsSsl(config.databaseUrl) ? { rejectUnauthorized: false } : undefined,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function initDb() {
  await query('create extension if not exists pgcrypto');
  await query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      password_hash text not null,
      role text not null check (role in ('operador', 'administrador')) default 'operador',
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists incidentes (
      id text primary key,
      fecha text,
      timestamp bigint not null default 0,
      titulo text not null,
      tipo text not null,
      severidad text not null default 'Alta',
      descripcion text not null,
      ubicacion text not null,
      status text not null default 'Abierto',
      responsable text,
      imagen_evidencia text,
      imagen_persona text,
      video_evidencia text,
      closed_at bigint,
      notas jsonb not null default '[]'::jsonb,
      turno_id text,
      created_by uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists personas_interes (
      id text primary key,
      fecha_registro text,
      nombre text not null default '',
      terminos text,
      descripcion text not null default '',
      imagenes jsonb not null default '[]'::jsonb,
      created_by uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists turnos (
      id text primary key,
      inicio bigint not null,
      fin bigint,
      operador text not null,
      ubicacion text not null,
      notas jsonb not null default '[]'::jsonb,
      incidente_ids jsonb not null default '[]'::jsonb,
      created_by uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists app_config (
      id text primary key default 'global',
      custom_locations jsonb not null default '[]'::jsonb,
      custom_incident_types jsonb not null default '[]'::jsonb,
      custom_pcp_terminos jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    );

    create table if not exists audit_events (
      id bigserial primary key,
      actor_id uuid references users(id) on delete set null,
      actor_email text,
      action text not null,
      entity text not null,
      entity_id text,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_incidentes_ts on incidentes(timestamp desc);
    create index if not exists idx_incidentes_status on incidentes(status);
    create index if not exists idx_incidentes_severidad on incidentes(severidad);
    create index if not exists idx_personas_nombre on personas_interes(nombre asc);
    create index if not exists idx_turnos_inicio on turnos(inicio desc);
    create index if not exists idx_audit_created_at on audit_events(created_at desc);
  `);
}
