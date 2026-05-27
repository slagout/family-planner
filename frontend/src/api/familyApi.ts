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
  assignedToGroup: boolean;
  splitType: 'equal' | 'weighted';
  createdAt: string;
}

export interface Reward {
  id: string;
  parentUserId: string;
  title: string;
  description: string | null;
  pointCost: number;
  maxRedemptions: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface RedemptionRequest {
  id: string;
  childId: string;
  rewardId: string;
  pointsSpent: number;
  status: 'pending' | 'approved' | 'fulfilled' | 'cancelled';
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface CalendarEvent {
  id: string;
  type: 'chore' | 'activity' | 'meal';
  title: string;
  date: string;
  status: 'pending' | 'completed' | 'in_progress' | 'voided';
  color: 'blue' | 'green' | 'orange' | 'grey';
  points?: number;
  frequency?: string;
}

export interface CalendarResponse {
  start: string;
  end: string;
  events: CalendarEvent[];
}

// ---------------------------------------------------------------------------
// API modules
// ---------------------------------------------------------------------------

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
    assignedToGroup?: boolean;
    splitType?: 'equal' | 'weighted';
    groupChildIds?: string[];
    groupWeights?: number[];
  }): Promise<Chore> {
    return client.post('/chores', data).then((res) => res.data);
  },
  complete(choreId: string, childId: string, notes?: string): Promise<unknown> {
    return client.post(`/chores/${choreId}/complete`, { childId, notes }).then((res) => res.data);
  },
};

export const rewardsAPI = {
  list(parentUserId?: string): Promise<Reward[]> {
    const params = parentUserId ? { parentUserId } : {};
    return client.get('/redemptions/rewards', { params }).then((res) => res.data);
  },
  create(data: { title: string; description?: string; pointCost: number; maxRedemptions?: number }): Promise<Reward> {
    return client.post('/redemptions/rewards', data).then((res) => res.data);
  },
};

export const redemptionsAPI = {
  list(childId: string): Promise<RedemptionRequest[]> {
    return client.get('/redemptions', { params: { childId } }).then((res) => res.data);
  },
  listPending(): Promise<RedemptionRequest[]> {
    return client.get('/redemptions').then((res) => res.data);
  },
  request(childId: string, rewardId: string): Promise<RedemptionRequest> {
    return client.post('/redemptions', { childId, rewardId }).then((res) => res.data);
  },
  approve(id: string, pinToken: string): Promise<RedemptionRequest> {
    return client.patch(`/redemptions/${id}/approve`, {}, {
      headers: { 'X-PIN-Session': pinToken },
    }).then((res) => res.data);
  },
  fulfill(id: string): Promise<RedemptionRequest> {
    return client.patch(`/redemptions/${id}/fulfill`).then((res) => res.data);
  },
  cancel(id: string, reason?: string): Promise<RedemptionRequest> {
    return client.patch(`/redemptions/${id}/cancel`, { reason }).then((res) => res.data);
  },
};

export const calendarAPI = {
  get(childId: string, start: string, end: string): Promise<CalendarResponse> {
    return client.get(`/calendar/${childId}`, { params: { start, end } }).then((res) => res.data);
  },
};

export const pinAPI = {
  status(): Promise<{ hasPin: boolean }> {
    return client.get('/pin/status').then((res) => res.data);
  },
  set(pin: string): Promise<void> {
    return client.post('/pin/set', { pin });
  },
  verify(pin: string): Promise<{ token: string; expiresAt: string }> {
    return client.post('/pin/verify', { pin }).then((res) => res.data);
  },
  lock(): Promise<void> {
    return client.delete('/pin/session');
  },
};
