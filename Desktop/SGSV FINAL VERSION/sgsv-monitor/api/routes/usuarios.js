import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /usuarios
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role FROM usuarios ORDER BY email ASC',
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Error al cargar usuarios.' });
  }
});

// PUT /usuarios/:id/role
router.put('/:id/role', async (req, res) => {
  const { role } = req.body || {};
  if (!['operador', 'administrador'].includes(role)) {
    return res.status(400).json({ error: 'Rol invalido.' });
  }
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Error al actualizar rol.' });
  }
});

export default router;
