import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { pool } from './db';
import { apiRouter } from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rate-limiter';
import { securityHeaders } from './middleware/security-headers';
import { validateInput } from './middleware/input-validator';
import { auditLogger } from './middleware/audit-logger';
import { validateJwtSecret } from './middleware/jwt-validator';

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const migrationsDir = path.resolve(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[Migrations] No migrations directory found, skipping.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => /^\d{3}_/.test(f) && f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`[Migrations] Already applied: ${file}`);
        continue;
      }

      console.log(`[Migrations] Applying: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`[Migrations] Applied: ${file}`);
    }
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  // Validate JWT secret before starting server
  validateJwtSecret();

  await runMigrations();

  const app = express();
  const PORT = parseInt(process.env.PORT || '4000');

  // Security middleware
  app.use(helmet());

  // Dynamic CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://frontend'];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing with size limits
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb' }));

  // Cookie parsing (required for Kroger OAuth state cookie)
  app.use(cookieParser());

  // Apply security headers
  app.use(securityHeaders);

  // Input validation
  app.use(validateInput);

  // Audit logging
  app.use(auditLogger);

  // Rate limiting
  app.use(globalLimiter);

  // Health check endpoints for monitoring
  app.get('/api/health', async (_req, res) => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'connected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // Detailed health status for Kubernetes/Docker Compose
  app.get('/api/health/ready', async (_req, res) => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      res.json({ ready: true });
    } catch (error) {
      res.status(503).json({ ready: false, error: String(error) });
    }
  });

  // Liveness probe - simple ping
  app.get('/api/health/live', (_req, res) => {
    res.json({ alive: true });
  });

  // Metrics endpoint for Prometheus (basic)
  app.get('/metrics', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const timestamp = Math.floor(Date.now() / 1000);
    
    let metrics = `# HELP process_uptime_seconds Process uptime in seconds\n`;
    metrics += `# TYPE process_uptime_seconds gauge\n`;
    metrics += `process_uptime_seconds ${uptime}\n\n`;
    
    metrics += `# HELP process_memory_bytes Process memory usage in bytes\n`;
    metrics += `# TYPE process_memory_bytes gauge\n`;
    metrics += `process_memory_bytes{type="heapUsed"} ${memory.heapUsed}\n`;
    metrics += `process_memory_bytes{type="heapTotal"} ${memory.heapTotal}\n`;
    metrics += `process_memory_bytes{type="external"} ${memory.external}\n`;
    metrics += `process_memory_bytes{type="rss"} ${memory.rss}\n\n`;
    
    metrics += `# HELP process_timestamp_seconds Server start timestamp\n`;
    metrics += `# TYPE process_timestamp_seconds gauge\n`;
    metrics += `process_timestamp_seconds ${timestamp}\n`;
    
    res.send(metrics);
  });

  app.use('/api', apiRouter);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`[Server] Family Planner backend running on port ${PORT}`);
    console.log(
      `[Security] CORS origins: ${corsOrigins.join(', ')}`
    );
    console.log('[Security] Security headers enabled');
    console.log('[Security] Rate limiting enabled');
    console.log('[Security] Input validation enabled');
  });
}

main().catch((err) => {
  console.error('[Fatal] Failed to start server:', err);
  process.exit(1);
});
