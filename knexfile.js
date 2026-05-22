import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  },
  migrations: {
    directory: path.join(__dirname, 'server', 'migrations'),
    extension: 'js',
  },
  seeds: {
    directory: path.join(__dirname, 'server', 'seeds'),
    extension: 'js',
  },
};
