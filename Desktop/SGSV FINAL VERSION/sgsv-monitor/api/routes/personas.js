import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const rowToPersona = (row) => ({
  id: row.id,
  fechaRegistro: row.fecha_registro,
  nombre: row.nombre,
  terminos: row.terminos,
  descripcion: row.descripcion || '',
  imagenes: Array.isArray(row.imagenes) ? row.imagenes : [],
});

// GET /personas
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM personas_interes ORDER BY nombre ASC',
    );
    res.json(rows.map(rowToPersona));
  } catch {
    res.status(500).json({ error: 'Error al cargar personas.' });
  }
});

// POST /personas  (upsert)
router.post('/', async (req, res) => {
  const p = req.body;
  if (!p?.id || !p?.nombre) {
    return res.status(400).json({ error: 'Faltan campos requeridos (id, nombre).' });
  }

  try {
    await pool.query(
      `INSERT INTO personas_interes (id, fecha_registro, nombre, terminos, descripcion, imagenes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         fecha_registro=$2, nombre=$3, terminos=$4, descripcion=$5, imagenes=$6`,
      [p.id, p.fechaRegistro, p.nombre, p.terminos, p.descripcion, JSON.stringify(p.imagenes ?? [])],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al guardar persona.' });
  }
});

// DELETE /personas/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM personas_interes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar persona.' });
  }
});

export default router;
