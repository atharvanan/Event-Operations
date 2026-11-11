import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Organization } from '../../src/models/Organization.js';
import { OrganizationMembership } from '../../src/models/OrganizationMembership.js';
import { Event } from '../../src/models/Event.js';
import { EventMembership } from '../../src/models/EventMembership.js';
import { Team } from '../../src/models/Team.js';
import { Task } from '../../src/models/Task.js';
import { OrgRole, EventRole, TaskStatus } from '../../src/constants/index.js';
import { generateToken } from '../../src/utils/jwt.js';

const app = createApp();

describe('Attendees, QR Check-in, Extended Event Fields, Dashboard Summary & Offline Conflict Detection', () => {
  let manager: any;
  let managerToken: string;
  let worker: any;
  let workerToken: string;
  let outsider: any;
  let outsiderToken: string;
  let org: any;
  let event: any;
  let otherEvent: any;
  let team: any;

  beforeEach(async () => {
    manager = await User.create({
      name: 'Atharva Deshmukh',
      email: 'atharva@eventops.local',
      password: 'Password@123',
      preferredLanguage: 'en',
    });

    worker = await User.create({
      name: 'Kiran Patil',
      email: 'kiran@eventops.local',
      password: 'Password@123',
      preferredLanguage: 'mr',
    });

    outsider = await User.create({
      name: 'External User',
      email: 'outsider@otherorg.local',
      password: 'Password@123',
      preferredLanguage: 'en',
    });

    org = await Organization.create({
      name: 'TechConnect Ops Org',
      slug: 'techconnect-ops-org',
      ownerId: manager._id,
    });

    const otherOrg = await Organization.create({
      name: 'Separate Org',
      slug: 'separate-org',
      ownerId: outsider._id,
    });

    await OrganizationMembership.create({
      orgId: org._id,
      userId: manager._id,
      role: OrgRole.OWNER,
      status: 'active',
    });

    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 8 * 60 * 60 * 1000);

    event = await Event.create({
      orgId: org._id,
      name: 'TechConnect 2026',
      type: 'corporate',
      venue: 'Amravati Convention Center',
      address: 'Exhibition Plaza, Amravati',
      eventMode: 'hybrid',
      registrationConfig: {
        enabled: true,
        capacity: 2,
        requireApproval: false,
        checkInOpen: true,
        requirements: ['QR Badge Pass'],
      },
      managerId: manager._id,
      startDate: start,
      endDate: end,
      zones: ['Registration Desk', 'Main Hall'],
      status: 'planning',
    });

    otherEvent = await Event.create({
      orgId: otherOrg._id,
      name: 'Other Summit',
      type: 'corporate',
      venue: 'Pune Expo Hall',
      managerId: outsider._id,
      startDate: start,
      endDate: end,
      status: 'planning',
    });

    await EventMembership.create({
      eventId: event._id,
      userId: manager._id,
      role: EventRole.EVENT_MANAGER,
      status: 'active',
    });

    team = await Team.create({
      eventId: event._id,
      name: 'Guest Check-in Crew',
      memberIds: [worker._id],
      colorHex: '#43328E',
    });

    await EventMembership.create({
      eventId: event._id,
      userId: worker._id,
      role: EventRole.TEAM_MEMBER,
      teamId: team._id,
      status: 'active',
    });

    managerToken = generateToken({
      userId: manager._id.toString(),
      email: manager.email,
      name: manager.name,
      orgId: org._id.toString(),
      orgRole: OrgRole.OWNER,
    });

    workerToken = generateToken({
      userId: worker._id.toString(),
      email: worker.email,
      name: worker.name,
      orgId: org._id.toString(),
      orgRole: OrgRole.MEMBER,
    });

    outsiderToken = generateToken({
      userId: outsider._id.toString(),
      email: outsider.email,
      name: outsider.name,
      orgId: '',
      orgRole: OrgRole.MEMBER,
    });
  });

  it('should create event with 4-step extended metadata while preserving backward compatibility', async () => {
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 2 * 86400000).toISOString();

    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Annual Ops Expo',
        type: 'exhibition',
        venue: 'Mumbai BKC Center',
        address: 'G Block BKC, Mumbai',
        locationDetails: 'Gate 3 VIP Entry',
        eventMode: 'hybrid',
        startDate: start,
        endDate: end,
        registrationConfig: {
          enabled: true,
          capacity: 300,
          requireApproval: false,
          checkInOpen: true,
          requirements: ['Photo ID'],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.address).toBe('G Block BKC, Mumbai');
    expect(res.body.data.eventMode).toBe('hybrid');
    expect(res.body.data.registrationConfig.capacity).toBe(300);
  });

  it('should register attendees, enforce capacity & duplicate emails, and execute valid/duplicate/invalid QR check-ins', async () => {
    // 1. Register first attendee
    const reg1 = await request(app)
      .post(`/api/v1/events/${event._id}/attendees`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Sneha Joshi',
        email: 'sneha@example.com',
        ticketType: 'VIP',
      });

    expect(reg1.status).toBe(201);
    expect(reg1.body.data.ticketCode).toMatch(/^EO-/);
    expect(reg1.body.data.qrPayload).toContain(event._id.toString());

    // 2. Duplicate email check
    const dupReg = await request(app)
      .post(`/api/v1/events/${event._id}/attendees`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Sneha Duplicate',
        email: 'SNEHA@example.com',
      });
    expect(dupReg.status).toBe(409);

    // 3. Register second attendee (reaches capacity = 2)
    await request(app)
      .post(`/api/v1/events/${event._id}/attendees`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Rahul Nair',
        email: 'rahul@example.com',
      });

    // 4. Third registration rejected due to capacity = 2
    const capRes = await request(app)
      .post(`/api/v1/events/${event._id}/attendees`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Over Capacity',
        email: 'cap@example.com',
      });
    expect(capRes.status).toBe(400);

    // 5. Valid QR Check-in by crew member with offline idempotency key
    const checkin1 = await request(app)
      .post(`/api/v1/events/${event._id}/attendees/check-in`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        qrPayload: reg1.body.data.qrPayload,
        idempotencyKey: 'scan-001',
      });

    expect(checkin1.status).toBe(200);
    expect(checkin1.body.code).toBe('CHECKED_IN');
    expect(checkin1.body.data.status).toBe('checked_in');

    // 6. Idempotent retry returns 200
    const idempRetry = await request(app)
      .post(`/api/v1/events/${event._id}/attendees/check-in`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        qrPayload: reg1.body.data.qrPayload,
        idempotencyKey: 'scan-001',
      });
    expect(idempRetry.status).toBe(200);

    // 7. Duplicate scan without same idempotencyKey warns with 409 ALREADY_CHECKED_IN
    const dupScan = await request(app)
      .post(`/api/v1/events/${event._id}/attendees/check-in`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        ticketCode: reg1.body.data.ticketCode,
        idempotencyKey: 'scan-002',
      });
    expect(dupScan.status).toBe(409);
    expect(dupScan.body.code).toBe('ALREADY_CHECKED_IN');

    // 8. Cross-event QR ticket rejected
    const wrongEvent = await request(app)
      .post(`/api/v1/events/${event._id}/attendees/check-in`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        qrPayload: `EVENTOPS:${otherEvent._id.toString()}:${reg1.body.data.ticketCode}`,
      });
    expect(wrongEvent.status).toBe(404);
    expect(wrongEvent.body.code).toBe('INVALID_TICKET');

    // 9. Unauthorized outsider rejected
    const unauth = await request(app)
      .get(`/api/v1/events/${event._id}/attendees`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(unauth.status).toBe(403);
  });

  it('should detect stale offline task update conflict (409 VERSION_CONFLICT) instead of silently overwriting server data', async () => {
    const task = await Task.create({
      eventId: event._id,
      teamId: team._id,
      title: 'Calibrate Entry Scanners',
      assigneeId: worker._id,
      creatorId: manager._id,
      dueTime: new Date(Date.now() + 3600000),
      status: TaskStatus.TO_DO,
      evidenceRequired: false,
    });

    const staleClientTimestamp = new Date(task.updatedAt.getTime() - 10000).toISOString();

    const conflictRes = await request(app)
      .patch(`/api/v1/tasks/${task._id}/status`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        status: TaskStatus.IN_PROGRESS,
        expectedUpdatedAt: staleClientTimestamp,
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.code).toBe('VERSION_CONFLICT');
  });

  it('should invite event team member and return accurate dashboard summary metrics scoped to authorized user', async () => {
    const inviteRes = await request(app)
      .post(`/api/v1/events/${event._id}/invite`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        email: 'newlead@eventops.local',
        name: 'Maya Deshmukh',
        role: EventRole.TEAM_LEAD,
        teamId: team._id.toString(),
      });

    expect(inviteRes.status).toBe(201);

    const summaryRes = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.overview.totalEvents).toBe(1);
    expect(summaryRes.body.data.overview.teamMembers).toBeGreaterThanOrEqual(2);
    expect(summaryRes.body.data.upcomingEvents[0].name).toBe('TechConnect 2026');
  });
});
