import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function bootstrap() {
  await connectDatabase();
  app.listen(env.PORT, () => console.info(`API listening on http://localhost:${env.PORT}`));
}

bootstrap().catch((error) => { console.error('Unable to start API', error); process.exit(1); });
