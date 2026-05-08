const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

export const err = (message, status = 500) => json({ error: message }, status);

export const cors = () => new Response(null, { status: 204, headers: CORS });

export const handle = (fn) => async (context) => {
  if (context.request.method === 'OPTIONS') return cors();
  try {
    return await fn(context);
  } catch (e) {
    if (e?.status) return err(e.message, e.status);
    console.error(e);
    return err('Error interno del servidor.');
  }
};
