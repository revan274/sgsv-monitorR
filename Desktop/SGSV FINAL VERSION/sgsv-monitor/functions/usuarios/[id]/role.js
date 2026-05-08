import { getDb } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/jwt.js';
import { json, err, cors, handle } from '../../_lib/response.js';

export const onRequestOptions = () => cors();

export const onRequestPut = handle(async ({ request, env, params }) => {
  const user = await requireAuth(request, env);
  if (user.role !== 'administrador') throw { status: 403, message: 'Se requiere rol administrador.' };
  if (params.id === user.id) return err('No puedes cambiar tu propio rol.', 400);

  const { role } = await request.json();
  if (!['operador', 'administrador'].includes(role)) return err('Rol invalido.', 400);

  const sql = getDb(env);
  const rows = await sql`
    UPDATE usuarios SET role = ${role} WHERE id = ${params.id}
    RETURNING id, email, role
  `;
  if (!rows[0]) return err('Usuario no encontrado.', 404);
  return json(rows[0]);
});
