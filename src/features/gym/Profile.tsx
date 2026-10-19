import { useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  User,
  UserCheck,
} from 'lucide-react';
import type { CommunityProfile, GymSession } from '../../services/gymRepository';
import { Field, InlineNotice, PageHeading, SectionTitle } from './components';

const AVAILABLE_GOALS = [
  'Hypertrophie (Muskelaufbau)',
  'Kraftsport (Powerlifting)',
  'Ausdauer & Cardio',
  'Calisthenics & Bodyweight',
  'Rückengesundheit & Mobilität',
];

const AVAILABLE_TIMES = [
  'Morgens (06:00 – 10:00)',
  'Mittags (11:30 – 14:00)',
  'Nachmittags (15:00 – 18:00)',
  'Abends (18:00 – 22:00)',
];

export function Profile({
  session,
  profile,
  online,
  busy,
  error,
  onCreateRecoveryCode,
  onRecover,
  onDeleteData,
  onSaveProfile,
  onRegister,
  onLogin,
  onLogout,
}: {
  session: GymSession | null;
  profile: CommunityProfile | null;
  online: boolean;
  busy: boolean;
  error: string | null;
  onCreateRecoveryCode: () => Promise<string>;
  onRecover: (code: string) => void;
  onDeleteData: () => void;
  onSaveProfile: (updated: Partial<CommunityProfile>) => Promise<void>;
  onRegister: (data: { email: string; password: string; firstName?: string; lastNameInitial?: string; courseOfStudy?: string }) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  // Community profile states
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastNameInitial, setLastNameInitial] = useState(profile?.lastNameInitial ?? '');
  const [courseOfStudy, setCourseOfStudy] = useState(profile?.courseOfStudy ?? '');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(profile?.trainingGoals ?? []);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(profile?.preferredTimes ?? []);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isPublicPresence, setIsPublicPresence] = useState(profile?.isPublicPresence ?? true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Auth states
  const [authMode, setAuthMode] = useState<'view' | 'login' | 'register'>('view');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authStudy, setAuthStudy] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Recovery states
  const [recoveryCode, setRecoveryCode] = useState('');
  const [restoreInput, setRestoreInput] = useState('');
  const [copied, setCopied] = useState(false);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time],
    );
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    try {
      await onSaveProfile({
        firstName: firstName.trim(),
        lastNameInitial: lastNameInitial.trim().slice(0, 1).toUpperCase(),
        courseOfStudy: courseOfStudy.trim(),
        trainingGoals: selectedGoals,
        preferredTimes: selectedTimes,
        bio: bio.trim(),
        isPublicPresence,
      });
      setProfileSuccess('Dein Community-Profil wurde erfolgreich gespeichert.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      if (authMode === 'register') {
        await onRegister({
          email: authEmail.trim(),
          password: authPassword,
          firstName: authFirstName.trim(),
          lastNameInitial: authLastName.trim().slice(0, 1),
          courseOfStudy: authStudy.trim(),
        });
      } else {
        await onLogin(authEmail.trim(), authPassword);
      }
      setAuthMode('view');
      setAuthEmail('');
      setAuthPassword('');
    } finally {
      setAuthBusy(false);
    }
  };

  const createCode = async () => {
    try {
      setRecoveryCode(await onCreateRecoveryCode());
      setCopied(false);
    } catch {
      // handled
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const submitRecovery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRecover(restoreInput.trim());
  };

  return (
    <>
      <PageHeading
        eyebrow="DEIN KONTO & DATENSCHUTZ"
        title="Profil & Einstellungen"
        description="Passe deine Trainingsinteressen, deine Sichtbarkeit im gemeinsamen Kalender und deine DHBW-Kennung an."
      />

      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {profileSuccess && <InlineNotice tone="success">{profileSuccess}</InlineNotice>}

      <div className="profile-grid">
        {/* 1. Community Profile Form */}
        <section className="surface profile-card">
          <div className="panel-topline">
            <span className="icon-badge">
              <UserCheck size={19} aria-hidden="true" />
            </span>
            <span className="panel-label">Community-Profil</span>
          </div>

          <SectionTitle title="Trainingsprofil & Interessen" />
          <p className="muted-copy">
            Diese Angaben helfen anderen DHBW-Studierenden, passende Trainingspartner für gemeinsame Zeiten
            zu finden.
          </p>

          <form onSubmit={handleProfileSubmit} className="stack-form mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Vorname">
                <input
                  type="text"
                  className="text-input"
                  required
                  maxLength={40}
                  value={firstName}
                  placeholder="z. B. Max"
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>
              <Field label="Nachname (wird nur als Initiale gezeigt)">
                <input
                  type="text"
                  className="text-input"
                  maxLength={1}
                  value={lastNameInitial}
                  placeholder="z. B. M"
                  onChange={(e) => setLastNameInitial(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Studiengang / Fakultät">
              <input
                type="text"
                className="text-input"
                maxLength={80}
                value={courseOfStudy}
                placeholder="z. B. Wirtschaftsinformatik, BWL-Handel, Maschinenbau"
                onChange={(e) => setCourseOfStudy(e.target.value)}
              />
            </Field>

            <Field label="Deine Trainingsziele">
              <div className="checkbox-chips-grid">
                {AVAILABLE_GOALS.map((goal) => {
                  const active = selectedGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      className={`goal-chip-button ${active ? 'is-active' : ''}`}
                      onClick={() => toggleGoal(goal)}
                    >
                      <Target size={14} aria-hidden="true" />
                      <span>{goal}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Bevorzugte Trainingszeiten">
              <div className="checkbox-chips-grid">
                {AVAILABLE_TIMES.map((time) => {
                  const active = selectedTimes.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      className={`goal-chip-button ${active ? 'is-active' : ''}`}
                      onClick={() => toggleTime(time)}
                    >
                      <span>{time}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Über mich / Gym-Buddy-Gesuch">
              <textarea
                className="text-input"
                rows={2}
                maxLength={250}
                placeholder="z. B. Trainiere 3-4x pro Woche, suche jemanden zum Spotten beim Bankdrücken."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </Field>

            {/* Privacy Toggle Card */}
            <div className={`privacy-toggle-box ${isPublicPresence ? 'active' : 'private'}`}>
              <div className="toggle-info">
                <div className="flex items-center gap-2">
                  {isPublicPresence ? (
                    <Eye size={18} className="text-emerald-400" />
                  ) : (
                    <EyeOff size={18} className="text-amber-400" />
                  )}
                  <strong className="text-sm">
                    {isPublicPresence ? 'Öffentliche Anwesenheit aktiv' : 'Privater Modus aktiv'}
                  </strong>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {isPublicPresence
                    ? 'Dein Vorname & Initiale (z. B. Anna S.) sind im Kalender und in der Community sichtbar.'
                    : 'Deine Einträge werden im Kalender als „Anonymer DHBW Student“ geführt. Deine Identität ist verborgen.'}
                </p>
              </div>
              <button
                type="button"
                className={`button compact-button ${isPublicPresence ? 'button-secondary' : 'button-primary'}`}
                onClick={() => setIsPublicPresence(!isPublicPresence)}
              >
                {isPublicPresence ? 'Auf Privat schalten' : 'Sichtbar machen'}
              </button>
            </div>

            <button
              type="submit"
              className="button button-primary full-width mt-3"
              disabled={profileSaving || busy || !online}
            >
              <Save size={16} aria-hidden="true" />
              <span>{profileSaving ? 'Wird gespeichert...' : 'Profil speichern'}</span>
            </button>
          </form>
        </section>

        {/* 2. DHBW Account & Authentication */}
        <section className="surface profile-card">
          <div className="panel-topline">
            <span className="icon-badge">
              <GraduationCap size={19} aria-hidden="true" />
            </span>
            <span className="panel-label">DHBW Zugang</span>
          </div>

          <SectionTitle title="DHBW Hochschul-Konto" />

          {session?.identity === 'local-account' && (session as any).email ? (
            <div className="account-status-box">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <ShieldCheck size={18} />
                <span className="font-semibold text-sm">Verifizierte DHBW-E-Mail</span>
              </div>
              <p className="text-sm font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                {(session as any).email}
              </p>
              <p className="muted-copy text-xs mt-2">
                Dein Profil ist sicher mit deiner Hochschul-E-Mail verknüpft.
              </p>
              <button
                type="button"
                className="button button-secondary full-width mt-4"
                disabled={busy || !online}
                onClick={onLogout}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Abmelden</span>
              </button>
            </div>
          ) : authMode === 'view' ? (
            <div className="account-anon-box">
              <p className="text-sm text-slate-300">
                Du nutzt die App aktuell mit einer temporären, anonymen Gerätesitzung. Registriere deine
                offizielle DHBW-E-Mail, um dein Profil geräteübergreifend zu sichern.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  className="button button-primary flex-1"
                  onClick={() => setAuthMode('register')}
                >
                  <Mail size={16} />
                  <span>Registrieren</span>
                </button>
                <button
                  type="button"
                  className="button button-secondary flex-1"
                  onClick={() => setAuthMode('login')}
                >
                  <Lock size={16} />
                  <span>Anmelden</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="stack-form mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">
                  {authMode === 'register' ? 'DHBW-Konto registrieren' : 'Mit DHBW-Konto anmelden'}
                </h3>
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
                >
                  {authMode === 'register' ? 'Schon registriert? Anmelden' : 'Neu hier? Registrieren'}
                </button>
              </div>

              <Field label="DHBW E-Mail-Adresse" hint="z. B. @bad-mergentheim.dhbw.de oder @dhbw-*.de">
                <input
                  type="email"
                  className="text-input"
                  required
                  placeholder="name@bad-mergentheim.dhbw.de"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </Field>

              <Field label="Passwort" hint="Mindestens 10 Zeichen">
                <input
                  type="password"
                  className="text-input"
                  required
                  minLength={10}
                  placeholder="Sicheres Passwort"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </Field>

              {authMode === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Vorname">
                      <input
                        type="text"
                        className="text-input"
                        placeholder="Max"
                        value={authFirstName}
                        onChange={(e) => setAuthFirstName(e.target.value)}
                      />
                    </Field>
                    <Field label="Nachname">
                      <input
                        type="text"
                        className="text-input"
                        placeholder="Mustermann"
                        value={authLastName}
                        onChange={(e) => setAuthLastName(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Studiengang">
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Wirtschaftsinformatik"
                      value={authStudy}
                      onChange={(e) => setAuthStudy(e.target.value)}
                    />
                  </Field>
                </>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="button button-secondary flex-1"
                  onClick={() => setAuthMode('view')}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="button button-primary flex-1"
                  disabled={authBusy || !online}
                >
                  {authBusy
                    ? 'Wird ausgeführt...'
                    : authMode === 'register'
                    ? 'Konto erstellen'
                    : 'Anmelden'}
                </button>
              </div>
            </form>
          )}

          {/* Recovery Code Section */}
          <div className="pt-4 mt-4 border-t border-slate-800">
            <h3 className="sub-heading flex items-center gap-2">
              <KeyRound size={16} /> Wiederherstellungscode
            </h3>
            <p className="muted-copy text-xs">
              Alternativ kannst du einen Einmal-Code erzeugen, um deine Gerätesitzung ohne Passwort auf ein
              neues Handy zu übertragen.
            </p>
            {!session?.recoveryConfigured && (
              <button
                type="button"
                className="button button-secondary mt-2"
                disabled={!online || busy}
                onClick={() => void createCode()}
              >
                Einmal-Code erstellen
              </button>
            )}
            {session?.recoveryConfigured && !recoveryCode && (
              <InlineNotice tone="success">
                Ein Wiederherstellungscode ist eingerichtet. Bewahre ihn sicher auf.
              </InlineNotice>
            )}
            {recoveryCode && (
              <div className="recovery-code-panel mt-2">
                <p className="text-xs text-amber-300">
                  Wird nur jetzt angezeigt! Speichere den Code sicher:
                </p>
                <code className="text-xs">{recoveryCode}</code>
                <button type="button" className="button button-secondary compact-button" onClick={() => void copyCode()}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Kopiert' : 'Code kopieren'}</span>
                </button>
              </div>
            )}

            <form className="stack-form recovery-form mt-3" onSubmit={submitRecovery}>
              <Field label="Vorhandenen Code eingeben">
                <input
                  className="text-input"
                  value={restoreInput}
                  onChange={(event) => setRestoreInput(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Code einfügen"
                  required
                />
              </Field>
              <button
                type="submit"
                className="button button-primary compact-button"
                disabled={!online || busy || restoreInput.trim().length < 20}
              >
                Code anwenden
              </button>
            </form>
          </div>
        </section>

        {/* 3. Privacy & DSGVO */}
        <section className="surface profile-card privacy-card">
          <span className="icon-badge">
            <ShieldCheck size={19} aria-hidden="true" />
          </span>
          <SectionTitle title="Datenschutz & Datenhoheit" />
          <ul className="privacy-list">
            <li>Ausschließlich autorisierte DHBW-Angehörige haben Zugriff auf die Plattform.</li>
            <li>
              Deine Anwesenheitssichtbarkeit ist freiwillig und kann jederzeit mit einem Klick auf privat
              gestellt werden.
            </li>
            <li>E-Mail-Adressen und private Kontaktdaten werden niemals öffentlich im Client geteilt.</li>
            <li>Besuche und Check-ins werden nach 90 Tagen automatisch gelöscht.</li>
            <li>Du hast das Recht, alle deine persönlichen Daten und Kontoeinträge vollständig zu löschen.</li>
          </ul>
          <button
            type="button"
            className="button button-danger"
            disabled={!online || busy}
            onClick={onDeleteData}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Alle meine App-Daten löschen</span>
          </button>
        </section>
      </div>
    </>
  );
}
