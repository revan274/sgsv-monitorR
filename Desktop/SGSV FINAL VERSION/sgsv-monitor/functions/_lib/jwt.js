import { SignJWT, jwtVerify } from 'jose';

const getSecret = (env) => new TextEncoder().encode(env.JWT_SECRET);

export const signToken = async (payload, env) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret(env));

export const verifyToken = async (token, env) => {
  const { payload } = await jwtVerify(token, getSecret(env));
  return payload;
};

export const getTokenFromRequest = (request) => {
  const header = request.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

export const requireAuth = async (request, env) => {
  const token = getTokenFromRequest(request);
  if (!token) throw { status: 401, message: 'Token de autenticacion requerido.' };
  try {
    return await verifyToken(token, env);
  } catch {
    throw { status: 401, message: 'Token invalido o expirado.' };
  }
};
