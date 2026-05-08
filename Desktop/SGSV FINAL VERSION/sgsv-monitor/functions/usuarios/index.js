import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/jwt.js';
import { json, cors, handle } from '../_lib/response.js';

export const onRequestOptions = () => cors();

export const onRequestGet = handle(async ({ request, env }) => {
  const user = await requireAuth(request, env);
  if (user.role !== 'administrador') throw { status: 403, message: 'Se requiere rol administrador.' };

  const sql = getDb(env);
  const rows = await sql`SELECT id, email, role FROM usuarios ORDER BY email ASC`;
  return json(rows);
});
