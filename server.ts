import 'dotenv/config';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createGymAppApi } from './server/gym-app-api.ts';

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);

const databasePath = resolve(process.env.GYM_APP_DATABASE_PATH || './data/gym-app.sqlite3');
mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);

const app = express();
app.set('trust proxy', true);

const gymApi = createGymAppApi(database, {
  secureCookies: isProduction,
  maxCheckInHours: Number(process.env.GYM_MAX_CHECK_IN_HOURS || 8),
});

app.use(gymApi);

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = resolve('dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.info(`DHBW Gym Community server running on http://0.0.0.0:${port}`);
});
