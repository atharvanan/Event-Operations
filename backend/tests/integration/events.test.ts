import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { Conversation } from '../../src/models/Conversation.js';

const app = createApp();

describe('Event & RBAC Workflows (Phase 1)', () => {
  it('should allow manager to create an event and automatically scaffold global conversation', async () => {
    // 1. Register manager
    const managerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Priya Verma',
      email: 'priya@apexevents.com',
      password: 'Password@123',
      organizationName: 'Apex Event Productions',
    });

    const token = managerRes.body.data.token;
    const orgId = managerRes.body.data.organization._id;

    // 2. Create Event
    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orgId,
        name: 'The Grand Heritage Palace Wedding',
        type: 'wedding',
        venue: 'Heritage Palace Grounds, Jaipur',
        startDate: '2026-12-15T08:00:00.000Z',
        endDate: '2026-12-16T22:00:00.000Z',
        zones: ['Mandap Stage', 'Dining Lawns', 'Entrance Arch', 'VIP Suite'],
      });

    expect(eventRes.status).toBe(201);
    expect(eventRes.body.success).toBe(true);
    expect(eventRes.body.data.name).toBe('The Grand Heritage Palace Wedding');
    expect(eventRes.body.data.zones).toHaveLength(4);

    const eventId = eventRes.body.data._id;

    // 3. Verify Global Event Conversation was created
    const conversation = await Conversation.findOne({ eventId, type: 'GLOBAL_EVENT' });
    expect(conversation).toBeDefined();
    expect(conversation?.title).toContain('Grand Heritage Palace');

    // 4. Retrieve Event Details
    const detailRes = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.event.name).toBe('The Grand Heritage Palace Wedding');
    expect(detailRes.body.data.userRole).toBe('EVENT_MANAGER');
  });

  it('should enforce RBAC: unauthorized user cannot update event', async () => {
    // 1. Register Manager
    const managerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Manager User',
      email: 'manager@events.com',
      password: 'Password@123',
      organizationName: 'Premier Events',
    });
    const managerToken = managerRes.body.data.token;
    const orgId = managerRes.body.data.organization._id;

    // Create event
    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        orgId,
        name: 'Corporate Summit 2026',
        venue: 'Grand Ballroom',
        startDate: '2026-11-20T09:00:00.000Z',
        endDate: '2026-11-20T18:00:00.000Z',
      });
    const eventId = eventRes.body.data._id;

    // 2. Register separate unauthorized user
    const unauthRes = await request(app).post('/api/v1/auth/register').send({
      name: 'External Member',
      email: 'external@other.com',
      password: 'Password@123',
      organizationName: 'Other Agency',
    });
    const unauthToken = unauthRes.body.data.token;

    // 3. Attempt update by unauthorized user -> Should fail with 403 Forbidden
    const updateRes = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${unauthToken}`)
      .send({
        name: 'Hacked Event Name',
      });

    expect(updateRes.status).toBe(403);
    expect(updateRes.body.success).toBe(false);
  });
});
