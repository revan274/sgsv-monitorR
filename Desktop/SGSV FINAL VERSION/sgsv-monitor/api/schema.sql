-- ─── SGSV Monitor — Schema Neon PostgreSQL ──────────────────────────────────
-- Ejecutar una sola vez en el SQL Editor de Neon

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Usuarios (auth propia, sin Supabase)
CREATE TABLE IF NOT EXISTS usuarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'operador'
               CHECK (role IN ('operador', 'administrador')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidentes
CREATE TABLE IF NOT EXISTS incidentes (
  id               TEXT PRIMARY KEY,
  fecha            TEXT,
  ts               BIGINT,
  titulo           TEXT NOT NULL,
  tipo             TEXT NOT NULL,
  severidad        TEXT NOT NULL,
  descripcion      TEXT NOT NULL,
  ubicacion        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Abierto',
  responsable      TEXT,
  imagen_evidencia TEXT,
  imagen_persona   TEXT,
  video_evidencia  TEXT,
  closed_at        BIGINT,
  notas            JSONB DEFAULT '[]'::jsonb,
  turno_id         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidentes_ts       ON incidentes(ts DESC);
CREATE INDEX IF NOT EXISTS idx_incidentes_status   ON incidentes(status);
CREATE INDEX IF NOT EXISTS idx_incidentes_severidad ON incidentes(severidad);

-- Personas de interés (PCP)
CREATE TABLE IF NOT EXISTS personas_interes (
  id             TEXT PRIMARY KEY,
  fecha_registro TEXT,
  nombre         TEXT NOT NULL,
  terminos       TEXT,
  descripcion    TEXT DEFAULT '',
  imagenes       JSONB DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personas_nombre ON personas_interes(nombre ASC);

-- Turnos operativos
CREATE TABLE IF NOT EXISTS turnos (
  id            TEXT PRIMARY KEY,
  inicio        BIGINT NOT NULL,
  fin           BIGINT,
  operador      TEXT NOT NULL,
  ubicacion     TEXT NOT NULL,
  notas         JSONB DEFAULT '[]'::jsonb,
  incidente_ids JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed: primer administrador ──────────────────────────────────────────────
-- Reemplaza el hash con: node -e "const b=require('bcryptjs');b.hash('TU_PASSWORD',10).then(console.log)"
-- INSERT INTO usuarios (email, password_hash, role)
-- VALUES ('admin@sgsv.local', '$2a$10$HASH_AQUI', 'administrador')
-- ON CONFLICT (email) DO NOTHING;
