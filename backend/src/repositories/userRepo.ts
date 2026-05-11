import { PoolClient } from 'pg';
import { getPool } from '../db';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  keycloakSubject: string | null;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
}

export const userRepo = {
  async findById(id: string): Promise<User | null> {
    const { rows } = await getPool().query(
      `SELECT id, email, display_name, keycloak_subject, roles, is_active, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await getPool().query(
      `SELECT id, email, display_name, keycloak_subject, roles, is_active, created_at
       FROM users WHERE email = $1`,
      [email]
    );
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async findByKeycloakSubject(subject: string): Promise<User | null> {
    const { rows } = await getPool().query(
      `SELECT u.id, u.email, u.display_name, u.keycloak_subject, u.roles, u.is_active, u.created_at
       FROM users u
       JOIN keycloak_users ku ON ku.user_id = u.id
       WHERE ku.keycloak_subject = $1`,
      [subject]
    );
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async upsertFromKeycloak(client: PoolClient, data: {
    keycloakSubject: string;
    email: string;
    displayName?: string;
    roles: string[];
  }): Promise<User> {
    const { rows: kuRows } = await client.query(
      `SELECT user_id FROM keycloak_users WHERE keycloak_subject = $1`,
      [data.keycloakSubject]
    );

    let userId: string;
    if (kuRows.length > 0) {
      userId = kuRows[0].user_id;
      await client.query(
        `UPDATE users SET email = $1, display_name = $2, roles = $3 WHERE id = $4`,
        [data.email, data.displayName || null, data.roles, userId]
      );
      await client.query(
        `UPDATE keycloak_users SET email = $1, roles = $2, synced_at = now() WHERE keycloak_subject = $3`,
        [data.email, data.roles, data.keycloakSubject]
      );
    } else {
      const { rows: uRows } = await client.query(
        `INSERT INTO users (email, display_name, keycloak_subject, roles)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET keycloak_subject = $3, roles = $4, display_name = $2
         RETURNING id`,
        [data.email, data.displayName || null, data.keycloakSubject, data.roles]
      );
      userId = uRows[0].id;
      await client.query(
        `INSERT INTO keycloak_users (keycloak_subject, user_id, email, roles)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (keycloak_subject) DO UPDATE SET user_id = $2, email = $3, roles = $4, synced_at = now()`,
        [data.keycloakSubject, userId, data.email, data.roles]
      );
    }

    const user = await userRepo.findById(userId);
    if (!user) throw new Error(`User ${userId} not found after upsert`);
    return user;
  },
};

function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    keycloakSubject: row.keycloak_subject,
    roles: row.roles || [],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
