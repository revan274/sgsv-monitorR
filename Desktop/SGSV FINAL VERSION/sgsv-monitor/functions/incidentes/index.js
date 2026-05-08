import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/jwt.js';
import { json, err, cors, handle } from '../_lib/response.js';

const toIncidente = (r) => ({
  id: r.id, fecha: r.fecha, timestamp: Number(r.ts),
  titulo: r.titulo, tipo: r.tipo, severidad: r.severidad,
  descripcion: r.descripcion, ubicacion: r.ubicacion, status: r.status,
  responsable: r.responsable,
  imagenEvidencia: r.imagen_evidencia, imagenPersona: r.imagen_persona,
  videoEvidencia: r.video_evidencia,
  closedAt: r.closed_at ? Number(r.closed_at) : null,
  notas: Array.isArray(r.notas) ? r.notas : [],
  turnoId: r.turno_id || undefined,
});

export const onRequestOptions = () => cors();

export const onRequestGet = handle(async ({ request, env }) => {
  await requireAuth(request, env);
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  const sql = getDb(env);
  const [data, countResult] = await Promise.all([
    sql`SELECT * FROM incidentes ORDER BY ts DESC LIMIT ${limit} OFFSET ${offset}`,
    sql`SELECT COUNT(*)::int AS total FROM incidentes`,
  ]);

  return json({ incidentes: data.map(toIncidente), total: countResult[0].total, page, limit });
});

export const onRequestPost = handle(async ({ request, env }) => {
  await requireAuth(request, env);
  const inc = await request.json();
  if (!inc?.id || !inc?.titulo) return err('Faltan campos requeridos.', 400);

  const sql = getDb(env);
  await sql`
    INSERT INTO incidentes
      (id, fecha, ts, titulo, tipo, severidad, descripcion, ubicacion,
       status, responsable, imagen_evidencia, imagen_persona, video_evidencia,
       closed_at, notas, turno_id)
    VALUES (
      ${inc.id}, ${inc.fecha}, ${inc.timestamp}, ${inc.titulo}, ${inc.tipo},
      ${inc.severidad}, ${inc.descripcion}, ${inc.ubicacion}, ${inc.status},
      ${inc.responsable}, ${inc.imagenEvidencia ?? null}, ${inc.imagenPersona ?? null},
      ${inc.videoEvidencia ?? null}, ${inc.closedAt ?? null},
      ${JSON.stringify(inc.notas ?? [])}, ${inc.turnoId ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      fecha=${inc.fecha}, ts=${inc.timestamp}, titulo=${inc.titulo}, tipo=${inc.tipo},
      severidad=${inc.severidad}, descripcion=${inc.descripcion}, ubicacion=${inc.ubicacion},
      status=${inc.status}, responsable=${inc.responsable},
      imagen_evidencia=${inc.imagenEvidencia ?? null},
      imagen_persona=${inc.imagenPersona ?? null},
      video_evidencia=${inc.videoEvidencia ?? null},
      closed_at=${inc.closedAt ?? null},
      notas=${JSON.stringify(inc.notas ?? [])},
      turno_id=${inc.turnoId ?? null}
  `;
  return json({ ok: true });
});
