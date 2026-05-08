import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/jwt.js';
import { json, cors, handle } from '../_lib/response.js';

export const onRequestOptions = () => cors();

export const onRequestDelete = handle(async ({ request, env, params }) => {
  await requireAuth(request, env);
  const sql = getDb(env);
  await sql`DELETE FROM personas_interes WHERE id = ${params.id}`;
  return json({ ok: true });
});
