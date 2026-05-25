import axios from 'axios';
import { getPool } from '../../db';
import { encrypt, decrypt } from '../../utils/encryption';

const KROGER_BASE_URL = process.env.KROGER_API_BASE_URL || 'https://api-ce.kroger.com/v1';
const KROGER_TOKEN_URL = `${KROGER_BASE_URL}/connect/oauth2/token`;

export interface KrogerTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/** Cached ClientContext token for Products API (client_credentials, scope: product.compact) */
let clientCredentialsCache: { accessToken: string; expiresAt: number } | null = null;

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('KROGER_CLIENT_ID and KROGER_CLIENT_SECRET must be set');
  }
  return { clientId, clientSecret };
}

export const krogerAuth = {
  /**
   * Builds the Kroger Authorization Code URL (CustomerContext).
   * Scope includes cart.basic:write and profile.compact for user-level operations.
   */
  getAuthorizationUrl(state: string): string {
    const clientId = process.env.KROGER_CLIENT_ID;
    const redirectUri = process.env.KROGER_REDIRECT_URI;
    if (!clientId || !redirectUri) throw new Error('KROGER_CLIENT_ID and KROGER_REDIRECT_URI must be set');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'product.compact cart.basic:write profile.compact',
      state,
    });
    return `${KROGER_BASE_URL}/connect/oauth2/authorize?${params}`;
  },

  /**
   * Exchanges an authorization code for tokens (CustomerContext – Authorization Code Grant).
   */
  async exchangeCode(code: string): Promise<KrogerTokenSet> {
    const { clientId, clientSecret } = getCredentials();
    const redirectUri = process.env.KROGER_REDIRECT_URI;
    if (!redirectUri) throw new Error('KROGER_REDIRECT_URI must be set');

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data } = await axios.post(
      KROGER_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<KrogerTokenSet> {
    const { clientId, clientSecret } = getCredentials();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const { data } = await axios.post(
      KROGER_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  /**
   * Persists CustomerContext tokens to the database, encrypted with AES-256-GCM.
   * BLOCKER-001: Resolved — tokens are never stored in plaintext.
   */
  async saveTokens(userId: string, tokens: KrogerTokenSet): Promise<void> {
    const encryptedAccess = encrypt(tokens.accessToken);
    const encryptedRefresh = encrypt(tokens.refreshToken);

    await getPool().query(
      `INSERT INTO kroger_tokens (user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
       SET access_token = $2, refresh_token = $3, expires_at = $4, updated_at = now()`,
      [userId, encryptedAccess, encryptedRefresh, tokens.expiresAt]
    );
  },

  /**
   * Retrieves and (if needed) refreshes the CustomerContext tokens for a user.
   * Tokens are decrypted from the database before being returned.
   */
  async getValidTokens(userId: string): Promise<KrogerTokenSet | null> {
    const { rows } = await getPool().query(
      `SELECT access_token, refresh_token, expires_at FROM kroger_tokens WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) return null;

    const tokens: KrogerTokenSet = {
      accessToken: decrypt(rows[0].access_token),
      refreshToken: decrypt(rows[0].refresh_token),
      expiresAt: rows[0].expires_at,
    };

    if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      const refreshed = await krogerAuth.refreshAccessToken(tokens.refreshToken);
      await krogerAuth.saveTokens(userId, refreshed);
      return refreshed;
    }

    return tokens;
  },

  /**
   * Obtains a ClientContext access token via client_credentials grant.
   * Used for Products API (scope: product.compact) — no user context required.
   * Token is cached in-memory until 60 s before expiry.
   */
  async getClientCredentialsToken(): Promise<string> {
    if (clientCredentialsCache && clientCredentialsCache.expiresAt > Date.now() + 60_000) {
      return clientCredentialsCache.accessToken;
    }

    const { clientId, clientSecret } = getCredentials();
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const { data } = await axios.post(
      KROGER_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'product.compact',
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    clientCredentialsCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return clientCredentialsCache.accessToken;
  },
};
