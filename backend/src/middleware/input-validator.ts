import { Request, Response, NextFunction } from 'express';

const SUSPICIOUS_PATTERNS = [
  /(\$or|\$and|\$where|\$regex)/i, // NoSQL injection
  /<script|javascript:|on\w+\s*=/i, // XSS
  /--|\;|\*|\/\*/i, // SQL injection attempts
];

export function validateInput(req: Request, res: Response, next: NextFunction): void {
  const checkValue = (val: unknown): boolean => {
    if (typeof val === 'string') {
      return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(val));
    }
    if (typeof val === 'object' && val !== null) {
      return Object.values(val).some((v) => checkValue(v));
    }
    return false;
  };

  // Check body
  if (req.body && checkValue(req.body)) {
    res.status(400).json({ error: 'Invalid input: suspicious content detected' });
    return;
  }

  // Check query parameters
  if (req.query && checkValue(req.query)) {
    res.status(400).json({ error: 'Invalid input: suspicious content detected' });
    return;
  }

  // Check URL parameters
  if (req.params && checkValue(req.params)) {
    res.status(400).json({ error: 'Invalid input: suspicious content detected' });
    return;
  }

  next();
}

export function sanitizeOutput(data: unknown): unknown {
  if (typeof data === 'string') {
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeOutput);
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      sanitized[key] = sanitizeOutput(val);
    }
    return sanitized;
  }
  return data;
}
