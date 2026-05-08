import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticacion requerido.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'administrador') {
    return res.status(403).json({ error: 'Se requiere rol administrador.' });
  }
  next();
};
