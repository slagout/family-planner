import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { krogerAuth } from '../integrations/kroger/kroger-auth';
import { requireAuth } from '../middleware/auth';
import { getPool } from '../db';

export const krogerRouter = Router();

// ---------------------------------------------------------------------------
// OAuth state store — maps CSRF state token → { userId, expiresAt }
// An in-memory store is acceptable here; a distributed cache (Redis) would be
// required for multi-replica deployments.
// ---------------------------------------------------------------------------
const pendingStates = new Map<string, { userId: string; expiresAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1_000; // 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingStates) {
    if (val.expiresAt < now) pendingStates.delete(key);
  }
}, 60_000).unref();

// ---------------------------------------------------------------------------
// GET /api/kroger/authorize
// Initiates the Kroger OAuth2 flow. Requires a valid JWT session so we can
// bind the OAuth state to the authenticated user before the redirect.
// ---------------------------------------------------------------------------
krogerRouter.get('/authorize', requireAuth, (req: Request, res: Response): void => {
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, { userId: req.user!.userId, expiresAt: Date.now() + STATE_TTL_MS });

  try {
    const redirectUrl = krogerAuth.getAuthorizationUrl(state);
    res.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kroger OAuth not configured';
    console.error('[Kroger] Authorization URL error:', message);
    res.status(503).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/kroger/callback
// Handles the OAuth2 callback from Kroger.
// Validates CSRF state, exchanges the authorization code for tokens, and
// persists tokens to the database via krogerAuth.saveTokens().
// Returns 400 if `code` is absent (QA probe will receive this, not a generic 404).
// ---------------------------------------------------------------------------
krogerRouter.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error: oauthError } = req.query as Record<string, string | undefined>;

  // Kroger may return an error param if the user denies access
  if (oauthError) {
    res.status(400).json({ error: `Kroger authorization denied: ${oauthError}` });
    return;
  }

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  if (!state || !pendingStates.has(state)) {
    res.status(400).json({ error: 'Invalid or expired OAuth state — please restart the authorization flow' });
    return;
  }

  const { userId } = pendingStates.get(state)!;
  pendingStates.delete(state);

  try {
    const tokens = await krogerAuth.exchangeCode(code);
    await krogerAuth.saveTokens(userId, tokens);
    console.log(`[Kroger] Tokens saved for user ${userId}`);
    res.json({ success: true, message: 'Kroger account linked successfully' });
  } catch (err) {
    console.error('[Kroger] Callback token exchange error:', err);
    res.status(502).json({ error: 'Failed to exchange Kroger authorization code' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/kroger/status
// Returns whether the authenticated user has a linked Kroger account.
// ---------------------------------------------------------------------------
krogerRouter.get('/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tokens = await krogerAuth.getValidTokens(req.user!.userId);
    res.json({ linked: tokens !== null });
  } catch (err) {
    console.error('[Kroger] Status check error:', err);
    res.status(500).json({ error: 'Failed to check Kroger link status' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/kroger/disconnect
// Removes Kroger tokens for the authenticated user, unlinking the account.
// ---------------------------------------------------------------------------
krogerRouter.delete('/disconnect', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await getPool().query('DELETE FROM kroger_tokens WHERE user_id = $1', [req.user!.userId]);
    res.json({ success: true, message: 'Kroger account unlinked' });
  } catch (err) {
    console.error('[Kroger] Disconnect error:', err);
    res.status(500).json({ error: 'Failed to unlink Kroger account' });
  }
});
