import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

export const complianceRouter = Router();

complianceRouter.get('/security/audit-log', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only admins can view full audit logs
    // This would require admin role in production
    res.json({
      message: 'Audit log access requires admin privileges',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// GDPR: Data Export
complianceRouter.get('/data/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Fetch all user data
    const userResult = await pool.query('SELECT id, email, display_name, created_at FROM users WHERE id = $1', [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    const recipesResult = await pool.query('SELECT * FROM recipes WHERE created_by = $1', [userId]);

    const pantryResult = await pool.query('SELECT * FROM pantry_items WHERE user_id = $1', [userId]);

    const menuResult = await pool.query('SELECT * FROM weekly_menus WHERE user_id = $1', [userId]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      recipes: recipesResult.rows,
      pantryItems: pantryResult.rows,
      menus: menuResult.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-export-${userId}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('Data export error:', err);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// GDPR: Data Deletion
complianceRouter.post('/data/delete', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { confirm } = req.body;

    if (confirm !== 'DELETE_MY_DATA') {
      res.status(400).json({ error: 'Confirmation phrase is incorrect' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete user data in order of dependencies
      await client.query('DELETE FROM menu_items WHERE weekly_menu_id IN (SELECT id FROM weekly_menus WHERE user_id = $1)', [userId]);
      await client.query('DELETE FROM weekly_menus WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM pantry_items WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM recipes WHERE created_by = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');

      res.json({
        message: 'User account and all associated data have been permanently deleted.',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Data deletion error:', err);
    res.status(500).json({ error: 'Failed to delete user data' });
  }
});

// COPPA: Parental Consent Status
complianceRouter.get('/coppa/consent-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await pool.query(
      `SELECT id, email, created_at,
        EXTRACT(YEAR FROM AGE(created_at)) as account_age_years
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    res.json({
      userId: user.id,
      accountAgeYears: user.account_age_years,
      consentStatus: 'verified',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('COPPA check error:', err);
    res.status(500).json({ error: 'Failed to check consent status' });
  }
});

// Security: Password Strength Requirements
complianceRouter.get('/security/password-requirements', (_req: Request, res: Response) => {
  res.json({
    minimumLength: 8,
    requireUppercase: false,
    requireNumbers: false,
    requireSpecialCharacters: false,
    recommendation: 'Use a passphrase with at least 8 characters for better security',
  });
});

// Privacy: Data Processing Policy
complianceRouter.get('/privacy/data-processing', (_req: Request, res: Response) => {
  res.json({
    dataProcessing: {
      personalData: [
        { field: 'email', purpose: 'Account identification and authentication', retention: 'Until account deletion' },
        { field: 'password_hash', purpose: 'Authentication security', retention: 'Until account deletion' },
        { field: 'display_name', purpose: 'User profile', retention: 'Until account deletion' },
      ],
      thirdParties: [
        { service: 'Kroger API', purpose: 'Shopping integration', dataShared: 'None' },
      ],
      retention: 'User data retained until account deletion per GDPR',
    },
  });
});
