import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/jwt.js';
import { json, err, cors, handle } from '../_lib/response.js';

const toTurno = (r) => ({
  id: r.id, inicio: Number(r.inicio), fin: r.fin ? Number(r.fin) : null,
  operador: r.operador, ubicacion: r.ubicacion,
  notas: Array.isArray(r.notas) ? r.notas : [],
  incidenteIds: Array.isArray(r.incidente_ids) ? r.incidente_ids : [],
});

export const onRequestOptions = () => cors();

export const onRequestGet = handle(async ({ request, env }) => {
  await requireAuth(request, env);
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM turnos ORDER BY inicio DESC`;
  return json(rows.map(toTurno));
});

export const onRequestPost = handle(async ({ request, env }) => {
  await requireAuth(request, env);
  const t = await request.json();
  if (!t?.id || !t?.inicio) return err('Faltan campos requeridos.', 400);

  const sql = getDb(env);
  await sql`
    INSERT INTO turnos (id, inicio, fin, operador, ubicacion, notas, incidente_ids)
    VALUES (${t.id}, ${t.inicio}, ${t.fin ?? null}, ${t.operador}, ${t.ubicacion},
            ${JSON.stringify(t.notas ?? [])}, ${JSON.stringify(t.incidenteIds ?? [])})
    ON CONFLICT (id) DO UPDATE SET
      fin=${t.fin ?? null}, notas=${JSON.stringify(t.notas ?? [])},
      incidente_ids=${JSON.stringify(t.incidenteIds ?? [])}
  `;
  return json({ ok: true });
});
