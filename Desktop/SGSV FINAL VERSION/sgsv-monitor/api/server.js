import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import incidentesRoutes from './routes/incidentes.js';
import personasRoutes from './routes/personas.js';
import usuariosRoutes from './routes/usuarios.js';
import turnosRoutes from './routes/turnos.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no esta definida. Revisa las variables de entorno.');
}

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '60mb' }));

// Health check para Render
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/auth', authRoutes);
app.use('/incidentes', incidentesRoutes);
app.use('/personas', personasRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/turnos', turnosRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Error global
app.use((err, _req, res, _next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`SGSV API corriendo en http://localhost:${PORT}`);
});
