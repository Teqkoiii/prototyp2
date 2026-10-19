# DHBW Gym Community-Plattform (Campus Bad Mergentheim)

Erweiterung der bestehenden DHBW Gym App zu einer vernetzten Community-Plattform für Studierende der DHBW Bad Mergentheim. Die Plattform ermöglicht transparente gemeinsame Trainingszeiten, verlässlichen Check-in/Check-out, Partnersuche nach Trainingszielen und strikten Schutz persönlicher Daten ohne simulierte Schranken.

## User Review & Critical Decisions

> [!IMPORTANT]
> Alle in Phase 1 geklärten Anforderungen wurden als verbindliche Architekturvorgaben übernommen:

- **DHBW-Zugangsprüfung**: Registrierung wird serverseitig strikt auf verifizierte DHBW-E-Mail-Adressen beschränkt (z. B. `*@dhbw-*.de`, `*@*.dhbw.de`, `*@lehre.dhbw-*.de`, `*@dhbw.de`).
- **Datenschutz & Sichtbarkeit**: Standardmäßig wird nur der Vorname und der Anfangsbuchstabe des Nachnamens (z. B. *Lukas M.*) angezeigt. Ein zentraler Privatsphäre-Schalter erlaubt es jedem Studierenden, die eigene Anwesenheit und geplante Zeiten jederzeit komplett unsichtbar zu schalten. Private Kontaktdaten (wie E-Mail oder ID) werden niemals im Client exponiert.
- **Synchronisation**: Smartes Polling bei Nutzerinteraktion, Tab-Fokus und Statuswechseln sorgt für stets aktuelle gemeinsame Kalender- und Belegungsdaten bei minimaler Serverlast und ohne Verbindungsabbrüche.
- **Keine Einlasssimulation**: Die App spiegelt echte Belegungs- und Planungsdaten transparent wider, simuliert jedoch keine offizielle Schranken- oder Drehkreuzfreigabe und sperrt niemanden wegen theoretischer Kapazitätsgrenzen aus.

---

## 1. Overview & Core Concept

- **Was die App leistet**: Studierende am Campus Bad Mergentheim können geplante Gym-Besuche ankündigen, Live ein- und auschecken, sehen wer zu welcher Zeit im Gym ist und Trainingspartner anhand übereinstimmender Ziele (z. B. Hypertrophie, Kraftsport, Ausdauer) finden und anfragen.
- **Zielgruppe**: Studierende und DHBW-Angehörige am Campus Bad Mergentheim (und angeschlossenen DHBW-Standorten).
- **Kernnutzen**: Schluss mit überfülltem Kraftraum oder Alleintraining ohne Spotter: Transparenz über Trainingszeiten und einfaches Verabreden im geschützten Hochschulumfeld.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Gemeinsamer Kalender mit Eintrags-Typisierung**:
   - Studierende wählen einen Tag in der horizontalen Datumsleiste.
   - Der Kalender unterscheidet visuell eindeutig zwischen drei Zuständen:
     - **Geplante Anwesenheit** (blau): Freiwillig angekündigtes Zeitfenster (z. B. 17:00 – 18:30 Uhr).
     - **Reservierung / Slot** (violett): Vormerkung für Trainingszeiten.
     - **Tatsächlicher Check-in** (smaragdgrün mit Live-Status): Derzeit vor Ort im Gym trainierend mit Zeitzähler und individuellem "Jetzt auschecken"-Button.
   - Studierende können mit einem Klick eigene Trainingszeiten eintragen, anpassen oder stornieren.

2. **Community & Trainingspartner finden**:
   - Neuer dedizierter Reiter **Community** neben Kalender, Training und Fortschritt.
   - Filter nach Zielen (z. B. *Kraftaufbau*, *Hypertrophie*, *Calisthenics*, *Cardio*) und bevorzugten Trainingsfenstern (z. B. *Morgens*, *Nachmittags*, *Abends*).
   - Profilkarten zeigen Vorname, Studiengang/Fakultät (optional), Trainingsfokus und aktuelle Wochenaktivität.
   - Mit einem Klick kann eine unverbindliche Trainingspartner-Anfrage ("Gemeinsam trainieren am Mi, 18:00?") gesendet werden.
   - Anfragen können angenommen, abgelehnt oder storniert werden.

3. **Profil & Privatsphäre-Zentrale**:
   - Ergänzung der Profilansicht um:
     - Name (Vorname, Nachname)
     - Trainingsschwerpunkte & persönliche Ziele
     - Bevorzugte Trainingszeiten
     - **Sichtbarkeits-Toggle**: *"Meine Anwesenheit im gemeinsamen Kalender anzeigen"* (Sofortige serverseitige Wirkung).
     - DSGVO-konforme Datenbereinigung und Kontolöschung.

### Visual Identity & Theme (Mobile-First Ergonomics)

- **Aesthetic Direction**: Modernes, minimalistisches Dark Design in Anlehnung an das bestehende `gym.css`.
- **Farbpalette & Kontraste**:
  - Hintergrund: Deep Slate (`#0b0f17`) und Dark Obsidian (`#111827`).
  - Karten & Surfaces: Subtiles Slate (`#1f2937`) mit 1px Hairline-Borders (`#374151`).
  - Akzente: Smaragdgrün (`#10b981`) für Live-Anwesenheit, Kobaltblau (`#3b82f6`) für geplante Termine, Violett (`#8b5cf6`) für Reservierungen, Amber (`#f59e0b`) für offene Partneranfragen.
- **Typografie & Anti-Slop**:
  - Keine künstlichen Pillen-Sandwiches oder Pseudocodes.
  - Klare typografische Trennung (`·`, `/`) für Zeitfenster und Status.
  - Tabellarische Ziffern (`tabular-nums`) für Uhrzeiten und Zähler.
  - Touch-Targets $\ge 44\text{px}$ für alle mobilen Buttons und Auswahlelemente.

---

## 3. Key Product Decisions & Trade-Offs

### Entscheidung 1: Zugangskontrolle & E-Mail-Prüfung
- **Gewählter Ansatz**: Serverseitige Validierung der Registrierungs-E-Mail auf autorisierte DHBW-Domänen (`@*.dhbw.de`, `@dhbw-*.de`, `@lehre.dhbw-*.de` etc.) mit sauberer Normalisierung.
- **Begründung**: Die bestehende Codebasis besitzt ein lokales Credential-System (`gym_local_credentials` mit `scrypt`-Hashing). Da keine offizielle DHBW-SAML/SSO-Schnittstelle im Prototyp vorliegt, ist die strikte serverseitige Domain-Validierung der ehrlichste und sicherste Weg, fremde Personen fernzuhalten, ohne fiktive Schnittstellen zu erfinden.

### Entscheidung 2: Datenmodell & Anwesenheitshistorie
- **Gewählter Ansatz**: Klare Trennung zwischen vergangenem Log (`gym_visits`), aktuellen Check-ins (`manual_check_ins`), geplanten Terminen (`gym_reservations` / `gym_planned_attendances`) und Community-Profilen (`community_profiles`).
- **Begründung**: Verhindert Datenmüll und Duplikate. Veraltete Check-ins laufen nach definierter Frist automatisch ab (`cleanupExpiredData`) und werden als abgeschlossene Besuche archiviert.

### Entscheidung 3: Echtzeit-Synchronisation
- **Gewählter Ansatz**: Smartes Aktivitäts- und Fokus-Polling (Revalidierung bei Sichtbarkeitswechsel des Browser-Tabs, bei eigenen Aktionen sowie intervallbasiert alle 15 Sekunden).
- **Begründung**: Äußerst robust im mobilen Webview/Safari/Chrome ohne fehleranfällige WebSocket-Wiederverbindungsabrisse; schont Akkuleistung und Serverressourcen.

---

## 4. Technical Architecture & Data Strategy

### System- & Komponentenarchitektur

```
┌────────────────────────────────────────────────────────────────────────┐
│                          React Frontend (SPA)                          │
│                                                                        │
│   ┌─────────────────┐ ┌──────────────────┐ ┌────────────────────────┐  │
│   │  Calendar View  │ │  Community View  │ │     Dashboard View     │  │
│   │ (Geplant/Aktiv) │ │ (Partner/Suche)  │ │ (Live-Status/Check-in) │  │
│   └────────┬────────┘ └────────┬─────────┘ └───────────┬────────────┘  │
│            └───────────────────┼───────────────────────┘               │
│                                ▼                                       │
│                     gymRepository (Client API)                         │
│                    + Smart Poller / Focus Sync                         │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ HTTP / JSON (Vite Proxy: /api/gym/*)
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express Backend Engine                          │
│                          (server/gym-app.ts)                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                   gym-app-api.ts (REST Router)                 │   │
│   │     • /session, /register, /login, /logout                     │   │
│   │     • /calendar/events (Geplant vs. Reserviert vs. Check-in)   │   │
│   │     • /community/members (Filterbar, Sichtbarkeitsprüfung)     │   │
│   │     • /community/partner-requests (Senden, Annehmen, Absagen)  │   │
│   │     • /profile/community (Ziele, Zeiten, Datenschutz-Toggle)   │   │
│   │     • /check-in, /check-out                                    │   │
│   └────────────────────────────┬───────────────────────────────────┘   │
│                                ▼                                       │
│                       GymAppService.ts                                 │
│                 (Geschäftslogik & Berechtigungen)                      │
│                                ▼                                       │
│                      GymAppRepository.ts                               │
│              (SQLite DatabaseSync Transaktionen & Schema)              │
└────────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           SQLite Database                              │
│                                                                        │
│   • gym_principals & gym_local_credentials (DHBW E-Mails)             │
│   • community_profiles (Ziele, Zeiten, is_public_presence)             │
│   • manual_check_ins (Aktive Check-ins mit Verfallsdatum)              │
│   • gym_reservations (Geplante Anwesenheiten & Buchungen)              │
│   • training_partner_requests (Partner-Matches)                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Datenbankschema-Erweiterungen (SQLite)

1. **`community_profiles`**:
   - `principal_id TEXT PRIMARY KEY REFERENCES gym_principals(id) ON DELETE CASCADE`
   - `first_name TEXT NOT NULL`
   - `last_name_initial TEXT NOT NULL`
   - `course_of_study TEXT`
   - `training_goals TEXT NOT NULL DEFAULT '[]'` (JSON-Array: Hypertrophie, Kraft, Ausdauer etc.)
   - `preferred_times TEXT NOT NULL DEFAULT '[]'` (JSON-Array: morgens, nachmittags, abends)
   - `bio TEXT NOT NULL DEFAULT ''`
   - `is_public_presence INTEGER NOT NULL DEFAULT 1 CHECK (is_public_presence IN (0, 1))`
   - `updated_at TEXT NOT NULL`

2. **`training_partner_requests`**:
   - `id TEXT PRIMARY KEY`
   - `sender_id TEXT NOT NULL REFERENCES gym_principals(id) ON DELETE CASCADE`
   - `receiver_id TEXT NOT NULL REFERENCES gym_principals(id) ON DELETE CASCADE`
   - `note TEXT NOT NULL DEFAULT ''`
   - `proposed_date TEXT`
   - `status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'))`
   - `created_at TEXT NOT NULL`
   - `updated_at TEXT NOT NULL`

3. **Erweiterung `gym_reservations`**:
   - Bestehende Tabelle behalten und mit Spalte `entry_type TEXT NOT NULL DEFAULT 'planned' CHECK (entry_type IN ('planned', 'reservation'))` erweitern.

### Automatisierte Tests

Ergänzung solider Backend- und Service-Tests in `server/community.test.ts` und Erweiterung von `server/gym-app-api.test.ts`:
- Domain-Prüfung bei Registrierung (`@lehre.dhbw-mannheim.de` vs. `@gmail.com` abgelehnt).
- Datenschutz-Regeln (Anwesenheit wird nicht exponiert, wenn `is_public_presence = 0`).
- Berechtigung: Nur authentifizierte Nutzer mit aktiver Session können Kalender und Community abrufen.
- Check-in/Check-out Ablauf und Bereinigung veralteter Einträge.
- Partneranfragen-Lifecycle (Erstellen, Annehmen, Verhindern von Selbst-Anfragen).

---

## 5. Geplante Phasen der Umsetzung

1. **Phase 1: Code-Übernahme aus `feat/manual-gym-training-app` in den Workspace**
   - Bestehende Dateien des Branches aus `/tmp/prototyp1` sauber in den Applet-Workspace synchronisieren.
2. **Phase 2: Backend-Erweiterung (Datenbank, Service & API)**
   - Schemaerweiterung in `GymAppRepository.ts` (Community-Profile, Partneranfragen, Sichtbarkeits-Filter).
   - Registrierungsbeschränkung auf DHBW-Adressen.
   - Neue REST-Endpunkte für Community, Kalenderübersicht mit Eintrags-Typen und Partneranfragen.
3. **Phase 3: Frontend-Erweiterung (Kalender, Community & Profil)**
   - Überarbeitung von `Calendar.tsx` mit Differenzierung: Geplant, Reserviert, Eingecheckt.
   - Neue `Community.tsx`-Komponente mit Filtersuche nach Zielen/Zeiten und Partneranfragen-System.
   - Erweiterung von `Profile.tsx` um Trainingsinteressen und den Datenschutz-Toggle für die Anwesenheit.
   - Modernes Dark-Design-Styling (`gym.css`).
4. **Phase 4: Tests & Verifikation**
   - Ausführen von `npm test` und `compile_applet`.
   - Dokumentation aller Änderungen und Voraussetzungen für den Mehrbenutzerbetrieb.
