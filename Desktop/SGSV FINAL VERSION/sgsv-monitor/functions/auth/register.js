import bcrypt from 'bcryptjs';
import { getDb } from '../_lib/db.js';
import { requireAuth } from '../_lib/jwt.js';
import { json, err, cors, handle } from '../_lib/response.js';

export const onRequestOptions = () => cors();

export const onRequestPost = handle(async ({ request, env }) => {
  const user = await requireAuth(request, env);
  if (user.role !== 'administrador') throw { status: 403, message: 'Solo administradores pueden registrar usuarios.' };

  const { email, password, role = 'operador' } = await request.json();
  if (!email || !password) return err('Email y contraseña requeridos.', 400);
  if (!['operador', 'administrador'].includes(role)) return err('Rol invalido.', 400);

  const sql = getDb(env);
  const hash = await bcrypt.hash(password, 10);

  try {
    const rows = await sql`
      INSERT INTO usuarios (email, password_hash, role)
      VALUES (${email.trim().toLowerCase()}, ${hash}, ${role})
      RETURNING id, email, role
    `;
    return json(rows[0], 201);
  } catch (e) {
    if (e?.code === '23505') return err('Ya existe un usuario con ese email.', 409);
    throw e;
  }
});
