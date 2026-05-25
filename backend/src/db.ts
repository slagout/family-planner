import { Pool, PoolClient } from 'pg';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[DB] Required environment variable "${name}" is not set. Aborting startup.`);
  }
  return value;
}

let _pool: Pool;

export function getPool(): Pool {
  if (!_pool) {
    const host = requireEnv('PGHOST');
    const database = requireEnv('PGDATABASE');
    const user = requireEnv('PGUSER');
    const password = requireEnv('PGPASSWORD');

    _pool = new Pool({
      host,
      port: Number(process.env.PGPORT) || 5432,
      database,
      user,
      password,
      max: Number(process.env.PG_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl: process.env.NODE_ENV === 'production' && process.env.PG_SSL !== 'false'
        ? { rejectUnauthorized: false }
        : false,
    });

    _pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err);
    });

    console.log(`[DB] PostgreSQL pool created → ${host}/${database}`);
  }
  return _pool;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Keep backward-compat export for existing code
export const pool = {
  query: (text: string, values?: any[]) => getPool().query(text, values),
  connect: () => getPool().connect(),
};
