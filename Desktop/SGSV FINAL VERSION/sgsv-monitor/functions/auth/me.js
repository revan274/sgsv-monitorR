import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/jwt.js';
import { json, cors, handle } from '../_lib/response.js';

export const onRequestOptions = () => cors();

export const onRequestGet = handle(async ({ request, env }) => {
  const user = await requireAuth(request, env);
  const sql = getDb(env);
  const rows = await sql`SELECT id, email, role FROM usuarios WHERE id = ${user.id}`;
  if (!rows[0]) throw { status: 404, message: 'Usuario no encontrado.' };
  return json(rows[0]);
});
