import bcrypt from 'bcryptjs';
import { getDb } from '../_lib/db.js';
import { signToken } from '../_lib/jwt.js';
import { json, err, cors, handle } from '../_lib/response.js';

export const onRequestOptions = () => cors();

export const onRequestPost = handle(async ({ request, env }) => {
  const { email, password } = await request.json();
  if (!email || !password) return err('Email y contraseña requeridos.', 400);

  const sql = getDb(env);
  const rows = await sql`
    SELECT id, email, role, password_hash FROM usuarios
    WHERE email = ${email.trim().toLowerCase()}
  `;

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return err('Credenciales invalidas.', 401);
  }

  const profile = { id: user.id, email: user.email, role: user.role };
  const token = await signToken(profile, env);
  return json({ token, user: profile });
});
