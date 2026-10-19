import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Clock,
  Dumbbell,
  Filter,
  MessageSquare,
  Search,
  Send,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { CommunityMember, CommunityProfile, TrainingPartnerRequest } from '../../services/gymRepository';
import { formatDateTime } from './format';
import { EmptyState, Field, InlineNotice, PageHeading, SectionTitle } from './components';

export function Community({
  members,
  requests,
  myProfile,
  online,
  busy,
  error,
  onSendRequest,
  onRespondRequest,
  onNavigateToProfile,
}: {
  members: CommunityMember[];
  requests: TrainingPartnerRequest[];
  myProfile: CommunityProfile | null;
  online: boolean;
  busy: boolean;
  error: string | null;
  onSendRequest: (receiverId: string, note?: string, proposedDate?: string) => Promise<void>;
  onRespondRequest: (id: string, status: 'accepted' | 'declined' | 'cancelled') => Promise<void>;
  onNavigateToProfile: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');
  const [partnerModalMember, setPartnerModalMember] = useState<CommunityMember | null>(null);
  const [proposedDate, setProposedDate] = useState('');
  const [partnerNote, setPartnerNote] = useState('');
  const [requestSending, setRequestSending] = useState(false);

  const pendingIncomingCount = useMemo(
    () => requests.filter((r) => r.isIncoming && r.status === 'pending').length,
    [requests],
  );

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const fullName = `${member.firstName} ${member.lastNameInitial}`.toLowerCase();
        const study = member.courseOfStudy.toLowerCase();
        if (!fullName.includes(query) && !study.includes(query)) return false;
      }
      if (selectedGoal !== 'all') {
        if (!member.trainingGoals.some((g) => g.toLowerCase().includes(selectedGoal.toLowerCase()))) {
          return false;
        }
      }
      if (selectedTime !== 'all') {
        if (!member.preferredTimes.some((t) => t.toLowerCase().includes(selectedTime.toLowerCase()))) {
          return false;
        }
      }
      return true;
    });
  }, [members, searchTerm, selectedGoal, selectedTime]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerModalMember) return;
    setRequestSending(true);
    try {
      const dateIso = proposedDate ? new Date(proposedDate).toISOString() : undefined;
      await onSendRequest(partnerModalMember.id, partnerNote.trim(), dateIso);
      setPartnerModalMember(null);
      setPartnerNote('');
      setProposedDate('');
    } finally {
      setRequestSending(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="DHBW BAD MERGENTHEIM"
        title="Gym Community"
        description="Finde Trainingspartner, verabrede dich zu gemeinsamen Sessions und tausche dich über Ziele aus."
      />

      {error && <InlineNotice tone="error">{error}</InlineNotice>}

      {/* Community Segment Controls */}
      <div className="community-subnav" role="tablist" aria-label="Community-Ansichten">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'members'}
          className={`community-tab-button ${activeTab === 'members' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={17} aria-hidden="true" />
          <span>Mitglieder & Buddies ({members.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'requests'}
          className={`community-tab-button ${activeTab === 'requests' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <UserCheck size={17} aria-hidden="true" />
          <span>Partner-Anfragen</span>
          {pendingIncomingCount > 0 && (
            <span className="badge-count" aria-label={`${pendingIncomingCount} offene Anfragen`}>
              {pendingIncomingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'requests' && (
        <section className="surface community-requests-panel">
          <SectionTitle title="Deine Trainingspartner-Anfragen" />
          <p className="muted-copy">
            Hier siehst du eingehende und gesendete Einladungen für gemeinsame Trainings.
          </p>

          <div className="requests-container">
            <div>
              <h3 className="sub-heading">Eingehende Anfragen</h3>
              {requests.filter((r) => r.isIncoming).length === 0 ? (
                <p className="muted-copy py-3">Keine eingehenden Partner-Anfragen vorhanden.</p>
              ) : (
                <ul className="event-list">
                  {requests
                    .filter((r) => r.isIncoming)
                    .map((req) => (
                      <li key={req.id} className="event-row partner-request-row">
                        <div className="event-content">
                          <div className="flex items-center gap-2">
                            <strong>{req.senderName}</strong>
                            <span className={`request-status-pill status-${req.status}`}>
                              {req.status === 'pending'
                                ? 'Offen'
                                : req.status === 'accepted'
                                ? 'Angenommen'
                                : 'Abgelehnt'}
                            </span>
                          </div>
                          {req.proposedDate && (
                            <span className="text-xs text-slate-400">
                              Vorgeschlagener Termin: {formatDateTime(req.proposedDate)}
                            </span>
                          )}
                          {req.note && <p className="request-note">"{req.note}"</p>}
                        </div>
                        {req.status === 'pending' && (
                          <div className="request-actions">
                            <button
                              type="button"
                              className="button button-primary compact-button"
                              disabled={busy || !online}
                              onClick={() => void onRespondRequest(req.id, 'accepted')}
                              title="Anfrage annehmen"
                            >
                              <Check size={15} aria-hidden="true" />
                              <span>Annehmen</span>
                            </button>
                            <button
                              type="button"
                              className="button button-secondary compact-button"
                              disabled={busy || !online}
                              onClick={() => void onRespondRequest(req.id, 'declined')}
                              title="Anfrage ablehnen"
                            >
                              <X size={15} aria-hidden="true" />
                              <span>Ablehnen</span>
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="mt-6">
              <h3 className="sub-heading">Gesendete Anfragen</h3>
              {requests.filter((r) => !r.isIncoming).length === 0 ? (
                <p className="muted-copy py-3">Du hast aktuell keine offenen Anfragen gesendet.</p>
              ) : (
                <ul className="event-list">
                  {requests
                    .filter((r) => !r.isIncoming)
                    .map((req) => (
                      <li key={req.id} className="event-row partner-request-row">
                        <div className="event-content">
                          <div className="flex items-center gap-2">
                            <strong>An {req.receiverName}</strong>
                            <span className={`request-status-pill status-${req.status}`}>
                              {req.status === 'pending'
                                ? 'Wartend auf Antwort'
                                : req.status === 'accepted'
                                ? 'Angenommen!'
                                : 'Abgelehnt'}
                            </span>
                          </div>
                          {req.proposedDate && (
                            <span className="text-xs text-slate-400">
                              Termin: {formatDateTime(req.proposedDate)}
                            </span>
                          )}
                          {req.note && <p className="request-note">"{req.note}"</p>}
                        </div>
                        {req.status === 'pending' && (
                          <button
                            type="button"
                            className="button button-secondary compact-button"
                            disabled={busy || !online}
                            onClick={() => void onRespondRequest(req.id, 'cancelled')}
                          >
                            Zurückziehen
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'members' && (
        <>
          {/* Search & Filters */}
          <section className="surface community-filter-bar">
            <div className="community-search-box">
              <Search size={17} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                className="community-search-input"
                placeholder="Nach Name oder Studiengang suchen (z. B. Wirtschaftsinformatik)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Suche löschen"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="filter-chips-row">
              <div className="filter-group">
                <span className="filter-group-label">
                  <Filter size={14} aria-hidden="true" /> Ziel:
                </span>
                {['all', 'Muskelaufbau', 'Kraft', 'Ausdauer', 'Calisthenics'].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    className={`filter-chip ${selectedGoal === goal ? 'is-active' : ''}`}
                    onClick={() => setSelectedGoal(goal)}
                  >
                    {goal === 'all' ? 'Alle' : goal}
                  </button>
                ))}
              </div>

              <div className="filter-group">
                <span className="filter-group-label">
                  <Clock size={14} aria-hidden="true" /> Zeit:
                </span>
                {['all', 'Morgens', 'Nachmittags', 'Abends'].map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`filter-chip ${selectedTime === time ? 'is-active' : ''}`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time === 'all' ? 'Alle' : time}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Members Grid */}
          <section className="community-members-grid">
            {filteredMembers.length === 0 ? (
              <EmptyState
                title="Keine Studierenden gefunden"
                description="Passe deine Suchbegriffe oder Filter an, um andere Trainingspartner zu finden."
              />
            ) : (
              filteredMembers.map((member) => {
                const initials = `${member.firstName[0] || ''}${member.lastNameInitial || ''}`;
                return (
                  <article key={member.id} className="surface member-card">
                    <div className="member-card-header">
                      <div className="member-avatar" aria-hidden="true">
                        {initials}
                      </div>
                      <div className="member-info">
                        <div className="flex items-center gap-2">
                          <h3 className="member-name">
                            {member.firstName} {member.lastNameInitial ? `${member.lastNameInitial}.` : ''}
                          </h3>
                          {member.isSelf && <span className="self-tag">Du</span>}
                        </div>
                        <p className="member-study">{member.courseOfStudy || 'DHBW Bad Mergentheim'}</p>
                      </div>
                    </div>

                    <div className="member-presence-status">
                      {member.activeNow ? (
                        <span className="status-live-pill">
                          <span className="live-dot" aria-hidden="true" />
                          <span>Jetzt im Gym</span>
                        </span>
                      ) : member.plannedNext ? (
                        <span className="status-planned-pill">
                          <CalendarClock size={14} aria-hidden="true" />
                          <span>Nächstes: {formatDateTime(member.plannedNext)}</span>
                        </span>
                      ) : (
                        <span className="status-idle-pill">Keine aktive Planung</span>
                      )}
                    </div>

                    {member.trainingGoals.length > 0 && (
                      <div className="member-tags-container">
                        <span className="member-tags-label">Ziele:</span>
                        <div className="member-tags">
                          {member.trainingGoals.map((g) => (
                            <span key={g} className="member-tag">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {member.preferredTimes.length > 0 && (
                      <div className="member-tags-container">
                        <span className="member-tags-label">Zeiten:</span>
                        <div className="member-tags">
                          {member.preferredTimes.map((t) => (
                            <span key={t} className="member-tag-time">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {member.bio && <p className="member-bio">"{member.bio}"</p>}

                    <div className="member-card-footer">
                      {member.isSelf ? (
                        <button
                          type="button"
                          className="button button-secondary full-width"
                          onClick={onNavigateToProfile}
                        >
                          Dein Profil anpassen
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button button-primary full-width"
                          disabled={!online || busy}
                          onClick={() => setPartnerModalMember(member)}
                        >
                          <UserPlus size={16} aria-hidden="true" />
                          <span>Partner-Anfrage</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </>
      )}

      {/* Partner Request Modal */}
      {partnerModalMember && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="partner-modal-title">
          <div className="surface modal-card">
            <div className="modal-header">
              <h2 id="partner-modal-title">
                Trainingspartner-Anfrage an {partnerModalMember.firstName} {partnerModalMember.lastNameInitial}.
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPartnerModalMember(null)}
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSend} className="stack-form">
              <p className="muted-copy text-sm">
                Verabrede dich zu einer gemeinsamen Session im Gym am Campus Bad Mergentheim. Deine E-Mail oder
                private Kontaktdaten werden nicht weitergegeben.
              </p>

              <Field label="Vorgeschlagener Trainingstermin (optional)">
                <input
                  type="datetime-local"
                  className="text-input"
                  value={proposedDate}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setProposedDate(e.target.value)}
                />
              </Field>

              <Field label="Nachricht / Fokus">
                <textarea
                  className="text-input"
                  rows={3}
                  maxLength={200}
                  placeholder="z. B. Hey, trainieren wir zusammen Brust & Schultern? Bin ab 17:30 da!"
                  value={partnerNote}
                  onChange={(e) => setPartnerNote(e.target.value)}
                />
              </Field>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setPartnerModalMember(null)}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={requestSending || !online}
                >
                  <Send size={16} aria-hidden="true" />
                  <span>{requestSending ? 'Wird gesendet...' : 'Anfrage senden'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
