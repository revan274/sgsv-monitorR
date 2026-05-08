import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/jwt.js';
import { json, err, cors, handle } from '../_lib/response.js';

const toPersona = (r) => ({
  id: r.id, fechaRegistro: r.fecha_registro, nombre: r.nombre,
  terminos: r.terminos, descripcion: r.descripcion || '',
  imagenes: Array.isArray(r.imagenes) ? r.imagenes : [],
});

export const onRequestOptions = () => cors();

export const onRequestGet = handle(async ({ request, env }) => {
  await requireAuth(request, env);
  const sql = getDb(env);
  const rows = await sql`SELECT * FROM personas_interes ORDER BY nombre ASC`;
  return json(rows.map(toPersona));
});

export const onRequestPost = handle(async ({ request, env }) => {
  await requireAuth(request, env);
  const p = await request.json();
  if (!p?.id || !p?.nombre) return err('Faltan campos requeridos.', 400);

  const sql = getDb(env);
  await sql`
    INSERT INTO personas_interes (id, fecha_registro, nombre, terminos, descripcion, imagenes)
    VALUES (${p.id}, ${p.fechaRegistro}, ${p.nombre}, ${p.terminos}, ${p.descripcion}, ${JSON.stringify(p.imagenes ?? [])})
    ON CONFLICT (id) DO UPDATE SET
      fecha_registro=${p.fechaRegistro}, nombre=${p.nombre}, terminos=${p.terminos},
      descripcion=${p.descripcion}, imagenes=${JSON.stringify(p.imagenes ?? [])}
  `;
  return json({ ok: true });
});
