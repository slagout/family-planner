import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { withTransaction } from '../db';
import { userRepo } from '../repositories/userRepo';

interface KeycloakTokenPayload {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  exp: number;
  iat: number;
}

let jwksCache: { keys: any[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

async function getKeycloakPublicKeys(): Promise<any[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  const keycloakUrl = process.env.KEYCLOAK_URL;
  const realm = process.env.KEYCLOAK_REALM || 'family-planner';
  if (!keycloakUrl) throw new Error('KEYCLOAK_URL environment variable is not set');

  const jwksUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`;
  const { data } = await axios.get(jwksUrl, { timeout: 5000 });
  jwksCache = { keys: data.keys, fetchedAt: now };
  return data.keys;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    id: string;
    email: string;
    displayName: string | null;
    roles: string[];
    keycloakSubject: string;
  };
}

export async function keycloakAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded.payload !== 'object') {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    const keys = await getKeycloakPublicKeys();
    const kid = decoded.header.kid;
    const signingKey = keys.find((k: any) => k.kid === kid);
    if (!signingKey) {
      res.status(401).json({ error: 'Token signing key not found' });
      return;
    }

    const pem = jwkToPem(signingKey);
    const payload = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM || 'family-planner'}`,
    }) as KeycloakTokenPayload;

    const clientId = process.env.KEYCLOAK_CLIENT_ID || 'family-planner-app';
    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.resource_access?.[clientId]?.roles || [];
    const roles = [...new Set([...realmRoles, ...clientRoles])];

    const user = await withTransaction(async (client) => {
      return userRepo.upsertFromKeycloak(client, {
        keycloakSubject: payload.sub,
        email: payload.email,
        displayName: payload.name || payload.preferred_username,
        roles,
      });
    });

    req.user = {
      userId: user.id,
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles,
      keycloakSubject: payload.sub,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token has expired' });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      console.error('[Auth] Keycloak verification error:', err.message);
      res.status(503).json({ error: 'Authentication service unavailable' });
    }
  }
}

function jwkToPem(jwk: any): string {
  const n = Buffer.from(jwk.n, 'base64url');
  const e = Buffer.from(jwk.e, 'base64url');

  function encodeLength(len: number): Buffer {
    if (len < 128) return Buffer.from([len]);
    const lenBytes = Math.ceil(len.toString(16).length / 2);
    const buf = Buffer.allocUnsafe(lenBytes + 1);
    buf[0] = 0x80 | lenBytes;
    buf.writeUIntBE(len, 1, lenBytes);
    return buf;
  }

  function encodeInteger(val: Buffer): Buffer {
    const needsPad = val[0] & 0x80 ? 1 : 0;
    const content = needsPad ? Buffer.concat([Buffer.from([0x00]), val]) : val;
    return Buffer.concat([Buffer.from([0x02]), encodeLength(content.length), content]);
  }

  const modulus = encodeInteger(n);
  const exponent = encodeInteger(e);
  const sequence = Buffer.concat([modulus, exponent]);
  const seqDer = Buffer.concat([Buffer.from([0x30]), encodeLength(sequence.length), sequence]);

  const algorithmId = Buffer.from('300d06092a864886f70d0101010500', 'hex');
  const bitString = Buffer.concat([Buffer.from([0x00]), seqDer]);
  const bitStringDer = Buffer.concat([Buffer.from([0x03]), encodeLength(bitString.length), bitString]);
  const spki = Buffer.concat([algorithmId, bitStringDer]);
  const spkiDer = Buffer.concat([Buffer.from([0x30]), encodeLength(spki.length), spki]);

  const b64 = spkiDer.toString('base64');
  const pem = `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`;
  return pem;
}
