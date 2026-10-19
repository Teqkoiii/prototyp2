import { useCallback, useEffect, useState } from 'react';
import {
  GymApiError,
  gymRepository,
  type ActiveCheckInItem,
  type CalendarEventItem,
  type CommunityMember,
  type CommunityProfile,
  type GymAvailability,
  type GymBooking,
  type GymSession,
  type GymVisit,
  type OccupancyRange,
  type OccupancySnapshot,
  type SharedBookingSlot,
  type TrainingPartnerRequest,
  type WorkoutLog,
} from '../../services/gymRepository';
import { AppFrame, InlineNotice, type GymPage } from './components';
import { Dashboard } from './Dashboard';
import { Calendar } from './Calendar';
import { Community } from './Community';
import { Training } from './Training';
import { Progress } from './Progress';
import { Profile } from './Profile';
import './gym.css';

export function GymApp() {
  const [page, setPage] = useState<GymPage>('dashboard');
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [session, setSession] = useState<GymSession | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancySnapshot | null>(null);
  const [occupancyRange, setOccupancyRange] = useState<OccupancyRange>('24h');
  const [bookings, setBookings] = useState<GymBooking[]>([]);
  const [sharedSlots, setSharedSlots] = useState<SharedBookingSlot[]>([]);
  const [visits, setVisits] = useState<GymVisit[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [availability, setAvailability] = useState<GymAvailability | null>(null);

  // Community & Live Calendar states
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [activeCheckIns, setActiveCheckIns] = useState<ActiveCheckInItem[]>([]);
  const [communityProfile, setCommunityProfile] = useState<CommunityProfile | null>(null);
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<TrainingPartnerRequest[]>([]);

  const refreshAll = useCallback(async () => {
    try {
      const currentSession = await gymRepository.getSession();
      const [
        currentOccupancy,
        shared,
        mine,
        calData,
        cProfile,
        cMembers,
        pRequests,
        currentVisits,
        currentWorkouts,
        currentGoal,
      ] = await Promise.all([
        gymRepository.getOccupancy(occupancyRange),
        gymRepository.getBookings(),
        gymRepository.getMyBookings(),
        gymRepository.getCalendarEvents(),
        gymRepository.getCommunityProfile().catch(() => null),
        gymRepository.getCommunityMembers().catch(() => []),
        gymRepository.getPartnerRequests().catch(() => []),
        gymRepository.getVisits(),
        gymRepository.getWorkouts(),
        gymRepository.getWeeklyGoal(),
      ]);

      setSession(currentSession);
      setOccupancy(currentOccupancy);
      setSharedSlots(shared.slots);
      setBookings(mine);
      setCalendarEvents(calData.events);
      setActiveCheckIns(calData.activeCheckIns);
      setCommunityProfile(cProfile);
      setCommunityMembers(cMembers);
      setPartnerRequests(pRequests);
      setVisits(currentVisits);
      setWorkouts(currentWorkouts);
      setWeeklyGoal(currentGoal);
      setOnline(true);
      setError(null);
    } catch (caught) {
      setOnline(false);
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [occupancyRange]);

  const refreshLivePresence = useCallback(async () => {
    try {
      const [current, currentSession, calData] = await Promise.all([
        gymRepository.getOccupancy(occupancyRange),
        gymRepository.getSession(),
        gymRepository.getCalendarEvents(),
      ]);
      setOccupancy(current);
      setSession(currentSession);
      setCalendarEvents(calData.events);
      setActiveCheckIns(calData.activeCheckIns);
      setOnline(true);
    } catch (caught) {
      setOnline(false);
      setError(errorMessage(caught));
    }
  }, [occupancyRange]);

  // Smart polling: every 15s + on window focus / tab visibility change
  useEffect(() => {
    void refreshAll();
    const timer = window.setInterval(() => void refreshLivePresence(), 15_000);
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refreshAll();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refreshAll, refreshLivePresence]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const runMutation = useCallback(
    async (operation: () => Promise<void>, successMessage: string) => {
      setBusy(true);
      setError(null);
      try {
        await operation();
        await refreshAll();
        setToast(successMessage);
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const handlePresence = useCallback(
    (present: boolean) =>
      runMutation(
        () => gymRepository.setCheckedIn(present),
        present ? 'Du bist im Gym eingecheckt.' : 'Du wurdest erfolgreich ausgecheckt.',
      ),
    [runMutation],
  );

  const handleCreateBooking = useCallback(
    (input: { startsAt: string; durationMinutes: number; title?: string; entryType?: 'planned' | 'reservation' }) =>
      runMutation(
        async () => {
          await gymRepository.createBooking(input);
        },
        input.entryType === 'reservation' ? 'Deine Trainingszeit wurde reserviert.' : 'Geplante Anwesenheit eingetragen.',
      ),
    [runMutation],
  );

  const handleDeleteBooking = useCallback(
    (id: string) =>
      runMutation(
        () => gymRepository.deleteBooking(id),
        'Eintrag entfernt.',
      ),
    [runMutation],
  );

  const handleCreateWorkout = useCallback(
    (input: Omit<WorkoutLog, 'id'>) =>
      runMutation(
        () => gymRepository.createWorkout(input),
        'Training gespeichert.',
      ),
    [runMutation],
  );

  const handleDeleteWorkout = useCallback(
    (id: string) =>
      runMutation(
        () => gymRepository.deleteWorkout(id),
        'Training gelöscht.',
      ),
    [runMutation],
  );

  const handleGoal = useCallback(
    (value: number) =>
      runMutation(
        async () => {
          await gymRepository.setWeeklyGoal(value);
        },
        'Wochenziel aktualisiert.',
      ),
    [runMutation],
  );

  const handleAvailability = useCallback(async (startAt: string, duration: number) => {
    try {
      setAvailability(await gymRepository.getAvailability(startAt, duration));
    } catch {
      setAvailability(null);
    }
  }, []);

  const handleSaveProfile = useCallback(
    async (updated: Partial<CommunityProfile>) => {
      setBusy(true);
      setError(null);
      try {
        const saved = await gymRepository.updateCommunityProfile(updated);
        setCommunityProfile(saved);
        await refreshAll();
        setToast('Community-Profil gespeichert.');
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const handleSendPartnerRequest = useCallback(
    async (receiverId: string, note?: string, proposedDate?: string) => {
      setBusy(true);
      setError(null);
      try {
        await gymRepository.sendPartnerRequest(receiverId, note, proposedDate);
        await refreshAll();
        setToast('Trainingspartner-Anfrage gesendet.');
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const handleRespondPartnerRequest = useCallback(
    async (id: string, status: 'accepted' | 'declined' | 'cancelled') => {
      setBusy(true);
      setError(null);
      try {
        await gymRepository.respondToPartnerRequest(id, status);
        await refreshAll();
        setToast(
          status === 'accepted'
            ? 'Partner-Anfrage angenommen!'
            : status === 'declined'
            ? 'Anfrage abgelehnt.'
            : 'Anfrage zurückgezogen.',
        );
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const handleRegister = useCallback(
    async (data: { email: string; password: string; firstName?: string; lastNameInitial?: string; courseOfStudy?: string }) => {
      setBusy(true);
      setError(null);
      try {
        await gymRepository.registerWithDhbw(data);
        await refreshAll();
        setToast('DHBW-Konto erfolgreich registriert!');
      } catch (caught) {
        setError(errorMessage(caught));
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const handleLogin = useCallback(
    async (email: string, pass: string) => {
      setBusy(true);
      setError(null);
      try {
        await gymRepository.login(email, pass);
        await refreshAll();
        setToast('Erfolgreich angemeldet!');
      } catch (caught) {
        setError(errorMessage(caught));
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    [refreshAll],
  );

  const handleLogout = useCallback(async () => {
    setBusy(true);
    try {
      await gymRepository.logout();
      await refreshAll();
      setToast('Abgemeldet.');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }, [refreshAll]);

  const handleIssueRecoveryCode = useCallback(async () => {
    setError(null);
    try {
      const code = await gymRepository.issueRecoveryCode();
      await refreshAll();
      setToast('Wiederherstellungscode erstellt. Bewahre ihn sicher auf.');
      return code;
    } catch (caught) {
      setError(errorMessage(caught));
      throw caught;
    }
  }, [refreshAll]);

  const handleRecover = useCallback(
    (code: string) =>
      runMutation(
        () => gymRepository.recoverProfile(code),
        'Profil wiederhergestellt. Deine Serverdaten sind wieder verfügbar.',
      ),
    [runMutation],
  );

  const handleDeleteData = useCallback(() => {
    if (
      !window.confirm(
        'Alle deine Trainingsdaten, Profilangaben, Reservierungen und Partner-Anfragen wirklich löschen?',
      )
    ) {
      return;
    }
    void runMutation(async () => {
      await gymRepository.deletePersonalData();
      setPage('dashboard');
    }, 'Deine persönlichen App-Daten wurden vollständig gelöscht.');
  }, [runMutation]);

  if (loading) {
    return (
      <div className="app-loading" role="status">
        <span className="loading-mark" />
        <p>DHBW Gym Hub wird verbunden …</p>
      </div>
    );
  }

  return (
    <AppFrame page={page} onNavigate={setPage}>
      {!online && (
        <InlineNotice tone="warning">
          Der Gym-Server ist nicht erreichbar. Angezeigte Daten können veraltet sein; Check-in,
          Reservierungen und Speichern sind derzeit deaktiviert.
        </InlineNotice>
      )}

      {page === 'dashboard' && (
        <Dashboard
          session={session}
          occupancy={occupancy}
          occupancyRange={occupancyRange}
          onOccupancyRangeChange={setOccupancyRange}
          bookings={bookings}
          workouts={workouts}
          weeklyGoal={weeklyGoal}
          online={online}
          busy={busy}
          error={error}
          onPresence={handlePresence}
          onNavigate={setPage}
        />
      )}

      {page === 'calendar' && (
        <Calendar
          session={session}
          calendarEvents={calendarEvents}
          activeCheckIns={activeCheckIns}
          visits={visits}
          workouts={workouts}
          availability={availability}
          online={online}
          busy={busy}
          error={error}
          onCreateBooking={handleCreateBooking}
          onDeleteBooking={handleDeleteBooking}
          onCheckAvailability={handleAvailability}
          onPresence={handlePresence}
          onNavigate={setPage}
        />
      )}

      {page === 'community' && (
        <Community
          members={communityMembers}
          requests={partnerRequests}
          myProfile={communityProfile}
          online={online}
          busy={busy}
          error={error}
          onSendRequest={handleSendPartnerRequest}
          onRespondRequest={handleRespondPartnerRequest}
          onNavigateToProfile={() => setPage('profile')}
        />
      )}

      {page === 'training' && (
        <Training
          workouts={workouts}
          busy={busy}
          error={error}
          online={online}
          onCreate={handleCreateWorkout}
          onDelete={handleDeleteWorkout}
        />
      )}

      {page === 'progress' && (
        <Progress
          workouts={workouts}
          weeklyGoal={weeklyGoal}
          busy={busy}
          error={error}
          online={online}
          onUpdateGoal={handleGoal}
        />
      )}

      {page === 'profile' && (
        <Profile
          session={session}
          profile={communityProfile}
          online={online}
          busy={busy}
          error={error}
          onCreateRecoveryCode={handleIssueRecoveryCode}
          onRecover={handleRecover}
          onDeleteData={handleDeleteData}
          onSaveProfile={handleSaveProfile}
          onRegister={handleRegister}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}

      <footer className="gym-footer">
        <span>DHBW Bad Mergentheim · Campus-Gym Community</span>
        <span>Smart-Polling alle 15 Sekunden aktiv</span>
      </footer>

      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && <div className="toast-message">{toast}</div>}
      </div>
    </AppFrame>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof GymApiError) {
    if (error.status === 0) return error.message;
    if (error.status === 409) return 'Diese Zeit hast du bereits geplant oder eine Anfrage existiert bereits.';
    if (error.status === 401)
      return 'Deine Sitzung ist abgelaufen oder Zugangsdaten sind ungültig.';
    if (error.status === 429) return 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';
    if (error.status === 400) return error.message || 'Bitte prüfe die eingegebenen Daten.';
  }
  return error instanceof Error
    ? error.message
    : 'Das hat gerade nicht funktioniert. Bitte versuche es noch einmal.';
}
