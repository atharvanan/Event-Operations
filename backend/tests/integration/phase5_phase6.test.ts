import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { Organization } from '../../src/models/Organization.js';
import { OrganizationMembership } from '../../src/models/OrganizationMembership.js';
import { Event } from '../../src/models/Event.js';
import { EventMembership } from '../../src/models/EventMembership.js';
import { Team } from '../../src/models/Team.js';
import { Task } from '../../src/models/Task.js';
import { TaskActivity } from '../../src/models/TaskActivity.js';
import { Conversation } from '../../src/models/Conversation.js';
import { Notification } from '../../src/models/Notification.js';
import { OrgRole, EventRole, TaskStatus, TaskPriority, ConversationType } from '../../src/constants/index.js';

describe('Phase 5 & 6 — Command Center, Configurable Permissions & Push Notifications', () => {
  const app = createApp();

  let managerToken: string;
  let workerToken: string;
  let managerId: string;
  let workerId: string;
  let orgId: string;
  let eventId: string;
  let teamId: string;
  let taskId: string;
  let globalConvId: string;

  beforeEach(async () => {
    // 1. Register users via API
    const mgrRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Priya Sharma (Command Lead)',
      email: 'priya.sharma@operations.test',
      password: 'Password123!',
      preferredLanguage: 'en',
    });
    managerToken = mgrRes.body.data.token;
    managerId = mgrRes.body.data.user._id;

    const workerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Rohan Patil (Floor Staff)',
      email: 'rohan.patil@operations.test',
      password: 'Password123!',
      preferredLanguage: 'mr',
    });
    workerToken = workerRes.body.data.token;
    workerId = workerRes.body.data.user._id;

    const org = await Organization.create({
      name: 'Apex Grand Events Org',
      slug: 'apex-grand-events',
      ownerId: managerId,
    });
    orgId = org._id.toString();

    await OrganizationMembership.create({
      orgId: org._id,
      userId: managerId,
      role: OrgRole.OWNER,
    });
    await OrganizationMembership.create({
      orgId: org._id,
      userId: workerId,
      role: OrgRole.MEMBER,
    });

    // 2. Create Event
    const event = await Event.create({
      orgId: org._id,
      name: 'Destination Wedding Command Center Live',
      type: 'wedding',
      venue: 'The Grand Taj Lakefront Palace',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      managerId,
      zones: ['Main Mandap', 'Royal Banquet', 'Poolside Lounge'],
      permissions: {
        allowWorkersGlobalChat: true,
        allowWorkersTeamChat: true,
        requireLeadReviewFirst: true,
        allowLeadTaskCreation: true,
        allowWorkerSelfAssignment: false,
      },
    });
    eventId = event._id.toString();

    await EventMembership.create({
      eventId: event._id,
      userId: managerId,
      role: EventRole.EVENT_MANAGER,
    });
    await EventMembership.create({
      eventId: event._id,
      userId: workerId,
      role: EventRole.TEAM_MEMBER,
    });

    // 3. Create Team
    const team = await Team.create({
      eventId: event._id,
      name: 'Lighting & Stage FX Production',
      leadId: managerId,
      memberIds: [workerId],
      colorHex: '#8B5CF6',
    });
    teamId = team._id.toString();

    // 4. Create Task
    const task = await Task.create({
      eventId: event._id,
      teamId: team._id,
      title: 'Setup intelligent beam moving heads on truss',
      description: 'Mount and patch 12 Sharpy moving heads on front truss',
      zone: 'Main Mandap',
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assigneeId: workerId,
      creatorId: managerId,
      dueTime: new Date(Date.now() + 3600000),
      evidenceRequired: false,
      minEvidenceCount: 0,
    });
    taskId = task._id.toString();

    // Log Activity
    await TaskActivity.create({
      taskId: task._id,
      actorId: workerId,
      action: 'STATUS_CHANGED',
      previousValue: TaskStatus.TO_DO,
      newValue: TaskStatus.IN_PROGRESS,
      reason: 'Rigging commenced on site',
    });

    // Global conversation
    const globalConv = await Conversation.create({
      eventId: event._id,
      type: ConversationType.GLOBAL_EVENT,
      title: 'Global Event Comms',
      participantIds: [managerId, workerId],
    });
    globalConvId = globalConv._id.toString();
  });

  it('should retrieve event activities and team/worker workload analytics', async () => {
    // 1. Activities feed
    const actRes = await request(app)
      .get(`/api/v1/events/${eventId}/activities`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(actRes.status).toBe(200);
    expect(actRes.body.success).toBe(true);
    expect(Array.isArray(actRes.body.data)).toBe(true);
    expect(actRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(actRes.body.data[0].action).toBe('STATUS_CHANGED');

    // 2. Workload analytics
    const wlRes = await request(app)
      .get(`/api/v1/events/${eventId}/workload`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(wlRes.status).toBe(200);
    expect(wlRes.body.success).toBe(true);
    expect(wlRes.body.data.teamsSummary.length).toBe(1);
    expect(wlRes.body.data.teamsSummary[0].teamName).toBe('Lighting & Stage FX Production');
    expect(wlRes.body.data.workersSummary.length).toBeGreaterThanOrEqual(1);
  });

  it('should dynamically update configurable permissions and enforce chat restrictions on workers', async () => {
    // 1. Verify worker can post when allowed
    const postRes1 = await request(app)
      .post(`/api/v1/conversations/${globalConvId}/messages`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ content: 'Soundcheck starting in 5 minutes!' });

    expect(postRes1.status).toBe(201);

    // 2. Event Manager disables worker global chat permissions
    const permRes = await request(app)
      .patch(`/api/v1/events/${eventId}/permissions`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ allowWorkersGlobalChat: false });

    expect(permRes.status).toBe(200);
    expect(permRes.body.data.allowWorkersGlobalChat).toBe(false);

    // 3. Worker attempt to post now is blocked (403 Forbidden)
    const postRes2 = await request(app)
      .post(`/api/v1/conversations/${globalConvId}/messages`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ content: 'Another message that should be blocked' });

    expect(postRes2.status).toBe(403);
    expect(postRes2.body.message).toContain('disabled');
  });

  it('should support notification retrieval, marking as read, and VAPID key registration', async () => {
    // 1. Get VAPID public key
    const vapidRes = await request(app)
      .get('/api/v1/notifications/vapid-key')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(vapidRes.status).toBe(200);
    expect(vapidRes.body.data.publicKey).toBeDefined();

    // 2. Register Web Push subscription
    const subRes = await request(app)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/test-endpoint',
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0448G3D55wzKEQW7209LDq0i08aKA3iW0zZ_Test',
          auth: 'tBHItJI5svbpez7KI4CCXg==',
        },
      });

    expect(subRes.status).toBe(201);

    // 3. Create test notification
    const testNotif = await Notification.create({
      recipientId: workerId,
      eventId,
      title: '🚨 Blocker Alert',
      body: 'Power generator tripped on Zone B',
      type: 'BLOCKER_RAISED',
    });

    // 4. Retrieve notifications
    const getRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.unreadCount).toBeGreaterThanOrEqual(1);

    // 5. Mark as read
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${testNotif._id}/read`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.isRead).toBe(true);
  });
});
