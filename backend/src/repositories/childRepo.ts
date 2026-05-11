import { getPool } from '../db';

export interface Child {
  id: string;
  parentUserId: string;
  name: string;
  dateOfBirth: Date | null;
  allergies: string[];
  dietaryRestrictions: string[];
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export const childRepo = {
  async findByParent(parentUserId: string): Promise<Child[]> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, name, date_of_birth, allergies, dietary_restrictions, avatar_url, is_active, created_at
       FROM children WHERE parent_user_id = $1 AND is_active = true ORDER BY name`,
      [parentUserId]
    );
    return rows.map(mapChild);
  },

  async findById(id: string): Promise<Child | null> {
    const { rows } = await getPool().query(
      `SELECT id, parent_user_id, name, date_of_birth, allergies, dietary_restrictions, avatar_url, is_active, created_at
       FROM children WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapChild(rows[0]) : null;
  },

  async create(data: {
    parentUserId: string;
    name: string;
    dateOfBirth?: Date;
    allergies?: string[];
    dietaryRestrictions?: string[];
  }): Promise<Child> {
    const { rows } = await getPool().query(
      `INSERT INTO children (parent_user_id, name, date_of_birth, allergies, dietary_restrictions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, parent_user_id, name, date_of_birth, allergies, dietary_restrictions, avatar_url, is_active, created_at`,
      [data.parentUserId, data.name, data.dateOfBirth || null,
       data.allergies || [], data.dietaryRestrictions || []]
    );
    return mapChild(rows[0]);
  },

  async deactivate(id: string): Promise<void> {
    await getPool().query(`UPDATE children SET is_active = false WHERE id = $1`, [id]);
  },

  async getPointBalance(childId: string): Promise<number> {
    const { rows } = await getPool().query(
      `SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = $1`,
      [childId]
    );
    return Number(rows[0].balance);
  },
};

function mapChild(row: any): Child {
  return {
    id: row.id,
    parentUserId: row.parent_user_id,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    allergies: row.allergies || [],
    dietaryRestrictions: row.dietary_restrictions || [],
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
