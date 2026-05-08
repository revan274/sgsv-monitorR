import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, role, password_hash FROM usuarios WHERE email = $1',
      [email.trim().toLowerCase()],
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    const profile = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(profile, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: profile });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role FROM usuarios WHERE id = $1',
      [req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Crear usuario (solo admin o primer setup)
router.post('/register', requireAuth, async (req, res) => {
  if (req.user.role !== 'administrador') {
    return res.status(403).json({ error: 'Solo administradores pueden registrar usuarios.' });
  }

  const { email, password, role = 'operador' } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  }
  if (!['operador', 'administrador'].includes(role)) {
    return res.status(400).json({ error: 'Rol invalido.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO usuarios (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, email, role',
      [email.trim().toLowerCase(), hash, role],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

export default router;
