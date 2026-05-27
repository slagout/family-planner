import { Request, Response, NextFunction } from 'express';

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy - limit referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy - prevent inline scripts and restrict sources
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    [
      'geolocation=()',
      'microphone=()',
      // Allow first-party camera access for UPC scanning.
      'camera=(self)',
      'payment=()',
      'usb=()',
    ].join(', ')
  );

  // HSTS - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Remove powered-by header
  res.removeHeader('X-Powered-By');

  next();
}
