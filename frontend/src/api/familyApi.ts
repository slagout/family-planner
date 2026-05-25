import client from './client';

export interface Child {
  id: string;
  name: string;
  age: number | null;
  currentStars: number;
  assignedChores: number;
  activitySchedule: unknown[];
}

export interface Chore {
  id: string;
  parentUserId: string;
  childId: string | null;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  rewardPoints: number;
  dueDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export const childrenAPI = {
  list(): Promise<Child[]> {
    return client.get('/children').then((res) => res.data);
  },

  create(data: {
    name: string;
    dateOfBirth?: string;
    allergies?: string[];
    dietaryRestrictions?: string[];
  }): Promise<Child> {
    return client.post('/children', data).then((res) => res.data);
  },
};

export const choresAPI = {
  list(childId?: string): Promise<Chore[]> {
    const params = childId ? { childId } : {};
    return client.get('/chores', { params }).then((res) => res.data);
  },

  create(data: {
    title: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'once';
    rewardPoints?: number;
    dueDate?: string;
    childId?: string;
  }): Promise<Chore> {
    return client.post('/chores', data).then((res) => res.data);
  },
};
