import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const rowToIncidente = (row) => ({
  id: row.id,
  fecha: row.fecha,
  timestamp: Number(row.ts),
  titulo: row.titulo,
  tipo: row.tipo,
  severidad: row.severidad,
  descripcion: row.descripcion,
  ubicacion: row.ubicacion,
  status: row.status,
  responsable: row.responsable,
  imagenEvidencia: row.imagen_evidencia,
  imagenPersona: row.imagen_persona,
  videoEvidencia: row.video_evidencia,
  closedAt: row.closed_at ? Number(row.closed_at) : null,
  notas: Array.isArray(row.notas) ? row.notas : [],
  turnoId: row.turno_id || undefined,
});

// GET /incidentes?page=1&limit=20
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  try {
    const [data, countResult] = await Promise.all([
      pool.query(
        'SELECT * FROM incidentes ORDER BY ts DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM incidentes'),
    ]);

    res.json({
      incidentes: data.rows.map(rowToIncidente),
      total: countResult.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar incidentes.' });
  }
});

// POST /incidentes  (upsert)
router.post('/', async (req, res) => {
  const inc = req.body;
  if (!inc?.id || !inc?.titulo) {
    return res.status(400).json({ error: 'Faltan campos requeridos (id, titulo).' });
  }

  try {
    await pool.query(
      `INSERT INTO incidentes
         (id, fecha, ts, titulo, tipo, severidad, descripcion, ubicacion,
          status, responsable, imagen_evidencia, imagen_persona, video_evidencia,
          closed_at, notas, turno_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
         fecha=$2, ts=$3, titulo=$4, tipo=$5, severidad=$6, descripcion=$7,
         ubicacion=$8, status=$9, responsable=$10, imagen_evidencia=$11,
         imagen_persona=$12, video_evidencia=$13, closed_at=$14, notas=$15, turno_id=$16`,
      [
        inc.id, inc.fecha, inc.timestamp, inc.titulo, inc.tipo, inc.severidad,
        inc.descripcion, inc.ubicacion, inc.status, inc.responsable,
        inc.imagenEvidencia ?? null, inc.imagenPersona ?? null,
        inc.videoEvidencia ?? null, inc.closedAt ?? null,
        JSON.stringify(inc.notas ?? []), inc.turnoId ?? null,
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar incidente.' });
  }
});

// DELETE /incidentes/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM incidentes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar incidente.' });
  }
});

export default router;
