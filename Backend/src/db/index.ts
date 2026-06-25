import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

if (!env.DB_URL) {
    throw new Error('Database URL is not defined in environment variables');
}

const pool = new Pool({
    connectionString: env.DB_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Pool error:', err);
});

pool.on('connect', () => {
    console.log('Connected to the database successfully');
});

export const db = drizzle({ client: pool, schema });