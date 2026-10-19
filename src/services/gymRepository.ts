export interface GymSession {
  identity: 'anonymous-app-profile' | 'local-account';
  email?: string | null;
  recoveryConfigured: boolean;
  checkedInAt: string | null;
  checkInExpiresAt: string | null;
  maxCheckInHours: number;
  serverTime: string;
}

export type OccupancyRange = '60m' | '3h' | '24h' | '7d';

export interface OccupancySnapshot {
  count: number;
  plannedNow: number;
  refreshedAt: string;
  source: 'self-reported-manual-check-ins';
  disclaimer: string;
  maxCheckInHours: number;
  history: {
    range: string;
    points: Array<{
      at: string;
      count: number;
    }>;
  };
}

export interface GymBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
}

export interface SharedBookingSlot {
  startsAt: string;
  endsAt: string;
  reserved: number;
  capacity: number | null;
  availablePlaces: number | null;
}

export interface GymVisit {
  id: string;
  checkedInAt: string;
  checkedOutAt: string | null;
}

export interface ExerciseLog {
  name: string;
  sets: Array<{ reps: number; weightKg: number }>;
}

export interface WorkoutLog {
  id: string;
  title: string;
  occurredAt: string;
  exercises: ExerciseLog[];
}

export interface GymAvailability {
  startAt: string;
  endAt: string;
  reserved: number;
  capacity: number | null;
  availablePlaces: number | null;
}

export interface CalendarEventItem {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  entryType: 'planned' | 'reservation';
  isMine: boolean;
  userName?: string;
  courseOfStudy?: string;
  userGoals?: string[];
}

export interface ActiveCheckInItem {
  id: string;
  checkedInAt: string;
  expiresAt: string;
  isMine: boolean;
  userName: string;
  courseOfStudy?: string;
  trainingGoals?: string[];
}

export interface CalendarDataResponse {
  events: CalendarEventItem[];
  activeCheckIns: ActiveCheckInItem[];
  serverTime: string;
}

export interface CommunityProfile {
  principalId: string;
  firstName: string;
  lastNameInitial: string;
  courseOfStudy: string;
  trainingGoals: string[];
  preferredTimes: string[];
  interests: string[];
  bio: string;
  isPublicPresence: boolean;
  updatedAt: string;
}

export interface CommunityMember {
  id: string;
  firstName: string;
  lastNameInitial: string;
  courseOfStudy: string;
  trainingGoals: string[];
  preferredTimes: string[];
  interests: string[];
  bio: string;
  isPublicPresence: boolean;
  activeNow: boolean;
  plannedNext: string | null;
  isSelf: boolean;
}

export interface TrainingPartnerRequest {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  proposedDate: string | null;
  note: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  isIncoming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GymRepository {
  getSession(): Promise<GymSession>;
  getOccupancy(range?: OccupancyRange): Promise<OccupancySnapshot>;
  setCheckedIn(checkedIn: boolean): Promise<void>;
  getBookings(from?: string, to?: string): Promise<{ slots: SharedBookingSlot[]; capacityConfigured: boolean }>;
  getMyBookings(): Promise<GymBooking[]>;
  getCalendarEvents(from?: string, to?: string): Promise<CalendarDataResponse>;
  getCommunityProfile(): Promise<CommunityProfile>;
  updateCommunityProfile(input: Partial<CommunityProfile>): Promise<CommunityProfile>;
  getCommunityMembers(): Promise<CommunityMember[]>;
  getPartnerRequests(): Promise<TrainingPartnerRequest[]>;
  sendPartnerRequest(receiverId: string, note?: string, proposedDate?: string): Promise<{ id: string }>;
  respondToPartnerRequest(id: string, status: 'accepted' | 'declined' | 'cancelled'): Promise<{ id: string; status: string }>;
  registerWithDhbw(input: {
    email: string;
    password: string;
    firstName?: string;
    lastNameInitial?: string;
    courseOfStudy?: string;
    trainingGoals?: string[];
    preferredTimes?: string[];
  }): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  getAvailability(startAt: string, durationMinutes: number): Promise<GymAvailability>;
  createBooking(input: { startsAt: string; durationMinutes: number; title?: string; entryType?: 'planned' | 'reservation' }): Promise<GymBooking>;
  deleteBooking(id: string): Promise<void>;
  getVisits(): Promise<GymVisit[]>;
  getWorkouts(): Promise<WorkoutLog[]>;
  createWorkout(input: Omit<WorkoutLog, 'id'>): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
  getWeeklyGoal(): Promise<number>;
  setWeeklyGoal(weeklySessions: number): Promise<void>;
  issueRecoveryCode(): Promise<string>;
  recoverProfile(recoveryCode: string): Promise<void>;
  deletePersonalData(): Promise<void>;
}

export class GymApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'GymApiError';
  }
}

interface FetchResponseLike {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponseLike>;
const apiBaseUrl = (import.meta.env.VITE_GYM_API_BASE_URL ?? '').replace(/\/$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createGymRepository(fetcher: FetchLike = fetch): GymRepository {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: FetchResponseLike;
    try {
      response = await fetcher(`${apiBaseUrl}${path}`, {
        ...init,
        credentials: apiBaseUrl ? 'include' : 'same-origin',
        cache: 'no-store',
        headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      });
    } catch {
      throw new GymApiError('Der Gym-Server ist gerade nicht erreichbar.', 0);
    }

    if (response.status === 204) return undefined as T;
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    if (!response.ok) {
      const message = isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : response.statusText || 'Die Anfrage ist fehlgeschlagen.';
      throw new GymApiError(message, response.status);
    }
    return payload as T;
  }

  return {
    getSession: () => request<GymSession>('/api/gym/session'),
    getOccupancy: (range: OccupancyRange = '24h') => request<OccupancySnapshot>(`/api/gym/occupancy?range=${range}`),
    async setCheckedIn(checkedIn) {
      await request(checkedIn ? '/api/gym/check-in' : '/api/gym/check-out', { method: 'POST' });
    },
    async getBookings(from, to) {
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      const queryString = query.toString();
      const suffix = queryString ? `?${queryString}` : '';
      return request(`/api/gym/bookings${suffix}`);
    },
    async getMyBookings() {
      const result = await request<{ bookings: GymBooking[] }>('/api/gym/my/bookings');
      return result.bookings;
    },
    async getCalendarEvents(from, to) {
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      return request<CalendarDataResponse>(`/api/gym/calendar/events${suffix}`);
    },
    async getCommunityProfile() {
      const result = await request<{ profile: CommunityProfile }>('/api/gym/profile/community');
      return result.profile;
    },
    async updateCommunityProfile(input) {
      const result = await request<{ profile: CommunityProfile }>('/api/gym/profile/community', {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return result.profile;
    },
    async getCommunityMembers() {
      const result = await request<{ members: CommunityMember[] }>('/api/gym/community/members');
      return result.members;
    },
    async getPartnerRequests() {
      const result = await request<{ requests: TrainingPartnerRequest[] }>('/api/gym/community/partner-requests');
      return result.requests;
    },
    async sendPartnerRequest(receiverId, note, proposedDate) {
      return request<{ id: string }>('/api/gym/community/partner-requests', {
        method: 'POST',
        body: JSON.stringify({ receiverId, note, proposedDate }),
      });
    },
    async respondToPartnerRequest(id, status) {
      return request<{ id: string; status: string }>(`/api/gym/community/partner-requests/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    async registerWithDhbw(input) {
      await request('/api/gym/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async login(email, password) {
      await request('/api/gym/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    async logout() {
      await request('/api/gym/logout', { method: 'POST' });
    },
    getAvailability(startAt, durationMinutes) {
      const query = new URLSearchParams({ startAt, durationMinutes: String(durationMinutes) });
      return request(`/api/gym/availability?${query.toString()}`);
    },
    async createBooking(input) {
      const result = await request<{ booking: GymBooking }>('/api/gym/bookings', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return result.booking;
    },
    async deleteBooking(id) {
      await request(`/api/gym/my/bookings/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async getVisits() {
      const result = await request<{ visits: GymVisit[] }>('/api/gym/visits');
      return result.visits;
    },
    async getWorkouts() {
      const result = await request<{ workouts: WorkoutLog[] }>('/api/gym/workouts');
      return result.workouts;
    },
    async createWorkout(input) {
      await request('/api/gym/workouts', { method: 'POST', body: JSON.stringify(input) });
    },
    async deleteWorkout(id) {
      await request(`/api/gym/workouts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async getWeeklyGoal() {
      const result = await request<{ weeklySessions: number }>('/api/gym/goals');
      return result.weeklySessions;
    },
    async setWeeklyGoal(weeklySessions) {
      await request('/api/gym/goals', { method: 'PUT', body: JSON.stringify({ weeklySessions }) });
    },
    async issueRecoveryCode() {
      const result = await request<{ recoveryCode: string }>('/api/gym/profile/recovery-code', { method: 'POST' });
      return result.recoveryCode;
    },
    async recoverProfile(recoveryCode) {
      await request('/api/gym/profile/recover', { method: 'POST', body: JSON.stringify({ recoveryCode }) });
    },
    async deletePersonalData() {
      await request('/api/gym/my/data', { method: 'DELETE' });
    },
  };
}

export const gymRepository = createGymRepository();


