import app from './index.js';
import { assertRequiredRuntimeConfig, config } from './config.js';
import { initDb } from './db.js';
import { ensureInitialAdmin } from './store.js';

assertRequiredRuntimeConfig();
await initDb();
await ensureInitialAdmin();

app.listen(config.port, () => {
  console.log(`[sgsv] API escuchando en http://localhost:${config.port}`);
});
