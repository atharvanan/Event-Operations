import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { ensureDemoData, DEMO_PASSWORD } from '../../src/utils/ensureDemoData.js';
import { Event } from '../../src/models/Event.js';

const app = createApp();

const DEMO_EMAILS = [
  'manager@royalweddings.com',
  'lead.catering@royalweddings.com',
  'member.stage@royalweddings.com',
];

describe('Instant Demo Login Auto-Seeding', () => {
  it('seeds demo workspace idempotently on empty DB so all 3 demo roles can log in', async () => {
    await ensureDemoData();
    await ensureDemoData(); // Verify idempotent re-run

    const eventCount = await Event.countDocuments();
    expect(eventCount).toBe(2);

    for (const email of DEMO_EMAILS) {
      const res = await request(app).post('/api/v1/auth/login').send({
        email,
        password: DEMO_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.organization).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
    }
  });

  it('repairs partial registration state where manager exists with custom password and 0 events', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'vikram',
      email: 'manager@royalweddings.com',
      password: 'WrongCustomPassword@999',
      organizationName: 'asf',
    });
    expect(registerRes.status).toBe(201);

    await ensureDemoData();

    for (const email of DEMO_EMAILS) {
      const res = await request(app).post('/api/v1/auth/login').send({
        email,
        password: DEMO_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.organization).toBeDefined();
    }

    const managerLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'manager@royalweddings.com',
      password: DEMO_PASSWORD,
    });
    const eventsRes = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${managerLogin.body.data.token}`);

    expect(eventsRes.status).toBe(200);
    expect(eventsRes.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

