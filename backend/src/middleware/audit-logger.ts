import { Request, Response, NextFunction } from 'express';

export interface AuditLog {
  timestamp: string;
  userId?: string;
  ip: string;
  method: string;
  path: string;
  statusCode?: number;
  action: string;
  details?: Record<string, unknown>;
}

const auditLogs: AuditLog[] = [];

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  const originalSend = res.send;
  res.send = function (data: unknown) {
    const duration = Date.now() - start;

    const log: AuditLog = {
      timestamp: new Date().toISOString(),
      userId: req.user?.userId,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      action: `${req.method} ${req.path}`,
      details: {
        duration,
        userAgent: req.get('user-agent'),
      },
    };

    // Log suspicious activities
    if (res.statusCode === 401 || res.statusCode === 403) {
      log.details!.securityEvent = 'access_denied';
    }

    if (req.path.includes('/auth') && (req.method === 'POST')) {
      log.details!.authEvent = true;
    }

    auditLogs.push(log);

    // Keep only last 10000 logs in memory
    if (auditLogs.length > 10000) {
      auditLogs.shift();
    }

    return originalSend.call(this, data);
  };

  next();
}

export function getAuditLogs(): AuditLog[] {
  return [...auditLogs];
}

export function getSecurityEvents(): AuditLog[] {
  return auditLogs.filter((log) => log.details?.securityEvent === 'access_denied');
}
