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
import { TaskActivity } from '../../src/models/TaskActivity.js';
import { Evidence } from '../../src/models/Evidence.js';
import { Conversation } from '../../src/models/Conversation.js';
import { OrgRole, EventRole, TaskStatus, TaskPriority, EvidenceReviewStatus, ConversationType } from '../../src/constants/index.js';
import { generateToken } from '../../src/utils/jwt.js';

const app = createApp();

describe('Final QA Test Plan — 100 Test Cases Verification & Hardening Suite', () => {
  let orgOwner: any;
  let ownerToken: string;
  let org: any;
  let manager: any;
  let managerToken: string;
  let lead: any;
  let leadToken: string;
  let worker: any;
  let workerToken: string;
  let otherOrgUser: any;
  let otherOrgToken: string;
  let event: any;
  let team: any;

  beforeEach(async () => {
    // 1. Create Organization Owner
    orgOwner = await User.create({
      name: 'Priya Sharma',
      email: 'priya.sharma@eventops.local',
      password: 'password123',
      preferredLanguage: 'en',
    });
    ownerToken = generateToken({
      userId: orgOwner._id.toString(),
      email: orgOwner.email,
      name: orgOwner.name,
      orgId: '',
      orgRole: OrgRole.OWNER,
    });

    // 2. Create Organization
    org = await Organization.create({
      name: 'Royal Weddings & Expos India',
      slug: 'royal-weddings-india',
      ownerId: orgOwner._id,
    });

    await OrganizationMembership.create({
      orgId: org._id,
      userId: orgOwner._id,
      role: OrgRole.OWNER,
      status: 'active',
    });

    // 3. Create Manager, Lead, Worker
    manager = await User.create({
      name: 'Amit Patel',
      email: 'amit.patel@eventops.local',
      password: 'password123',
      preferredLanguage: 'en',
    });
    managerToken = generateToken({
      userId: manager._id.toString(),
      email: manager.email,
      name: manager.name,
      orgId: org._id.toString(),
      orgRole: OrgRole.ADMIN,
    });
    await OrganizationMembership.create({
      orgId: org._id,
      userId: manager._id,
      role: OrgRole.ADMIN,
      status: 'active',
    });

    lead = await User.create({
      name: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@eventops.local',
      password: 'password123',
      preferredLanguage: 'mr',
    });
    leadToken = generateToken({
      userId: lead._id.toString(),
      email: lead.email,
      name: lead.name,
      orgId: org._id.toString(),
      orgRole: OrgRole.MEMBER,
    });
    await OrganizationMembership.create({
      orgId: org._id,
      userId: lead._id,
      role: OrgRole.MEMBER,
      status: 'active',
    });

    worker = await User.create({
      name: 'Suresh Kumar',
      email: 'suresh.kumar@eventops.local',
      password: 'password123',
      preferredLanguage: 'hi',
    });
    workerToken = generateToken({
      userId: worker._id.toString(),
      email: worker.email,
      name: worker.name,
      orgId: org._id.toString(),
      orgRole: OrgRole.MEMBER,
    });
    await OrganizationMembership.create({
      orgId: org._id,
      userId: worker._id,
      role: OrgRole.MEMBER,
      status: 'active',
    });

    // User in another organization (tenant isolation testing)
    const otherOrg = await Organization.create({
      name: 'Apex Competitor Events',
      slug: 'apex-competitor-events',
      ownerId: orgOwner._id,
    });
    otherOrgUser = await User.create({
      name: 'External Hacker',
      email: 'external@othercorp.com',
      password: 'password123',
    });
    otherOrgToken = generateToken({
      userId: otherOrgUser._id.toString(),
      email: otherOrgUser.email,
      name: otherOrgUser.name,
      orgId: otherOrg._id.toString(),
      orgRole: OrgRole.MEMBER,
    });
    await OrganizationMembership.create({
      orgId: otherOrg._id,
      userId: otherOrgUser._id,
      role: OrgRole.MEMBER,
      status: 'active',
    });

    // 4. Create Event
    event = await Event.create({
      orgId: org._id,
      name: 'Grand Mega Fest Pune 2026',
      type: 'EXHIBITION',
      venue: 'Shivaji Nagar Ground, Pune',
      timezone: 'Asia/Kolkata',
      startDate: new Date('2026-12-01T08:00:00Z'),
      endDate: new Date('2026-12-05T22:00:00Z'),
      managerId: manager._id,
      status: 'planning',
    });

    await EventMembership.create({
      eventId: event._id,
      userId: manager._id,
      role: EventRole.EVENT_MANAGER,
      status: 'active',
    });

    // 5. Create Team with Custom Name (Free-form team naming mandate!)
    team = await Team.create({
      eventId: event._id,
      name: 'VIP Hospitality & Green Room Squad',
      description: 'Handles VVIP protocol and green room hospitality',
      colorHex: '#8B5CF6',
      icon: 'ShieldCheck',
      leadId: lead._id,
      memberIds: [worker._id],
      isActive: true,
    });

    await EventMembership.create({
      eventId: event._id,
      userId: lead._id,
      teamId: team._id,
      role: EventRole.TEAM_LEAD,
      status: 'active',
    });

    await EventMembership.create({
      eventId: event._id,
      userId: worker._id,
      teamId: team._id,
      role: EventRole.TEAM_MEMBER,
      status: 'active',
    });

    // Create Global Event Conversation
    await Conversation.create({
      eventId: event._id,
      type: ConversationType.GLOBAL_EVENT,
      title: 'Global Event Announcements',
      participantIds: [manager._id, lead._id, worker._id],
    });

    // Create Team Chat Conversation
    await Conversation.create({
      eventId: event._id,
      teamId: team._id,
      type: ConversationType.TEAM_INTERNAL,
      title: `${team.name} Channel`,
      participantIds: [manager._id, lead._id, worker._id],
    });
  });

  // ==========================================
  // 1. Authentication (AUTH-01..05)
  // ==========================================
  describe('1. Authentication Module', () => {
    it('AUTH-02 & AUTH-03: should validate inputs and prevent duplicate registration with varied letter casing & spaces', async () => {
      // Missing fields
      const res1 = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: '', email: '', password: '' });
      expect(res1.status).toBe(400);

      // Password too short
      const res2 = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: '123' });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('at least 6 characters');

      // Duplicate registration with uppercase & spaces
      const res3 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Priya Duplicate',
          email: '  PRIYA.sharma@EventOps.local  ',
          password: 'SecretPassword123!',
        });
      expect(res3.status).toBe(400);
      expect(res3.body.message).toContain('already exists');
    });

    it('AUTH-05: should reject invalid credentials without revealing whether email exists (prevent enumeration)', async () => {
      // Wrong password for existing user
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'priya.sharma@eventops.local', password: 'WrongPassword999!' });
      expect(res1.status).toBe(401);
      expect(res1.body.message).toBe('Invalid email or password.');

      // Non-existent user
      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost.user.xyz@unknown.org', password: 'AnyPassword123!' });
      expect(res2.status).toBe(401);
      expect(res2.body.message).toBe('Invalid email or password.');
    });
  });

  // ==========================================
  // 2. Authorization & Tenant Isolation (RBAC-01..07)
  // ==========================================
  describe('2. Authorization & Tenant Isolation Module', () => {
    it('RBAC-01 & RBAC-05: should reject cross-organization / external user access to private event data', async () => {
      const res = await request(app)
        .get(`/api/v1/events/${event._id}`)
        .set('Authorization', `Bearer ${otherOrgToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('RBAC-07: should prevent worker from performing manager-only final verification', async () => {
      const parentTask = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'VIP Stage Setup and Sound Check',
        priority: TaskPriority.HIGH,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        assigneeId: lead._id,
        status: TaskStatus.IN_PROGRESS,
        evidenceRequired: false,
      });

      // Worker tries to complete the parent task
      const res = await request(app)
        .patch(`/api/v1/tasks/${parentTask._id}/status`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ status: TaskStatus.COMPLETED });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 3. Event Management (EVT-01..03 & E2E-06)
  // ==========================================
  describe('3. Event Management Module', () => {
    it('EVT-02: should reject event creation when endDate is before or equal to startDate', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('x-org-id', org._id.toString())
        .send({
          orgId: org._id.toString(),
          name: 'Invalid Date Event',
          venue: 'Balewadi Stadium',
          startDate: '2026-12-10T10:00:00Z',
          endDate: '2026-12-09T10:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('End date must be after start date');
    });

    it('EVT-03 & E2E-06: should prevent event archiving when unresolved tasks remain', async () => {
      // Create an open task
      await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Unfinished Sound Cable Wiring',
        priority: TaskPriority.MEDIUM,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        status: TaskStatus.IN_PROGRESS,
        evidenceRequired: false,
      });

      // Attempt to archive the event
      const archiveRes = await request(app)
        .put(`/api/v1/events/${event._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'archived' });

      expect(archiveRes.status).toBe(400);
      expect(archiveRes.body.message).toContain('Cannot archive event');
      expect(archiveRes.body.message).toContain('unresolved');
    });

    it('EVT-03: should reject creating new tasks in an archived event', async () => {
      // Complete all tasks and archive event
      await Task.deleteMany({ eventId: event._id });
      await Event.findByIdAndUpdate(event._id, { status: 'archived' });

      const res = await request(app)
        .post(`/api/v1/events/${event._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Post-event cleanup task',
          dueTime: new Date(Date.now() + 86400000),
          teamId: team._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot create tasks in an archived event');
    });
  });

  // ==========================================
  // 4. Team Management (TEAM-01..05)
  // ==========================================
  describe('4. Team Management Module', () => {
    it('TEAM-01: should allow Event Manager to create teams with any custom name (unrestricted naming)', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${event._id}/teams`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Special Drone Flying & Pyro Effects 🚀',
          description: 'Custom team name configured by manager',
          colorHex: '#EC4899',
          icon: 'Sparkles',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Special Drone Flying & Pyro Effects 🚀');
    });

    it('TEAM-04: should demote old team lead to TEAM_MEMBER when new lead is assigned', async () => {
      // Assign worker as the new lead
      const res = await request(app)
        .put(`/api/v1/events/${event._id}/teams/${team._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ leadId: worker._id.toString() });

      expect(res.status).toBe(200);

      // Verify old lead was demoted
      const oldLeadMembership = await EventMembership.findOne({
        eventId: event._id,
        userId: lead._id,
      });
      expect(oldLeadMembership?.role).toBe(EventRole.TEAM_MEMBER);

      // Verify new lead was promoted
      const newLeadMembership = await EventMembership.findOne({
        eventId: event._id,
        userId: worker._id,
      });
      expect(newLeadMembership?.role).toBe(EventRole.TEAM_LEAD);
    });

    it('TEAM-05: should unassign incomplete tasks and log audit trail when a worker is removed from team', async () => {
      // Create a task assigned to worker
      const activeTask = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Check VIP Sofa cushions',
        priority: TaskPriority.LOW,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        assigneeId: worker._id,
        status: TaskStatus.IN_PROGRESS,
        evidenceRequired: false,
      });

      // Remove worker from team
      const res = await request(app)
        .put(`/api/v1/events/${event._id}/teams/${team._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ memberIds: [] }); // Empty members list

      expect(res.status).toBe(200);

      // Verify task assignee was cleared
      const updatedTask = await Task.findById(activeTask._id);
      expect(updatedTask?.assigneeId).toBeUndefined();

      // Verify audit record exists
      const activity = await TaskActivity.findOne({
        taskId: activeTask._id,
        action: 'MEMBER_REMOVED_TASK_UNASSIGNED',
      });
      expect(activity).toBeDefined();
    });
  });

  // ==========================================
  // 5. Task Management (TASK-04, 08, 10, 12, 14, 15, 16)
  // ==========================================
  describe('5. Task Management Module', () => {
    it('TASK-04: should reject assigning task to user outside the team', async () => {
      // Create outsider user
      const outsider = await User.create({
        name: 'Unassigned Stranger',
        email: 'stranger@eventops.local',
        password: 'password123',
      });

      const task = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Rigging Lighting Trusses',
        priority: TaskPriority.HIGH,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        status: TaskStatus.TO_DO,
        evidenceRequired: false,
      });

      // Try reassigning to outsider
      const res = await request(app)
        .patch(`/api/v1/tasks/${task._id}/reassign`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ assigneeId: outsider._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Assignee must be a member or lead of the assigned team');
    });

    it('TASK-08: should reject task creation when title exceeds 200 characters', async () => {
      const veryLongTitle = 'A'.repeat(201);
      const res = await request(app)
        .post(`/api/v1/events/${event._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: veryLongTitle,
          dueTime: new Date(Date.now() + 86400000),
          teamId: team._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds maximum allowed length of 200');
    });

    it('TASK-12: should block parent task completion while child microtasks remain open', async () => {
      const parentTask = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Stage Production Parent Task',
        priority: TaskPriority.HIGH,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        status: TaskStatus.IN_PROGRESS,
        evidenceRequired: false,
      });

      // Create incomplete child microtask
      await Task.create({
        eventId: event._id,
        teamId: team._id,
        parentTaskId: parentTask._id,
        title: 'Subtask 1: Cable test',
        priority: TaskPriority.MEDIUM,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: lead._id,
        status: TaskStatus.IN_PROGRESS,
        evidenceRequired: false,
      });

      // Manager attempts to complete parent task
      const res = await request(app)
        .patch(`/api/v1/tasks/${parentTask._id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: TaskStatus.COMPLETED });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot complete parent task while 1 required child task(s) remain open');
    });

    it('TASK-15: should reject duplicate task creation within rapid succession window', async () => {
      // First submission
      const res1 = await request(app)
        .post(`/api/v1/events/${event._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Install Main Entrance Welcome Arch',
          dueTime: new Date(Date.now() + 86400000),
          teamId: team._id.toString(),
        });
      expect(res1.status).toBe(201);

      // Immediate duplicate submission
      const res2 = await request(app)
        .post(`/api/v1/events/${event._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Install Main Entrance Welcome Arch',
          dueTime: new Date(Date.now() + 86400000),
          teamId: team._id.toString(),
        });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('Duplicate task submission detected');
    });

    it('TASK-16: should preserve task history after cancellation', async () => {
      const task = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Temporary Task to Cancel',
        priority: TaskPriority.LOW,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        status: TaskStatus.TO_DO,
        evidenceRequired: false,
      });

      // Cancel task
      const cancelRes = await request(app)
        .patch(`/api/v1/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: TaskStatus.CANCELLED, reason: 'Client changed venue layout' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(TaskStatus.CANCELLED);

      // Verify audit history is preserved
      const auditRes = await request(app)
        .get(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.activities).toBeDefined();
      const cancelActivity = auditRes.body.data.activities.find((a: any) => a.newValue === TaskStatus.CANCELLED);
      expect(cancelActivity).toBeDefined();
      expect(cancelActivity.reason).toBe('Client changed venue layout');
    });
  });

  // ==========================================
  // 6. Evidence & Review (EVD-04, 08, 09)
  // ==========================================
  describe('6. Evidence & Verification Module', () => {
    it('EVD-04: should protect evidence from unauthenticated or unauthorized users', async () => {
      const task = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Confidential Stage Pyrotechnics Proof',
        priority: TaskPriority.CRITICAL,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        status: TaskStatus.IN_PROGRESS,
        evidenceRequired: true,
      });

      // Unauthenticated request
      const unauthRes = await request(app).get(`/api/v1/tasks/${task._id}/evidence`);
      expect(unauthRes.status).toBe(401);

      // Unrelated user from another org
      const crossOrgRes = await request(app)
        .get(`/api/v1/tasks/${task._id}/evidence`)
        .set('Authorization', `Bearer ${otherOrgToken}`);
      expect(crossOrgRes.status).toBe(403);
    });

    it('EVD-08: should prevent worker from self-approving their own submitted evidence', async () => {
      const task = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Floral Arrangement at Mandap',
        priority: TaskPriority.MEDIUM,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        assigneeId: worker._id,
        status: TaskStatus.SUBMITTED_FOR_REVIEW,
        evidenceRequired: true,
      });

      const evidence = await Evidence.create({
        taskId: task._id,
        uploaderId: worker._id,
        mediaType: 'PHOTO',
        fileUrl: '/uploads/evidence/mandap_photo.jpg',
        fileSizeBytes: 102400,
        reviewStatus: EvidenceReviewStatus.PENDING,
      });

      // Worker tries to approve their own evidence
      const approveRes = await request(app)
        .patch(`/api/v1/evidence/${evidence._id}/review`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ reviewStatus: EvidenceReviewStatus.APPROVED });

      expect(approveRes.status).toBe(403);
      expect(approveRes.body.message).toContain('Submitting worker cannot approve their own evidence');
    });

    it('EVD-09: should support requesting clarification with a required note', async () => {
      const task = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: 'Chairs Alignment Check',
        priority: TaskPriority.MEDIUM,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        assigneeId: worker._id,
        status: TaskStatus.SUBMITTED_FOR_REVIEW,
        evidenceRequired: true,
      });

      const evidence = await Evidence.create({
        taskId: task._id,
        uploaderId: worker._id,
        mediaType: 'PHOTO',
        fileUrl: '/uploads/evidence/chairs_photo.jpg',
        fileSizeBytes: 102400,
        reviewStatus: EvidenceReviewStatus.PENDING,
      });

      // Lead requests clarification
      const clarifyRes = await request(app)
        .patch(`/api/v1/evidence/${evidence._id}/review`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          reviewStatus: EvidenceReviewStatus.CLARIFICATION_REQUESTED,
          reviewNote: 'Photo is blurry on row 4. Please send a clearer picture from aisle center.',
        });

      expect(clarifyRes.status).toBe(200);
      expect(clarifyRes.body.data.reviewStatus).toBe(EvidenceReviewStatus.CLARIFICATION_REQUESTED);
      expect(clarifyRes.body.data.reviewNote).toContain('row 4');
    });
  });

  // ==========================================
  // 7. Chat & Real-Time Security (CHAT-02, 04, 11)
  // ==========================================
  describe('7. Chat & Comms Module', () => {
    it('CHAT-02 & CHAT-04: should reject unauthorized users from viewing or posting to restricted team channels', async () => {
      // Find team conversation
      const teamConv = await Conversation.findOne({
        eventId: event._id,
        type: ConversationType.TEAM_INTERNAL,
      });
      expect(teamConv).toBeDefined();

      // Outsider tries to read messages
      const getRes = await request(app)
        .get(`/api/v1/conversations/${teamConv!._id}/messages`)
        .set('Authorization', `Bearer ${otherOrgToken}`);
      expect(getRes.status).toBe(403);

      // Outsider tries to send a message
      const postRes = await request(app)
        .post(`/api/v1/conversations/${teamConv!._id}/messages`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .send({ content: 'Unauthorized leak attempt' });
      expect(postRes.status).toBe(403);
    });

    it('CHAT-11: should reject empty messages and messages exceeding 2000 characters', async () => {
      const globalConv = await Conversation.findOne({
        eventId: event._id,
        type: ConversationType.GLOBAL_EVENT,
      });

      // Empty message
      const emptyRes = await request(app)
        .post(`/api/v1/conversations/${globalConv!._id}/messages`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ content: '    ' });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.message).toContain('Message content or media is required');

      // Message exceeding 2000 characters
      const oversizedContent = 'X'.repeat(2001);
      const overRes = await request(app)
        .post(`/api/v1/conversations/${globalConv!._id}/messages`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ content: oversizedContent });
      expect(overRes.status).toBe(400);
      expect(overRes.body.message).toContain('Message exceeds maximum length of 2000 characters');
    });
  });

  // ==========================================
  // 8. Localization & Multilingual Data (LOC-02)
  // ==========================================
  describe('8. Localization & Multilingual Content', () => {
    it('LOC-02: should preserve Marathi and Hindi task titles and chat messages with 100% fidelity', async () => {
      const marathiTitle = 'मंडप सजावट आणि मुख्य व्यासपीठ व्यवस्था';
      const hindiTitle = 'भोजन व्यवस्था, स्वच्छ पाणी वाटप व व्हीआयपी टेबल';

      const task = await Task.create({
        eventId: event._id,
        teamId: team._id,
        title: marathiTitle,
        description: hindiTitle,
        priority: TaskPriority.HIGH,
        dueTime: new Date(Date.now() + 86400000),
        creatorId: manager._id,
        status: TaskStatus.TO_DO,
        evidenceRequired: false,
      });

      const fetched = await Task.findById(task._id);
      expect(fetched?.title).toBe(marathiTitle);
      expect(fetched?.description).toBe(hindiTitle);
    });
  });

  // ==========================================
  // 9. Security (SEC-01 & SEC-04)
  // ==========================================
  describe('9. Security & Hardening', () => {
    it('SEC-01: should safely neutralize script injection in task titles and chat messages', async () => {
      const globalConv = await Conversation.findOne({
        eventId: event._id,
        type: ConversationType.GLOBAL_EVENT,
      });

      const xssPayload = '<script>alert("XSS")</script>Hello Team!';
      const res = await request(app)
        .post(`/api/v1/conversations/${globalConv!._id}/messages`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ content: xssPayload });

      expect(res.status).toBe(201);
      expect(res.body.data.content).not.toContain('<script>');
      expect(res.body.data.content).toContain('Hello Team!');
    });

    it('SEC-04: should throttle abusive repeated login attempts (Rate Limiter)', async () => {
      // Send 11 rapid login attempts with bad credentials
      let lastStatus = 0;
      for (let i = 0; i < 11; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'priya.sharma@eventops.local', password: 'BadPassword' });
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429); // 429 Too Many Requests
    });
  });

  // ==========================================
  // 10. End-to-End Workflow (E2E-01)
  // ==========================================
  describe('10. End-to-End Core Workflow', () => {
    it('E2E-01: should execute full parent-task workflow from assignment -> microtasks -> evidence -> lead approval -> manager verification', async () => {
      // Step 1: Manager creates team-level parent task
      const parentTaskRes = await request(app)
        .post(`/api/v1/events/${event._id}/tasks`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          teamId: team._id.toString(),
          title: 'Complete Stage Lighting & Rigging',
          description: 'Full lighting setup for main opening ceremony',
          priority: TaskPriority.HIGH,
          dueTime: new Date(Date.now() + 86400000),
          evidenceRequired: true,
          minEvidenceCount: 1,
        });
      expect(parentTaskRes.status).toBe(201);
      const parentTaskId = parentTaskRes.body.data._id;

      // Step 2: Lead acknowledges parent task
      const leadAckRes = await request(app)
        .patch(`/api/v1/tasks/${parentTaskId}/status`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ status: TaskStatus.ACKNOWLEDGED });
      expect(leadAckRes.status).toBe(200);

      // Step 3: Lead creates microtask under parent task assigned to worker
      const microtaskRes = await request(app)
        .post(`/api/v1/events/${event._id}/tasks`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({
          parentTaskId,
          title: 'Hang Spotlights on Left Truss',
          assigneeId: worker._id.toString(),
          priority: TaskPriority.HIGH,
          dueTime: new Date(Date.now() + 43200000),
          evidenceRequired: true,
          minEvidenceCount: 1,
        });
      expect(microtaskRes.status).toBe(201);
      const microtaskId = microtaskRes.body.data._id;

      // Step 4: Worker acknowledges and starts microtask
      await request(app)
        .patch(`/api/v1/tasks/${microtaskId}/status`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ status: TaskStatus.ACKNOWLEDGED });

      await request(app)
        .patch(`/api/v1/tasks/${microtaskId}/status`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      // Step 5: Worker submits evidence
      const evidence = await Evidence.create({
        taskId: microtaskId,
        uploaderId: worker._id,
        mediaType: 'PHOTO',
        fileUrl: '/uploads/evidence/spotlights_installed.jpg',
        fileSizeBytes: 204800,
        reviewStatus: EvidenceReviewStatus.PENDING,
      });

      await request(app)
        .patch(`/api/v1/tasks/${microtaskId}/status`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ status: TaskStatus.SUBMITTED_FOR_REVIEW });

      // Step 6: Lead reviews and approves worker evidence
      const reviewRes = await request(app)
        .patch(`/api/v1/evidence/${evidence._id}/review`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ reviewStatus: EvidenceReviewStatus.APPROVED, reviewNote: 'Well rigged and aligned!' });
      expect(reviewRes.status).toBe(200);

      // Step 7: Lead completes microtask
      const completeMicroRes = await request(app)
        .patch(`/api/v1/tasks/${microtaskId}/status`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ status: TaskStatus.COMPLETED });
      expect(completeMicroRes.status).toBe(200);

      // Step 8: Parent task evidence submitted & approved
      const parentEvidence = await Evidence.create({
        taskId: parentTaskId,
        uploaderId: lead._id,
        mediaType: 'PHOTO',
        fileUrl: '/uploads/evidence/full_stage_lighting_complete.jpg',
        fileSizeBytes: 307200,
        reviewStatus: EvidenceReviewStatus.PENDING,
      });

      await request(app)
        .patch(`/api/v1/evidence/${parentEvidence._id}/review`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ reviewStatus: EvidenceReviewStatus.APPROVED, reviewNote: 'Exemplary stage illumination.' });

      // Step 9: Manager completes & verifies final parent task
      const completeParentRes = await request(app)
        .patch(`/api/v1/tasks/${parentTaskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: TaskStatus.COMPLETED });
      expect(completeParentRes.status).toBe(200);
      expect(completeParentRes.body.data.status).toBe(TaskStatus.COMPLETED);
    });
  });
});
