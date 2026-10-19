import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createGymAppApi } from './gym-app-api.ts';
import { isDhbwEmail } from './gymAppService.ts';

test('isDhbwEmail accurately validates official DHBW email domains', () => {
  assert.equal(isDhbwEmail('student@bad-mergentheim.dhbw.de'), true);
  assert.equal(isDhbwEmail('max.mustermann@dhbw-stuttgart.de'), true);
  assert.equal(isDhbwEmail('dozent@lehre.dhbw-mannheim.de'), true);
  assert.equal(isDhbwEmail('info@dhbw.de'), true);
  assert.equal(isDhbwEmail('student@dhbw-mosbach.de'), true);
  assert.equal(isDhbwEmail('student@gmail.com'), false);
  assert.equal(isDhbwEmail('attacker@evil-dhbw.com'), false);
  assert.equal(isDhbwEmail('not-an-email'), false);
});

test('DHBW Gym Community API workflow: registration domain check, privacy, calendar and partner requests', async (t) => {
  const db = new DatabaseSync(':memory:');
  const app = createGymAppApi(db, {
    maxCheckInHours: 8,
    secureCookies: false,
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(() => server.close());

  const address = server.address() as import('node:net').AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Helper for requests
  async function api(path: string, options: { method?: string; body?: any; cookie?: string } = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.cookie) headers['Cookie'] = options.cookie;
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const setCookie = response.headers.get('set-cookie');
    const cookie = setCookie ? setCookie.split(';')[0] : undefined;
    const data = response.status !== 204 ? await response.json() : null;
    return { status: response.status, data, cookie };
  }

  // 1. Rejection of non-DHBW email
  const failReg = await api('/api/gym/register', {
    method: 'POST',
    body: { email: 'student@external-univ.de', password: 'Password1234!' },
  });
  assert.equal(failReg.status, 400);
  assert.match(failReg.data.error, /DHBW-E-Mail/i);

  // 2. Successful registration of User A (DHBW Bad Mergentheim)
  const regUserA = await api('/api/gym/register', {
    method: 'POST',
    body: {
      email: 'anna.schmidt@bad-mergentheim.dhbw.de',
      password: 'StrongPassword123!',
      firstName: 'Anna',
      lastNameInitial: 'S',
      courseOfStudy: 'Wirtschaftsinformatik',
      trainingGoals: ['Hypertrophie (Muskelaufbau)', 'Kraftsport'],
      preferredTimes: ['Nachmittags (15:00 - 18:00)'],
    },
  });
  assert.equal(regUserA.status, 201);
  const cookieA = regUserA.cookie;
  assert.ok(cookieA);

  // 3. User A checks their community profile
  const profA = await api('/api/gym/profile/community', { cookie: cookieA });
  assert.equal(profA.status, 200);
  assert.equal(profA.data.profile.firstName, 'Anna');
  assert.equal(profA.data.profile.lastNameInitial, 'S');
  assert.equal(profA.data.profile.isPublicPresence, true);

  // 4. Register User B (DHBW Mosbach)
  const regUserB = await api('/api/gym/register', {
    method: 'POST',
    body: {
      email: 'ben.mueller@dhbw-mosbach.de',
      password: 'StrongPassword456!',
      firstName: 'Ben',
      lastNameInitial: 'M',
      courseOfStudy: 'Angewandte Informatik',
      trainingGoals: ['Kraftsport'],
      preferredTimes: ['Nachmittags (15:00 - 18:00)'],
    },
  });
  assert.equal(regUserB.status, 201);
  const cookieB = regUserB.cookie;
  assert.ok(cookieB);

  // 5. User A creates a planned attendance in Calendar
  const tomorrow = new Date(Date.now() + 86400_000);
  tomorrow.setHours(16, 0, 0, 0);
  const createPlanned = await api('/api/gym/bookings', {
    method: 'POST',
    cookie: cookieA,
    body: {
      startsAt: tomorrow.toISOString(),
      durationMinutes: 90,
      title: 'Oberkörper / Bankdrücken',
      entryType: 'planned',
    },
  });
  assert.equal(createPlanned.status, 201);
  assert.equal(createPlanned.data.booking.entryType, 'planned');

  // 6. User B views calendar events - sees Anna S.'s planned session
  const calEvents = await api('/api/gym/calendar/events', { cookie: cookieB });
  assert.equal(calEvents.status, 200);
  const foundAnnaEvent = calEvents.data.events.find((e: any) => e.title === 'Oberkörper / Bankdrücken');
  assert.ok(foundAnnaEvent, 'User B should see Anna planned training');
  assert.equal(foundAnnaEvent.entryType, 'planned');
  assert.equal(foundAnnaEvent.userName, 'Anna S.');
  assert.equal(foundAnnaEvent.isMine, false);

  // 7. Privacy check: Anna switches isPublicPresence to false
  await api('/api/gym/profile/community', {
    method: 'PUT',
    cookie: cookieA,
    body: { isPublicPresence: false },
  });

  // User B views calendar again - Anna's name is now masked for privacy
  const calEventsAfterPrivate = await api('/api/gym/calendar/events', { cookie: cookieB });
  const maskedEvent = calEventsAfterPrivate.data.events.find((e: any) => e.id === foundAnnaEvent.id);
  assert.ok(maskedEvent);
  assert.equal(maskedEvent.userName, 'Anonymer DHBW Student');

  // But Anna herself still sees her own name
  const annaOwnCalendar = await api('/api/gym/calendar/events', { cookie: cookieA });
  const ownEvent = annaOwnCalendar.data.events.find((e: any) => e.id === foundAnnaEvent.id);
  assert.ok(ownEvent);
  assert.equal(ownEvent.isMine, true);

  // 8. User B sends User A a partner request
  const members = await api('/api/gym/community/members', { cookie: cookieB });
  assert.equal(members.status, 200);
  const annaMember = members.data.members.find((m: any) => m.firstName === 'Anna');
  assert.ok(annaMember);

  const partnerReq = await api('/api/gym/community/partner-requests', {
    method: 'POST',
    cookie: cookieB,
    body: {
      receiverId: annaMember.id,
      proposedDate: tomorrow.toISOString(),
      note: 'Hi Anna, trainieren wir morgen zusammen Bankdrücken?',
    },
  });
  assert.equal(partnerReq.status, 201);

  // 9. User A receives and accepts the partner request
  const annaRequests = await api('/api/gym/community/partner-requests', { cookie: cookieA });
  assert.equal(annaRequests.status, 200);
  const incoming = annaRequests.data.requests.find((r: any) => r.id === partnerReq.data.id);
  assert.ok(incoming);
  assert.equal(incoming.isIncoming, true);
  assert.equal(incoming.status, 'pending');

  const acceptReq = await api(`/api/gym/community/partner-requests/${incoming.id}`, {
    method: 'PUT',
    cookie: cookieA,
    body: { status: 'accepted' },
  });
  assert.equal(acceptReq.status, 200);
  assert.equal(acceptReq.data.status, 'accepted');

  // 10. Check-in and Check-out
  const checkInRes = await api('/api/gym/check-in', { method: 'POST', cookie: cookieA });
  assert.equal(checkInRes.status, 200);
  assert.ok(checkInRes.data.checkedInAt);

  // Live occupancy includes active check-in
  const occupancy = await api('/api/gym/occupancy', { cookie: cookieB });
  assert.ok(occupancy.data.count >= 1);

  // Check-out
  const checkOutRes = await api('/api/gym/check-out', { method: 'POST', cookie: cookieA });
  assert.equal(checkOutRes.status, 200);
});
