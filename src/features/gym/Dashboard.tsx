import { useCallback, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  LogIn,
  LogOut,
  PartyPopper,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GymBooking, GymSession, OccupancySnapshot, OccupancyRange, WorkoutLog } from '../../services/gymRepository';
import { calculateWorkoutVolume, formatDateTime, formatTime, getThisWeekWorkouts } from './format';
import { InlineNotice, PageHeading, SectionTitle, type GymPage } from './components';

const CONFETTI_PARTICLES = [
  { id: 1, tx: '-60px', ty: '-45px', rot: '140deg', bg: '#fbbf24', size: '8px', radius: '2px', delay: '0.04s' },
  { id: 2, tx: '55px', ty: '-50px', rot: '-120deg', bg: '#34d399', size: '9px', radius: '50%', delay: '0.1s' },
  { id: 3, tx: '-80px', ty: '-15px', rot: '90deg', bg: '#38bdf8', size: '7px', radius: '2px', delay: '0.16s' },
  { id: 4, tx: '75px', ty: '-20px', rot: '-80deg', bg: '#f43f5e', size: '8px', radius: '3px', delay: '0.08s' },
  { id: 5, tx: '-35px', ty: '-65px', rot: '210deg', bg: '#a78bfa', size: '9px', radius: '50%', delay: '0.2s' },
  { id: 6, tx: '30px', ty: '-68px', rot: '-190deg', bg: '#facc15', size: '7px', radius: '2px', delay: '0.14s' },
  { id: 7, tx: '-95px', ty: '12px', rot: '160deg', bg: '#10b981', size: '8px', radius: '50%', delay: '0.22s' },
  { id: 8, tx: '90px', ty: '10px', rot: '-140deg', bg: '#fb923c', size: '9px', radius: '2px', delay: '0.12s' },
  { id: 9, tx: '-18px', ty: '-75px', rot: '180deg', bg: '#ec4899', size: '7px', radius: '50%', delay: '0.18s' },
  { id: 10, tx: '15px', ty: '-76px', rot: '-170deg', bg: '#6ee7b7', size: '8px', radius: '2px', delay: '0.26s' },
  { id: 11, tx: '-50px', ty: '28px', rot: '75deg', bg: '#fef08a', size: '9px', radius: '50%', delay: '0.28s' },
  { id: 12, tx: '60px', ty: '25px', rot: '-95deg', bg: '#67e8f9', size: '7px', radius: '2px', delay: '0.15s' },
];

export function Dashboard({
  session,
  occupancy,
  occupancyRange,
  onOccupancyRangeChange,
  bookings,
  workouts,
  weeklyGoal = 3,
  online,
  busy,
  error,
  onPresence,
  onNavigate,
}: {
  session: GymSession | null;
  occupancy: OccupancySnapshot | null;
  occupancyRange: OccupancyRange;
  onOccupancyRangeChange: (range: OccupancyRange) => void;
  bookings: GymBooking[];
  workouts: WorkoutLog[];
  weeklyGoal?: number;
  online: boolean;
  busy: boolean;
  error: string | null;
  onPresence: (present: boolean) => void;
  onNavigate: (page: GymPage) => void;
}) {
  const [celebrateBurstKey, setCelebrateBurstKey] = useState(0);
  const [previewCelebration, setPreviewCelebration] = useState(false);

  const checkedIn = Boolean(session?.checkedInAt);
  const nextBooking = bookings.find((booking) => Date.parse(booking.startsAt) > Date.now());
  const weekWorkouts = getThisWeekWorkouts(workouts);
  const weeklyVolume = calculateWorkoutVolume(weekWorkouts);

  const effectiveWorkoutsCount = previewCelebration ? Math.max(weeklyGoal, 3) : weekWorkouts.length;
  const isGoalReached = weeklyGoal > 0 && effectiveWorkoutsCount >= weeklyGoal;
  const progressPercent = weeklyGoal > 0 ? Math.min(100, Math.round((effectiveWorkoutsCount / weeklyGoal) * 100)) : 100;
  const remaining = Math.max(0, weeklyGoal - effectiveWorkoutsCount);
  const isExceeded = effectiveWorkoutsCount > weeklyGoal;

  const triggerCelebration = useCallback(() => {
    setCelebrateBurstKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <PageHeading
        eyebrow="DHBW GYM HUB"
        title="Dein Gym, auf einen Blick"
        description="Belegung, Trainingsplanung und dein persönlicher Fortschritt."
      />

      {error && <InlineNotice tone="error">{error}</InlineNotice>}

      <section className="dashboard-feature-grid" aria-label="Aktuelle Gym-Informationen">
        <article className="surface occupancy-panel">
          <div className="panel-topline">
            <span className="icon-badge"><Users size={18} aria-hidden="true" /></span>
            <span className={`connection-state ${online ? 'is-online' : ''}`}>
              <span aria-hidden="true" />{online ? 'Backend verbunden' : 'Keine Verbindung'}
            </span>
          </div>
          <p className="panel-label">Aktuell eingecheckt</p>
          {online && occupancy ? (
            <p className="occupancy-number" aria-live="polite">
              {occupancy.count}<span> Personen</span>
            </p>
          ) : (
            <p className="occupancy-unavailable">{online ? 'Wird geladen …' : 'Gerade nicht verfügbar'}</p>
          )}
          <p className="muted-copy">
            {occupancy
              ? `Aktualisiert ${formatTime(occupancy.refreshedAt)} · manuelle Meldungen`
              : 'Die Zahl stammt aus Check-ins in dieser App.'}
          </p>
          <div className="source-note">Nicht mit dem DHBW-Türsystem verbunden</div>
        </article>

        <article className={`surface presence-panel ${checkedIn ? 'is-present' : ''}`}>
          <div className="panel-topline">
            <span className="icon-badge">
              {checkedIn ? <Check size={18} aria-hidden="true" /> : <Clock3 size={18} aria-hidden="true" />}
            </span>
            <span className="panel-label">Dein Status</span>
          </div>
          <h2>{checkedIn ? 'Du bist eingecheckt' : 'Noch nicht eingecheckt'}</h2>
          <p className="muted-copy">
            {checkedIn && session?.checkedInAt
              ? `Seit ${formatTime(session.checkedInAt)} · endet automatisch nach ${session.maxCheckInHours} Stunden`
              : 'Mit einem Tipp meldest du dich in der gemeinsamen Belegung an.'}
          </p>
          <button
            type="button"
            className={`button ${checkedIn ? 'button-secondary' : 'button-primary'} presence-button`}
            disabled={!online || busy}
            onClick={() => onPresence(!checkedIn)}
          >
            {checkedIn ? (
              <><LogOut size={17} aria-hidden="true" />Ich gehe</>
            ) : (
              <><LogIn size={17} aria-hidden="true" />Ich bin drin</>
            )}
          </button>
          {!online && <p className="field-hint">Check-in ist verfügbar, sobald die Verbindung wiederhergestellt ist.</p>}
        </article>
      </section>

      <section className="surface occupancy-history-panel" aria-label="Auslastungsverlauf">
        <div className="history-heading">
          <div>
            <p className="panel-label">STUDIO-AUSLASTUNG</p>
            <h2>Gemeldeter Verlauf</h2>
          </div>
          <div className="history-range-controls" role="group" aria-label="Zeitraum des Auslastungsverlaufs">
            {([
              ['60m', '60 Min.'],
              ['3h', '3 Std.'],
              ['24h', '24 Std.'],
              ['7d', '7 Tage'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`history-range-button ${occupancyRange === value ? 'is-active' : ''}`}
                aria-pressed={occupancyRange === value}
                onClick={() => onOccupancyRangeChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="muted-copy">
          Anzahl aktiver Check-ins in dieser App. Die Werte zeigen keine verifizierte Besucherzahl.
        </p>

        {occupancy?.history?.points?.length ? (
          <div className="occupancy-chart">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={occupancy.history.points}
                margin={{ top: 12, right: 12, left: -18, bottom: 4 }}
              >
                <CartesianGrid stroke="var(--gym-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="at"
                  tickFormatter={(value) => {
                    const date = new Date(String(value));
                    if (occupancyRange === '7d') {
                      return date.toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                      });
                    }
                    if (occupancyRange === '24h') {
                      return date.toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    }
                    return formatTime(String(value));
                  }}
                  tick={{ fill: 'var(--gym-muted)', fontSize: 11 }}
                  minTickGap={28}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  width={38}
                  tick={{ fill: 'var(--gym-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(String(value));
                    if (occupancyRange === '24h' || occupancyRange === '7d') {
                      return date.toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    }
                    return `Uhrzeit: ${formatTime(String(value))}`;
                  }}
                  formatter={(value) => [Number(value), 'Check-ins']}
                  contentStyle={{
                    background: 'var(--gym-surface)',
                    border: '1px solid var(--gym-border)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Check-ins"
                  stroke="var(--gym-accent)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted-copy history-empty">
            Noch nicht genügend Verlaufsdaten vorhanden. Der Verlauf füllt sich mit der Zeit.
          </p>
        )}

        {occupancy && (
          <div className="occupancy-summary">
            <div>
              <span>Aktive Check-ins</span>
              <strong>{occupancy.count}</strong>
            </div>
            <div>
              <span>Aktuell geplante Reservierungen</span>
              <strong>{occupancy.plannedNow}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-secondary-grid" aria-label="Deine nächsten Aktivitäten">
        <article className="surface compact-panel">
          <SectionTitle
            title="Nächste Trainingseinheit"
            action={
              <button
                type="button"
                className="text-action"
                onClick={() => onNavigate('calendar')}
              >
                Kalender <ArrowRight size={15} aria-hidden="true" />
              </button>
            }
          />
          {nextBooking ? (
            <div className="next-booking">
              <span className="date-marker">
                {new Date(nextBooking.startsAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
              </span>
              <div>
                <strong>{nextBooking.title || 'Training im Gym'}</strong>
                <p>{formatDateTime(nextBooking.startsAt)} · bis {formatTime(nextBooking.endsAt)}</p>
              </div>
            </div>
          ) : (
            <p className="muted-copy">Noch nichts geplant. Reserviere dir eine Trainingszeit.</p>
          )}
        </article>

        <article
          className={`surface compact-panel progress-glance ${isGoalReached ? 'is-goal-reached' : ''}`}
          aria-label="Wöchentliches Trainingsziel und Fortschritt"
        >
          {isGoalReached && (
            <div key={celebrateBurstKey} className="goal-confetti-container" aria-hidden="true">
              {CONFETTI_PARTICLES.map((p) => (
                <span
                  key={p.id}
                  className="goal-confetti-particle"
                  style={{
                    '--tx': p.tx,
                    '--ty': p.ty,
                    '--rot': p.rot,
                    '--bg': p.bg,
                    '--size': p.size,
                    '--radius': p.radius,
                    '--delay': p.delay,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          <div className="progress-glance-header">
            <SectionTitle
              title="Wochenziel & Fortschritt"
              action={
                <button
                  type="button"
                  className="text-action"
                  onClick={() => onNavigate('progress')}
                >
                  Fortschritt <ArrowRight size={15} aria-hidden="true" />
                </button>
              }
            />
          </div>

          {isGoalReached ? (
            <div className="goal-reached-hero" key={`hero-${celebrateBurstKey}`}>
              <div className="goal-badge-row">
                <div className="goal-trophy-wrapper">
                  <span className="goal-trophy-pulse-ring" aria-hidden="true" />
                  <Trophy size={20} className="trophy-bounce-icon" aria-hidden="true" />
                </div>
                <div className="goal-achievement-info">
                  <div className="goal-reached-pill">
                    <Sparkles size={13} className="sparkle-icon" aria-hidden="true" />
                    <span>Wochenziel erreicht!</span>
                    <Sparkles size={13} className="sparkle-icon" aria-hidden="true" />
                  </div>
                  <p className="goal-achievement-copy">
                    {isExceeded
                      ? `🔥 Überragend! ${effectiveWorkoutsCount} von ${weeklyGoal} Einheiten geschafft (+${effectiveWorkoutsCount - weeklyGoal} Bonus!)`
                      : `🎉 Perfekt! ${effectiveWorkoutsCount} von ${weeklyGoal} Einheiten erfolgreich absolviert.`}
                  </p>
                </div>
              </div>

              {/* Shimmering Animated Progress Bar */}
              <div className="goal-progress-wrap">
                <div
                  className="goal-progress-track is-achieved"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="goal-progress-fill is-achieved"
                    style={{ '--target-width': `${progressPercent}%` } as React.CSSProperties}
                  >
                    <span className="goal-shimmer-sheen" aria-hidden="true" />
                  </div>
                </div>

                {/* Step dots */}
                <div className="goal-step-dots" aria-hidden="true">
                  {Array.from({ length: Math.min(6, weeklyGoal) }).map((_, index) => (
                    <span key={index} className="goal-step-dot is-completed">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  ))}
                  {isExceeded && (
                    <span className="goal-step-dot is-bonus" title="Bonus Einheit">
                      <Flame size={12} />
                    </span>
                  )}
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="goal-footer-row">
                <div className="glance-stats">
                  <div>
                    <strong>{effectiveWorkoutsCount} <small>/ {weeklyGoal}</small></strong>
                    <span>Einheiten</span>
                  </div>
                  <div>
                    <strong>{Math.round(weeklyVolume).toLocaleString('de-DE')}<small> kg</small></strong>
                    <span>Volumen</span>
                  </div>
                </div>

                <div className="goal-actions-group">
                  <button
                    type="button"
                    className="goal-celebrate-btn"
                    onClick={triggerCelebration}
                    title="Feier-Animation erneut abspielen"
                  >
                    <PartyPopper size={14} aria-hidden="true" />
                    <span>Jubeln!</span>
                  </button>
                  {previewCelebration && (
                    <button
                      type="button"
                      className="goal-preview-btn is-active"
                      onClick={() => setPreviewCelebration(false)}
                      title="Vorschau beenden"
                    >
                      Vorschau aus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="goal-pending-hero">
              <div className="goal-badge-row">
                <div className="goal-icon-wrapper">
                  <Dumbbell size={19} aria-hidden="true" />
                </div>
                <div className="goal-achievement-info">
                  <div className="goal-pending-pill">
                    <span>Noch {remaining} {remaining === 1 ? 'Einheit' : 'Einheiten'} bis zum Ziel</span>
                  </div>
                  <p className="goal-achievement-copy">
                    Wochenziel: {effectiveWorkoutsCount} von {weeklyGoal} Trainings absolviert
                  </p>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="goal-progress-wrap">
                <div
                  className="goal-progress-track"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="goal-progress-fill"
                    style={{
                      width: `${progressPercent}%`,
                      '--target-width': `${progressPercent}%`,
                    } as React.CSSProperties}
                  />
                </div>

                {/* Step dots */}
                <div className="goal-step-dots" aria-hidden="true">
                  {Array.from({ length: Math.min(6, weeklyGoal) }).map((_, index) => {
                    const isDone = index < effectiveWorkoutsCount;
                    return (
                      <span
                        key={index}
                        className={`goal-step-dot ${isDone ? 'is-completed' : ''}`}
                      >
                        {isDone ? <Check size={11} strokeWidth={3} /> : index + 1}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="goal-footer-row">
                <div className="glance-stats">
                  <div>
                    <strong>{effectiveWorkoutsCount} <small>/ {weeklyGoal}</small></strong>
                    <span>Einheiten</span>
                  </div>
                  <div>
                    <strong>{Math.round(weeklyVolume).toLocaleString('de-DE')}<small> kg</small></strong>
                    <span>Volumen</span>
                  </div>
                </div>

                <div className="goal-actions-group">
                  <button
                    type="button"
                    className="goal-preview-btn"
                    onClick={() => {
                      setPreviewCelebration(true);
                      triggerCelebration();
                    }}
                    title="Vorschau der Erreicht-Animation anzeigen"
                  >
                    <Sparkles size={13} aria-hidden="true" />
                    <span>Animation testen</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
