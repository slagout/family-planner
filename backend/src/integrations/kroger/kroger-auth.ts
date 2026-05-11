import axios from 'axios';
import { getPool } from '../../db';

const KROGER_BASE_URL = 'https://api.kroger.com/v1';
const KROGER_TOKEN_URL = `${KROGER_BASE_URL}/connect/oauth2/token`;

export interface KrogerTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export const krogerAuth = {
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

  async exchangeCode(code: string): Promise<KrogerTokenSet> {
    const clientId = process.env.KROGER_CLIENT_ID;
    const clientSecret = process.env.KROGER_CLIENT_SECRET;
    const redirectUri = process.env.KROGER_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Kroger OAuth credentials not configured');
    }

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
    const clientId = process.env.KROGER_CLIENT_ID;
    const clientSecret = process.env.KROGER_CLIENT_SECRET;
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

  async saveTokens(userId: string, tokens: KrogerTokenSet): Promise<void> {
    // NOTE: In production, encrypt tokens with AES-256-GCM before storing
    await getPool().query(
      `INSERT INTO kroger_tokens (user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
       SET access_token = $2, refresh_token = $3, expires_at = $4, updated_at = now()`,
      [userId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt]
    );
  },

  async getValidTokens(userId: string): Promise<KrogerTokenSet | null> {
    const { rows } = await getPool().query(
      `SELECT access_token, refresh_token, expires_at FROM kroger_tokens WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) return null;

    const tokens: KrogerTokenSet = {
      accessToken: rows[0].access_token,
      refreshToken: rows[0].refresh_token,
      expiresAt: rows[0].expires_at,
    };

    if (tokens.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      const refreshed = await krogerAuth.refreshAccessToken(tokens.refreshToken);
      await krogerAuth.saveTokens(userId, refreshed);
      return refreshed;
    }

    return tokens;
  },
};
