-- Migración Inicial para SGSV Monitor en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- 1. Perfiles de usuario (extendiendo auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'operador' CHECK (role IN ('operador', 'administrador')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Incidentes
CREATE TABLE IF NOT EXISTS public.incidentes (
  id TEXT PRIMARY KEY,
  fecha TEXT,
  timestamp BIGINT,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  severidad TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Abierto',
  responsable TEXT,
  imagen_evidencia TEXT,
  imagen_persona TEXT,
  video_evidencia TEXT,
  closed_at BIGINT,
  notas JSONB DEFAULT '[]'::jsonb,
  turno_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidentes_ts ON public.incidentes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidentes_status ON public.incidentes(status);
CREATE INDEX IF NOT EXISTS idx_incidentes_severidad ON public.incidentes(severidad);

-- 3. Personas de interés (PCP)
CREATE TABLE IF NOT EXISTS public.personas_interes (
  id TEXT PRIMARY KEY,
  fecha_registro TEXT,
  nombre TEXT NOT NULL,
  terminos TEXT,
  descripcion TEXT DEFAULT '',
  imagenes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personas_nombre ON public.personas_interes(nombre ASC);

-- 4. Turnos operativos
CREATE TABLE IF NOT EXISTS public.turnos (
  id TEXT PRIMARY KEY,
  inicio BIGINT NOT NULL,
  fin BIGINT,
  operador TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  notas JSONB DEFAULT '[]'::jsonb,
  incidente_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas_interes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles (profiles)
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para incidentes
CREATE POLICY "Authenticated users can select incidentes" ON public.incidentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert incidentes" ON public.incidentes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update incidentes" ON public.incidentes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete incidentes" ON public.incidentes FOR DELETE TO authenticated USING (true);

-- Políticas para personas_interes
CREATE POLICY "Authenticated users can select personas" ON public.personas_interes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert personas" ON public.personas_interes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update personas" ON public.personas_interes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete personas" ON public.personas_interes FOR DELETE TO authenticated USING (true);

-- Políticas para turnos
CREATE POLICY "Authenticated users can select turnos" ON public.turnos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert turnos" ON public.turnos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update turnos" ON public.turnos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete turnos" ON public.turnos FOR DELETE TO authenticated USING (true);

-- Trigger para crear un perfil automáticamente cuando se registra un usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'operador');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
