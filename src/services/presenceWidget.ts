import { EMPTY_PRESENCE_STATE, parsePresence, type PresenceState } from './presenceState';

const STORAGE_KEY = 'campusGymPresence';
let browserSessionPresence = EMPTY_PRESENCE_STATE;

export async function getPresenceState(): Promise<PresenceState> {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return browserSessionPresence;
    browserSessionPresence = parsePresence(stored);
    return browserSessionPresence;
  } catch {
    return browserSessionPresence;
  }
}

export async function setPresenceState(isPresent: boolean): Promise<PresenceState> {
  const next: PresenceState = {
    isPresent,
    updatedAt: new Date().toISOString(),
    scope: 'this-device-demo',
  };
  const serialized = JSON.stringify(next);
  browserSessionPresence = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Keep the status for this browser session if persistent storage is unavailable.
  }
  return next;
}
