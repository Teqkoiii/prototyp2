export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(value));
}

export function startOfLocalWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getWeeklyWorkoutCounts(workouts: Array<{ occurredAt: string }>, now = new Date()): number[] {
  const currentWeek = startOfLocalWeek(now);
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - (6 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return workouts.filter((workout) => {
      const date = new Date(workout.occurredAt);
      return date >= start && date < end;
    }).length;
  });
}

export function getThisWeekWorkouts<T extends { occurredAt: string }>(workouts: T[], now = new Date()): T[] {
  const from = startOfLocalWeek(now);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return workouts.filter((workout) => {
    const date = new Date(workout.occurredAt);
    return date >= from && date < to;
  });
}

export function calculateWorkoutVolume(workouts: Array<{ exercises: Array<{ sets: Array<{ reps: number; weightKg: number }> }> }>): number {
  return workouts.reduce((workoutTotal, workout) => workoutTotal + workout.exercises.reduce(
    (exerciseTotal, exercise) => exerciseTotal + exercise.sets.reduce((setTotal, set) => setTotal + set.reps * set.weightKg, 0), 0,
  ), 0);
}

export function getCalendarWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function formatShortDate(value: string | Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value));
}

export function formatDayOfWeek(date: Date, format: 'short' | 'long' | 'narrow' = 'short'): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: format }).format(date);
}

export function isSameDay(d1: Date | string, d2: Date | string): boolean {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function addWeeks(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount * 7);
  return result;
}

export function getDaysOfWeek(startOfWeek: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
}

