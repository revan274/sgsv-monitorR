import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const rowToTurno = (row) => ({
  id: row.id,
  inicio: Number(row.inicio),
  fin: row.fin ? Number(row.fin) : null,
  operador: row.operador,
  ubicacion: row.ubicacion,
  notas: Array.isArray(row.notas) ? row.notas : [],
  incidenteIds: Array.isArray(row.incidente_ids) ? row.incidente_ids : [],
});

// GET /turnos
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM turnos ORDER BY inicio DESC',
    );
    res.json(rows.map(rowToTurno));
  } catch {
    res.status(500).json({ error: 'Error al cargar turnos.' });
  }
});

// POST /turnos  (upsert)
router.post('/', async (req, res) => {
  const t = req.body;
  if (!t?.id || !t?.inicio) {
    return res.status(400).json({ error: 'Faltan campos requeridos (id, inicio).' });
  }

  try {
    await pool.query(
      `INSERT INTO turnos (id, inicio, fin, operador, ubicacion, notas, incidente_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         fin=$3, notas=$6, incidente_ids=$7`,
      [
        t.id, t.inicio, t.fin ?? null, t.operador, t.ubicacion,
        JSON.stringify(t.notas ?? []), JSON.stringify(t.incidenteIds ?? []),
      ],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al guardar turno.' });
  }
});

export default router;
