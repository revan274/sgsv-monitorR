import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { can, publicUser, signSession, verifyPassword, verifySessionToken } from './auth.js';
import { uploadToSupabaseStorage } from './storage.js';
import {
  getConfig,
  getIncidente,
  getPersona,
  getUserByEmail,
  getUserById,
  listIncidentes,
  listPersonas,
  listTurnos,
  listUsers,
  saveConfig,
  updateUserRole,
  upsertIncidente,
  upsertPersona,
  upsertTurno,
  deleteIncidente,
  deletePersona,
  createUser,
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.mediaMaxBytes } });

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas peticiones, por favor intenta mas tarde.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de sesion, intenta en 15 minutos.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen CORS no permitido.'));
  },
}));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const authHeaderToken = (req) => {
  const value = req.get('authorization') || '';
  const [type, token] = value.split(' ');
  return /^bearer$/i.test(type) ? token : '';
};

const requireAuth = asyncRoute(async (req, res, next) => {
  const payload = verifySessionToken(authHeaderToken(req));
  if (!payload) {
    res.status(401).json({ error: 'Sesion invalida o expirada.' });
    return;
  }

  const user = await getUserById(payload.sub);
  if (!user?.active) {
    res.status(401).json({ error: 'Usuario inactivo o inexistente.' });
    return;
  }

  req.authUser = publicUser(user);
  next();
});

const requirePermission = (permission) => (req, res, next) => {
  if (!can(req.authUser?.role, permission)) {
    res.status(403).json({ error: 'Permiso insuficiente.' });
    return;
  }
  next();
};

const notFound = (res, entity = 'Registro') => res.status(404).json({ error: `${entity} no encontrado.` });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'sgsv-monitor-api' });
});

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    res.status(400).json({ error: 'Correo y contrasena son requeridos.' });
    return;
  }

  const user = await getUserByEmail(email);
  if (!user?.active || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Credenciales invalidas.' });
    return;
  }

  const safeUser = publicUser(user);
  res.json({ token: signSession(safeUser), user: safeUser });
}));

app.get('/api/auth/session', requireAuth, (req, res) => {
  res.json({ user: req.authUser });
});

app.post('/api/auth/logout', requireAuth, (_req, res) => {
  res.status(204).end();
});

app.get('/api/bootstrap', requireAuth, asyncRoute(async (req, res) => {
  const configData = await getConfig();
  if (req.authUser.role !== 'administrador') {
    res.json({
      user: req.authUser,
      config: configData,
      incidentes: [],
      pcp: [],
      turnos: [],
      usuarios: [],
    });
    return;
  }

  const [incidentes, pcp, turnos, usuarios] = await Promise.all([
    listIncidentes(),
    listPersonas(),
    listTurnos(),
    listUsers(),
  ]);

  res.json({ user: req.authUser, config: configData, incidentes, pcp, turnos, usuarios });
}));

app.get('/api/profiles', requireAuth, requirePermission('manage_users'), asyncRoute(async (_req, res) => {
  res.json(await listUsers());
}));

app.post('/api/profiles', requireAuth, requirePermission('manage_users'), asyncRoute(async (req, res) => {
  const created = await createUser(req.body || {}, req.authUser);
  res.status(201).json(created);
}));

app.patch('/api/profiles/:id', requireAuth, requirePermission('manage_users'), asyncRoute(async (req, res) => {
  const updated = await updateUserRole(req.params.id, req.body?.role, req.authUser);
  if (!updated) return notFound(res, 'Usuario');
  res.json(updated);
}));

app.get('/api/incidentes', requireAuth, requirePermission('edit_incidents'), asyncRoute(async (_req, res) => {
  res.json(await listIncidentes());
}));

app.get('/api/incidentes/:id', requireAuth, requirePermission('edit_incidents'), asyncRoute(async (req, res) => {
  const item = await getIncidente(req.params.id);
  if (!item) return notFound(res, 'Incidente');
  res.json(item);
}));

app.post('/api/incidentes', requireAuth, requirePermission('create_incidents'), asyncRoute(async (req, res) => {
  const created = await upsertIncidente(req.body || {}, req.authUser);
  res.status(201).json(created);
}));

app.patch('/api/incidentes/:id', requireAuth, requirePermission('edit_incidents'), asyncRoute(async (req, res) => {
  const existing = await getIncidente(req.params.id);
  if (!existing) return notFound(res, 'Incidente');
  res.json(await upsertIncidente({ ...existing, ...req.body, id: req.params.id }, req.authUser));
}));

app.delete('/api/incidentes/:id', requireAuth, requirePermission('delete_incidents'), asyncRoute(async (req, res) => {
  const deleted = await deleteIncidente(req.params.id, req.authUser);
  if (!deleted) return notFound(res, 'Incidente');
  res.status(204).end();
}));

app.get('/api/personas', requireAuth, requirePermission('manage_pcp'), asyncRoute(async (_req, res) => {
  res.json(await listPersonas());
}));

app.get('/api/personas/:id', requireAuth, requirePermission('manage_pcp'), asyncRoute(async (req, res) => {
  const item = await getPersona(req.params.id);
  if (!item) return notFound(res, 'PCP');
  res.json(item);
}));

app.post('/api/personas', requireAuth, requirePermission('manage_pcp'), asyncRoute(async (req, res) => {
  res.status(201).json(await upsertPersona(req.body || {}, req.authUser));
}));

app.patch('/api/personas/:id', requireAuth, requirePermission('manage_pcp'), asyncRoute(async (req, res) => {
  const existing = await getPersona(req.params.id);
  if (!existing) return notFound(res, 'PCP');
  res.json(await upsertPersona({ ...existing, ...req.body, id: req.params.id }, req.authUser));
}));

app.delete('/api/personas/:id', requireAuth, requirePermission('manage_pcp'), asyncRoute(async (req, res) => {
  const deleted = await deletePersona(req.params.id, req.authUser);
  if (!deleted) return notFound(res, 'PCP');
  res.status(204).end();
}));

app.get('/api/turnos', requireAuth, requirePermission('edit_incidents'), asyncRoute(async (_req, res) => {
  res.json(await listTurnos());
}));

app.post('/api/turnos', requireAuth, requirePermission('edit_incidents'), asyncRoute(async (req, res) => {
  res.status(201).json(await upsertTurno(req.body || {}, req.authUser));
}));

app.patch('/api/turnos/:id', requireAuth, requirePermission('edit_incidents'), asyncRoute(async (req, res) => {
  res.json(await upsertTurno({ ...req.body, id: req.params.id }, req.authUser));
}));

app.get('/api/config', requireAuth, asyncRoute(async (_req, res) => {
  res.json(await getConfig());
}));

app.patch('/api/config', requireAuth, requirePermission('manage_users'), asyncRoute(async (req, res) => {
  res.json(await saveConfig(req.body || {}, req.authUser));
}));

app.post('/api/upload', requireAuth, upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Archivo requerido.' });
    return;
  }
  const url = await uploadToSupabaseStorage({ file: req.file, path: req.body?.path });
  res.json({ url });
}));

const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((error, _req, res, _next) => {
  const status = Number(error?.status || error?.statusCode || 500);
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: error.message || 'Solicitud invalida.' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

export default app;
