import { useEffect, useMemo, useState } from 'react';
import {
  BookmarkCheck,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Filter,
  Grid,
  Info,
  ListFilter,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import type {
  ActiveCheckInItem,
  CalendarEventItem,
  GymAvailability,
  GymSession,
  GymVisit,
  WorkoutLog,
} from '../../services/gymRepository';
import {
  addWeeks,
  calculateWorkoutVolume,
  formatDate,
  formatDateTime,
  formatDayOfWeek,
  formatShortDate,
  formatTime,
  getCalendarWeekNumber,
  getDaysOfWeek,
  isSameDay,
  startOfLocalWeek,
} from './format';
import { EmptyState, Field, InlineNotice, PageHeading, SectionTitle } from './components';

function tomorrowInputValue(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateTimeValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function Calendar({
  session,
  calendarEvents,
  activeCheckIns,
  visits,
  workouts = [],
  availability,
  online,
  busy,
  error,
  onCreateBooking,
  onDeleteBooking,
  onCheckAvailability,
  onPresence,
  onNavigate,
}: {
  session: GymSession | null;
  calendarEvents: CalendarEventItem[];
  activeCheckIns: ActiveCheckInItem[];
  visits: GymVisit[];
  workouts?: WorkoutLog[];
  availability: GymAvailability | null;
  online: boolean;
  busy: boolean;
  error: string | null;
  onCreateBooking: (input: { startsAt: string; durationMinutes: number; title?: string; entryType?: 'planned' | 'reservation' }) => void;
  onDeleteBooking: (id: string) => void;
  onCheckAvailability: (startAt: string, duration: number) => void;
  onPresence: (present: boolean) => void;
  onNavigate?: (page: 'dashboard' | 'calendar' | 'community' | 'training' | 'progress' | 'profile') => void;
}) {
  const isCheckedIn = Boolean(session?.checkedInAt);
  const [startsAt, setStartsAt] = useState(tomorrowInputValue);
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState('');
  const [entryType, setEntryType] = useState<'planned' | 'reservation'>('planned');
  const [typeFilter, setTypeFilter] = useState<'all' | 'planned' | 'reservation' | 'checked_in'>('all');

  // Weekly View State
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [weekFilter, setWeekFilter] = useState<'all' | 'mine' | 'community'>('all');

  const startsAtIso = localInputToIso(startsAt);

  // Group events into today, tomorrow, and future for list view
  const nowMs = Date.now();
  const upcomingEvents = useMemo(() => {
    return calendarEvents.filter((event) => Date.parse(event.endsAt) >= nowMs);
  }, [calendarEvents, nowMs]);

  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return upcomingEvents;
    if (typeFilter === 'checked_in') return [];
    return upcomingEvents.filter((event) => event.entryType === typeFilter);
  }, [upcomingEvents, typeFilter]);

  const history = useMemo(
    () => visits.filter((visit) => visit.checkedOutAt !== null && Date.parse(visit.checkedInAt) < Date.now()),
    [visits],
  );

  // Week View Calculations
  const startOfWeek = useMemo(() => startOfLocalWeek(currentWeekDate), [currentWeekDate]);
  const endOfWeek = useMemo(() => addWeeks(startOfWeek, 1), [startOfWeek]);
  const weekDays = useMemo(() => getDaysOfWeek(startOfWeek), [startOfWeek]);
  const kwNumber = useMemo(() => getCalendarWeekNumber(currentWeekDate), [currentWeekDate]);

  // Is current week showing the real current week?
  const isCurrentWeek = useMemo(() => {
    return isSameDay(startOfWeek, startOfLocalWeek(new Date()));
  }, [startOfWeek]);

  // Events & Workouts for the selected week
  const weekEvents = useMemo(() => {
    const fromTime = startOfWeek.getTime();
    const toTime = endOfWeek.getTime();
    return calendarEvents.filter((e) => {
      const t = new Date(e.startsAt).getTime();
      return t >= fromTime && t < toTime;
    });
  }, [calendarEvents, startOfWeek, endOfWeek]);

  const weekWorkouts = useMemo(() => {
    const fromTime = startOfWeek.getTime();
    const toTime = endOfWeek.getTime();
    return workouts.filter((w) => {
      const t = new Date(w.occurredAt).getTime();
      return t >= fromTime && t < toTime;
    });
  }, [workouts, startOfWeek, endOfWeek]);

  // Week statistics
  const weekStats = useMemo(() => {
    const myEvents = weekEvents.filter((e) => e.isMine);
    const myPlanned = myEvents.filter((e) => e.entryType === 'planned').length;
    const myReservations = myEvents.filter((e) => e.entryType === 'reservation').length;
    const completedWorkouts = weekWorkouts.length;
    const communityEvents = weekEvents.filter((e) => !e.isMine);
    const communityNames = new Set(communityEvents.map((e) => e.userName || 'Student'));

    return {
      totalMyUnits: myPlanned + myReservations + completedWorkouts,
      completedWorkouts,
      plannedUnits: myPlanned + myReservations,
      communityCount: communityNames.size,
      totalVolumeKg: calculateWorkoutVolume(weekWorkouts),
    };
  }, [weekEvents, weekWorkouts]);

  // Selected Day items breakdown
  const selectedDayEvents = useMemo(() => {
    return calendarEvents.filter((e) => isSameDay(e.startsAt, selectedDay));
  }, [calendarEvents, selectedDay]);

  const selectedDayWorkouts = useMemo(() => {
    return workouts.filter((w) => isSameDay(w.occurredAt, selectedDay));
  }, [workouts, selectedDay]);

  const mySelectedDayEvents = useMemo(() => {
    return selectedDayEvents.filter((e) => e.isMine);
  }, [selectedDayEvents]);

  const communitySelectedDayEvents = useMemo(() => {
    return selectedDayEvents.filter((e) => !e.isMine);
  }, [selectedDayEvents]);

  useEffect(() => {
    if (!startsAtIso || !online) return;
    const timer = window.setTimeout(() => onCheckAvailability(startsAtIso, duration), 250);
    return () => window.clearTimeout(timer);
  }, [startsAtIso, duration, online, onCheckAvailability]);

  const create = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startsAtIso) return;
    onCreateBooking({
      startsAt: startsAtIso,
      durationMinutes: duration,
      title: title.trim(),
      entryType,
    });
  };

  const handleSelectDayForPlanning = (day: Date) => {
    setSelectedDay(day);
    const target = new Date(day);
    target.setHours(17, 0, 0, 0);
    setStartsAt(localDateTimeValue(target));
    const formElement = document.getElementById('booking-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="GEMEINSAME ANWESENHEIT"
        title="Kalender & Trainingspläne"
        description="Gemeinsame Trainingszeiten einsehen, eigene Trainingspläne im Wochenkontext planen und live im Gym einchecken."
      />

      {error && <InlineNotice tone="error">{error}</InlineNotice>}

      {/* Live Check-In Action Bar */}
      <section className={`surface live-presence-bar ${isCheckedIn ? 'is-checked-in' : ''}`}>
        <div className="live-presence-info">
          <div className="flex items-center gap-2">
            <span className={`live-pulse-indicator ${isCheckedIn ? 'active' : ''}`} aria-hidden="true" />
            <span className="live-title">
              {isCheckedIn ? 'Du bist derzeit im Gym eingecheckt' : 'Aktuell nicht vor Ort'}
            </span>
          </div>
          <p className="live-subtitle">
            {isCheckedIn && session?.checkedInAt
              ? `Eingecheckt seit ${formatTime(session.checkedInAt)} · Endet automatisch nach ${session.maxCheckInHours} Stunden`
              : 'Aktualisiere die Auslastung für andere Studierende mit einem Klick bei deiner Ankunft.'}
          </p>
        </div>
        <div className="live-presence-action">
          <button
            type="button"
            className={`button ${isCheckedIn ? 'button-secondary' : 'button-primary'}`}
            disabled={!online || busy}
            onClick={() => onPresence(!isCheckedIn)}
          >
            {isCheckedIn ? (
              <>
                <LogOut size={16} aria-hidden="true" />
                <span>Jetzt auschecken</span>
              </>
            ) : (
              <>
                <LogIn size={16} aria-hidden="true" />
                <span>Jetzt im Gym einchecken</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Currently checked-in students (if any) */}
      {activeCheckIns.length > 0 && (
        <section className="surface active-checkins-panel">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="live-dot" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-100">
                Gerade vor Ort im Gym ({activeCheckIns.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400">Live-Anwesenheit</span>
          </div>

          <div className="active-members-chip-list">
            {activeCheckIns.map((ci) => (
              <div key={ci.id} className={`active-member-chip ${ci.isMine ? 'is-mine' : ''}`}>
                <div className="chip-avatar">{ci.userName[0]}</div>
                <div className="chip-text">
                  <span className="chip-name">
                    {ci.userName} {ci.isMine && '(Du)'}
                  </span>
                  <span className="chip-sub">Seit {formatTime(ci.checkedInAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calendar Header with View-Mode Switcher */}
      <div className="calendar-view-header">
        <div className="view-mode-tabs" role="tablist" aria-label="Kalender-Ansicht">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'week'}
            className={`view-mode-btn ${viewMode === 'week' ? 'is-active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span>Wochenansicht</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'list'}
            className={`view-mode-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <ListFilter size={16} aria-hidden="true" />
            <span>Listenansicht</span>
          </button>
        </div>

        {viewMode === 'week' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`filter-tab ${weekFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setWeekFilter('all')}
            >
              Alle Einträge
            </button>
            <button
              type="button"
              className={`filter-tab ${weekFilter === 'mine' ? 'is-active' : ''}`}
              onClick={() => setWeekFilter('mine')}
            >
              Meine Einheiten
            </button>
            <button
              type="button"
              className={`filter-tab ${weekFilter === 'community' ? 'is-active' : ''}`}
              onClick={() => setWeekFilter('community')}
            >
              Community
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: WOCHENANSICHT (WEEKLY VIEW) */}
      {viewMode === 'week' && (
        <section className="surface week-panel" aria-label="Wochenansicht Trainingskalender">
          {/* Week Toolbar: Navigation, KW Badge, and Summary Stats */}
          <div className="week-toolbar">
            <div className="week-nav-group">
              <button
                type="button"
                className="week-nav-btn"
                aria-label="Vorherige Woche"
                onClick={() => setCurrentWeekDate((prev) => addWeeks(prev, -1))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>

              <button
                type="button"
                className={`week-today-btn ${isCurrentWeek ? 'is-current' : ''}`}
                onClick={() => {
                  const now = new Date();
                  setCurrentWeekDate(now);
                  setSelectedDay(now);
                }}
              >
                Heute
              </button>

              <button
                type="button"
                className="week-nav-btn"
                aria-label="Nächste Woche"
                onClick={() => setCurrentWeekDate((prev) => addWeeks(prev, 1))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>

              <div className="week-kw-badge">
                <span>KW {kwNumber}</span>
                <small>· {formatShortDate(startOfWeek)} – {formatShortDate(addWeeks(startOfWeek, 1))}</small>
              </div>
            </div>

            {/* Quick Stats Pills for the Week */}
            <div className="week-quick-stats">
              <div className="week-stat-pill pill-planned">
                <CalendarCheck size={14} aria-hidden="true" />
                <span><strong>{weekStats.plannedUnits}</strong> geplant</span>
              </div>
              <div className="week-stat-pill pill-workout">
                <Dumbbell size={14} aria-hidden="true" />
                <span><strong>{weekStats.completedWorkouts}</strong> Workouts</span>
              </div>
              {weekStats.communityCount > 0 && (
                <div className="week-stat-pill pill-community">
                  <Users size={14} aria-hidden="true" />
                  <span><strong>{weekStats.communityCount}</strong> Studierende</span>
                </div>
              )}
            </div>
          </div>

          {/* 7-Day Grid: Monday through Sunday */}
          <div className="week-grid-container" role="grid" aria-label="Wochenübersicht Mo bis So">
            {weekDays.map((day) => {
              const dayIsToday = isSameDay(day, new Date());
              const dayIsSelected = isSameDay(day, selectedDay);

              // Events on this day
              const dayCalEvents = calendarEvents.filter((e) => isSameDay(e.startsAt, day));
              const dayWorkouts = workouts.filter((w) => isSameDay(w.occurredAt, day));

              // Apply week filter
              const filteredCalEvents = dayCalEvents.filter((e) => {
                if (weekFilter === 'mine') return e.isMine;
                if (weekFilter === 'community') return !e.isMine;
                return true;
              });

              const filteredDayWorkouts = weekFilter === 'community' ? [] : dayWorkouts;

              const totalItems = filteredCalEvents.length + filteredDayWorkouts.length;

              return (
                <div
                  key={day.toISOString()}
                  className={`week-day-col ${dayIsToday ? 'is-today' : ''} ${dayIsSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedDay(day)}
                  role="gridcell"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDay(day);
                    }
                  }}
                  aria-label={`${formatDayOfWeek(day, 'long')}, ${formatShortDate(day)}: ${totalItems} Aktivitäten`}
                >
                  {/* Day Header */}
                  <div className="week-day-header">
                    <div className="week-day-label-group">
                      <span className="week-day-name">{formatDayOfWeek(day, 'short')}</span>
                      <span className="week-day-number">{day.getDate()}</span>
                    </div>
                    {dayIsToday && <span className="week-day-today-tag">Heute</span>}
                  </div>

                  {/* Day Events Container */}
                  <div className="week-day-events-list">
                    {/* Logged Workouts for this day */}
                    {filteredDayWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="week-event-card week-card-workout"
                        title={`${workout.title} · ${workout.exercises.length} Übungen`}
                      >
                        <div className="week-event-topline">
                          <span className="week-event-badge-label">
                            <Dumbbell size={11} className="week-event-icon" aria-hidden="true" />
                            <span>Workout</span>
                          </span>
                        </div>
                        <strong className="week-event-title">{workout.title}</strong>
                        <span className="week-event-sub">
                          {workout.exercises.length} Übungen
                        </span>
                      </div>
                    ))}

                    {/* Planned Sessions & Reservations */}
                    {filteredCalEvents.map((event) => {
                      const isPlanned = event.entryType === 'planned';
                      const isReservation = event.entryType === 'reservation';

                      let cardVariant = 'week-card-community';
                      if (event.isMine) {
                        cardVariant = isPlanned ? 'week-card-planned' : 'week-card-reservation';
                      }

                      return (
                        <div
                          key={event.id}
                          className={`week-event-card ${cardVariant}`}
                          title={`${event.title} (${formatTime(event.startsAt)} - ${formatTime(event.endsAt)})`}
                        >
                          <div className="week-event-topline">
                            <span className="week-event-badge-label">
                              {isPlanned ? (
                                <CalendarClock size={11} className="week-event-icon" aria-hidden="true" />
                              ) : (
                                <BookmarkCheck size={11} className="week-event-icon" aria-hidden="true" />
                              )}
                              <span>{isPlanned ? 'Geplant' : 'Reserviert'}</span>
                            </span>
                            <span className="week-event-time">{formatTime(event.startsAt)}</span>
                          </div>
                          <strong className="week-event-title">{event.title}</strong>
                          <span className="week-event-sub">
                            {event.isMine ? 'Dein Termin' : (event.userName || 'Student')}
                          </span>
                        </div>
                      );
                    })}

                    {/* Empty Day Indicator */}
                    {totalItems === 0 && (
                      <div className="week-day-empty-placeholder">
                        <span>Kein Training</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Add Button for this day */}
                  <div className="week-day-add-action">
                    <button
                      type="button"
                      className="week-add-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDayForPlanning(day);
                      }}
                      title={`Training für ${formatDayOfWeek(day, 'long')}, ${formatShortDate(day)} planen`}
                    >
                      <Plus size={12} aria-hidden="true" />
                      <span>Planen</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Day Inspector Panel (Tages-Fokus & Detailansicht) */}
          <div className="week-day-inspector">
            <div className="inspector-header">
              <div className="inspector-date-title">
                <CalendarDays size={20} className="text-emerald-400" aria-hidden="true" />
                <h3>
                  Tagesansicht: {formatDate(selectedDay.toISOString())}
                  {isSameDay(selectedDay, new Date()) && ' (Heute)'}
                </h3>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() => handleSelectDayForPlanning(selectedDay)}
              >
                <Plus size={15} aria-hidden="true" />
                <span>Für diesen Tag planen</span>
              </button>
            </div>

            <div className="inspector-grid">
              {/* Column 1: Own Planned Sessions & Reservations */}
              <div className="inspector-section">
                <div className="inspector-section-title">
                  <span>Geplante Besuche & Reservierungen</span>
                  <span className="text-xs text-slate-400">({mySelectedDayEvents.length})</span>
                </div>

                {mySelectedDayEvents.length > 0 ? (
                  mySelectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`inspector-item-card ${ev.entryType === 'planned' ? 'is-planned' : 'is-reservation'}`}
                    >
                      <div className="inspector-item-top">
                        <strong className="inspector-item-name">{ev.title}</strong>
                        <span className={`entry-badge ${ev.entryType === 'planned' ? 'badge-planned' : 'badge-reservation'}`}>
                          {ev.entryType === 'planned' ? 'Geplant' : 'Reserviert'}
                        </span>
                      </div>
                      <div className="event-metadata">
                        <Clock3 size={12} />
                        <span>{formatTime(ev.startsAt)} – {formatTime(ev.endsAt)}</span>
                      </div>
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          className="icon-button danger-hover"
                          aria-label={`Eintrag ${ev.title} löschen`}
                          onClick={() => {
                            if (window.confirm('Diesen Kalendereintrag wirklich entfernen?')) {
                              onDeleteBooking(ev.id);
                            }
                          }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3">
                    Keine eigenen Buchungen an diesem Tag eingetragen.
                  </p>
                )}
              </div>

              {/* Column 2: Logged Workouts & Exercises */}
              <div className="inspector-section">
                <div className="inspector-section-title">
                  <span>Trainingspläne & Workouts</span>
                  <span className="text-xs text-slate-400">({selectedDayWorkouts.length})</span>
                </div>

                {selectedDayWorkouts.length > 0 ? (
                  selectedDayWorkouts.map((workout) => (
                    <div key={workout.id} className="inspector-item-card is-workout">
                      <div className="inspector-item-top">
                        <strong className="inspector-item-name">{workout.title}</strong>
                        <span className="entry-badge badge-planned">Absolviert</span>
                      </div>
                      <div className="event-metadata">
                        <Dumbbell size={12} />
                        <span>{workout.exercises.length} Übungen erfasst</span>
                      </div>

                      {/* Exercises breakdown */}
                      <div className="inspector-exercise-list">
                        {workout.exercises.map((ex, idx) => (
                          <div key={idx} className="inspector-exercise-row">
                            <span>{ex.name}</span>
                            <span>{ex.sets.length} Sätze · {ex.sets[0]?.weightKg ?? 0} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-2">
                    <p className="text-xs text-slate-400 mb-2">
                      Noch keine Workout-Aufzeichnungen für diesen Tag vorhanden.
                    </p>
                    {onNavigate && (
                      <button
                        type="button"
                        className="text-action"
                        onClick={() => onNavigate('training')}
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>Im Training-Bereich erfassen</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Column 3: Campus Community Activity */}
              <div className="inspector-section">
                <div className="inspector-section-title">
                  <span>Campus-Community vor Ort</span>
                  <span className="text-xs text-slate-400">({communitySelectedDayEvents.length})</span>
                </div>

                {communitySelectedDayEvents.length > 0 ? (
                  communitySelectedDayEvents.map((ev) => (
                    <div key={ev.id} className="inspector-item-card is-community">
                      <div className="inspector-item-top">
                        <strong className="inspector-item-name">
                          {ev.userName || 'DHBW Student'}
                        </strong>
                        <span className="text-xs text-slate-400">
                          {formatTime(ev.startsAt)} – {formatTime(ev.endsAt)}
                        </span>
                      </div>
                      {ev.courseOfStudy && (
                        <p className="text-xs text-slate-400">
                          Studiengang: {ev.courseOfStudy}
                        </p>
                      )}
                      {ev.title && (
                        <p className="text-xs text-slate-300">
                          Fokus: {ev.title}
                        </p>
                      )}
                      {ev.userGoals && ev.userGoals.length > 0 && (
                        <div className="event-goals-row mt-1">
                          {ev.userGoals.map((g) => (
                            <span key={g} className="micro-tag">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3">
                    Keine weiteren Studierenden mit öffentlicher Sichtbarkeit für diesen Tag eingetragen.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Booking Form and List / Calendar Panels */}
      <div className="calendar-grid">
        {/* Booking Form */}
        <section id="booking-form-section" className="surface calendar-booking-form">
          <SectionTitle title="Trainingszeit eintragen" />
          <form onSubmit={create} className="stack-form">
            <Field label="Art des Eintrags">
              <div className="entry-type-selector" role="radiogroup">
                <button
                  type="button"
                  className={`entry-type-btn ${entryType === 'planned' ? 'is-active type-planned' : ''}`}
                  onClick={() => setEntryType('planned')}
                >
                  <CalendarClock size={16} aria-hidden="true" />
                  <span>Geplante Anwesenheit</span>
                </button>
                <button
                  type="button"
                  className={`entry-type-btn ${entryType === 'reservation' ? 'is-active type-reservation' : ''}`}
                  onClick={() => setEntryType('reservation')}
                >
                  <BookmarkCheck size={16} aria-hidden="true" />
                  <span>Feste Reservierung</span>
                </button>
              </div>
            </Field>

            <Field label="Datum und Uhrzeit">
              <input
                className="text-input"
                type="datetime-local"
                value={startsAt}
                min={localDateTimeValue(new Date())}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </Field>

            <Field label="Dauer">
              <select
                className="text-input"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                <option value={30}>30 Minuten</option>
                <option value={60}>1 Stunde</option>
                <option value={90}>1,5 Stunden (Standard)</option>
                <option value={120}>2 Stunden</option>
              </select>
            </Field>

            <Field label="Schwerpunkt / Titel (optional)">
              <input
                className="text-input"
                maxLength={80}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="z. B. Push-Training / Brust & Trizeps"
              />
            </Field>

            {availability && (
              <InlineNotice>
                {availability.reserved === 0
                  ? 'In diesem Zeitraum sind noch keine weiteren Studierenden eingetragen.'
                  : `${availability.reserved} weitere Studierende in diesem Zeitfenster geplant. Du kannst dich jederzeit eintragen (keine Beschränkung).`}
              </InlineNotice>
            )}

            <button
              className="button button-primary full-width"
              type="submit"
              disabled={!online || busy}
            >
              <CalendarCheck size={17} aria-hidden="true" />
              <span>
                {entryType === 'planned' ? 'Anwesenheit ankündigen' : 'Trainingszeit reservieren'}
              </span>
            </button>
            <p className="field-hint">
              Freiwillige Zeitfenster-Angabe · Dient der Community-Transparenz ohne Schrankensperren.
            </p>
          </form>
        </section>

        {/* Shared Calendar Feed (LIST VIEW or Side Overview) */}
        <section className="surface calendar-list-panel">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <SectionTitle title="Gemeinsamer Trainingskalender" />
            {/* Filter buttons */}
            <div className="calendar-type-filters">
              <button
                type="button"
                className={`filter-tab ${typeFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                Alle ({upcomingEvents.length})
              </button>
              <button
                type="button"
                className={`filter-tab ${typeFilter === 'planned' ? 'is-active' : ''}`}
                onClick={() => setTypeFilter('planned')}
              >
                Geplant
              </button>
              <button
                type="button"
                className={`filter-tab ${typeFilter === 'reservation' ? 'is-active' : ''}`}
                onClick={() => setTypeFilter('reservation')}
              >
                Reserviert
              </button>
            </div>
          </div>

          <p className="muted-copy section-intro">
            Übersicht aller anstehenden Einträge. Namen werden nur angezeigt, wenn Studierende die
            Sichtbarkeit aktiviert haben.
          </p>

          {filteredEvents.length ? (
            <ul className="event-list">
              {filteredEvents.map((event) => {
                const isPlanned = event.entryType === 'planned';
                return (
                  <li
                    key={event.id}
                    className={`event-row calendar-event-card ${isPlanned ? 'border-planned' : 'border-reservation'} ${
                      event.isMine ? 'is-my-event' : ''
                    }`}
                  >
                    <span
                      className={`event-date-icon ${isPlanned ? 'icon-planned' : 'icon-reservation'}`}
                    >
                      {isPlanned ? (
                        <CalendarClock size={17} aria-hidden="true" />
                      ) : (
                        <BookmarkCheck size={17} aria-hidden="true" />
                      )}
                    </span>

                    <div className="event-content">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong>{event.title}</strong>
                        <span className={`entry-badge ${isPlanned ? 'badge-planned' : 'badge-reservation'}`}>
                          {isPlanned ? 'Geplant' : 'Reserviert'}
                        </span>
                        {event.isMine && <span className="self-tag">Dein Eintrag</span>}
                      </div>

                      <div className="event-metadata">
                        <span className="event-time">
                          {formatDateTime(event.startsAt)} – {formatTime(event.endsAt)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="event-user">
                          <User size={13} className="inline mr-1 opacity-70" />
                          {event.userName || 'DHBW Student'}
                          {event.courseOfStudy && ` (${event.courseOfStudy})`}
                        </span>
                      </div>

                      {event.userGoals && event.userGoals.length > 0 && (
                        <div className="event-goals-row">
                          {event.userGoals.slice(0, 2).map((g) => (
                            <span key={g} className="micro-tag">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {event.isMine && (
                      <button
                        type="button"
                        className="icon-button danger-hover"
                        aria-label={`Eintrag ${event.title} stornieren`}
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm('Diesen Kalendereintrag wirklich entfernen?')) {
                            onDeleteBooking(event.id);
                          }
                        }}
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="Keine anstehenden Einträge"
              description="Für diesen Filter liegen aktuell keine geplanten Trainingszeiten vor. Trage deine eigene Zeit ein!"
            />
          )}
        </section>
      </div>

      {/* History Grid */}
      <div className="calendar-grid calendar-lower-grid">
        <section className="surface calendar-list-panel">
          <SectionTitle title="Vergangene eigene Besuche" />
          <p className="muted-copy section-intro">
            Historie deiner manuell gemeldeten Trainingseinheiten (90 Tage Aufbewahrung).
          </p>
          {history.length ? (
            <ul className="event-list">
              {history.slice(0, 6).map((visit) => (
                <li key={visit.id} className="event-row">
                  <span className="event-date-icon">
                    <Clock3 size={17} aria-hidden="true" />
                  </span>
                  <div className="event-content">
                    <strong>{formatDate(visit.checkedInAt)}</strong>
                    <span>
                      {formatTime(visit.checkedInAt)}
                      {visit.checkedOutAt ? ` – ${formatTime(visit.checkedOutAt)}` : ' · Offen'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-copy">Nach deinem ersten Check-in findest du deine Besuche hier.</p>
          )}
        </section>
      </div>
    </>
  );
}
