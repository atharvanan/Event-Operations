import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { Conversation } from '../../src/models/Conversation.js';
import { TaskActivity } from '../../src/models/TaskActivity.js';
import { TaskStatus, TaskPriority } from '../../src/constants/index.js';

const app = createApp();

describe('Phase 2 — Teams & Tasks Lifecycle Engine', () => {
  it('should support full workflow: team creation -> parent task -> microtasks -> review -> rework -> completion & audit', async () => {
    // 1. Register Event Manager
    const mgrRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Vikram Sethi',
      email: 'vikram@glamourweddings.com',
      password: 'Password@123',
      organizationName: 'Glamour Weddings',
    });
    const mgrToken = mgrRes.body.data.token;
    const orgId = mgrRes.body.data.organization._id;

    // 2. Register Team Lead & Worker
    const leadRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Chef Rajesh',
      email: 'rajesh.lead@catering.com',
      password: 'Password@123',
    });
    const leadToken = leadRes.body.data.token;
    const leadId = leadRes.body.data.user._id;

    const workerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Sunil Helper',
      email: 'sunil.worker@catering.com',
      password: 'Password@123',
    });
    const workerToken = workerRes.body.data.token;
    const workerId = workerRes.body.data.user._id;

    // 3. Manager creates Event
    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        orgId,
        name: 'Royal Palace Sangeet & Reception',
        venue: 'Umaid Bhawan, Jodhpur',
        startDate: '2026-12-20T10:00:00.000Z',
        endDate: '2026-12-21T02:00:00.000Z',
        zones: ['Dining Lawns', 'Main Stage', 'Bar Lounge'],
      });
    const eventId = eventRes.body.data._id;

    // 4. Manager creates Team and appoints Lead & Worker
    const teamRes = await request(app)
      .post(`/api/v1/events/${eventId}/teams`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        name: 'Catering & Hospitality',
        description: 'Buffet setup, live chaat counters, and dinner service',
        colorHex: '#10B981',
        icon: 'Utensils',
        leadId,
        memberIds: [workerId],
      });

    expect(teamRes.status).toBe(201);
    expect(teamRes.body.data.name).toBe('Catering & Hospitality');
    const teamId = teamRes.body.data._id;

    // 5. Verify Team Channels were auto-provisioned
    const teamChat = await Conversation.findOne({ teamId, type: 'TEAM_INTERNAL' });
    expect(teamChat).toBeDefined();
    expect(teamChat?.title).toContain('Catering & Hospitality Team Internal');

    const mgrTeamChat = await Conversation.findOne({ teamId, type: 'MANAGER_TEAM' });
    expect(mgrTeamChat).toBeDefined();
    expect(mgrTeamChat?.title).toContain('Manager Coordination');

    // 6. Manager assigns team-level outcome task to Catering
    const parentTaskRes = await request(app)
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        teamId,
        title: 'Complete Buffet & Live Counters Setup',
        description: 'All 8 chafing counters must be set up with warmers, crockery, and clean table linen',
        zone: 'Dining Lawns',
        priority: TaskPriority.HIGH,
        dueTime: '2026-12-20T17:00:00.000Z',
        evidenceRequired: false,
        minEvidenceCount: 0,
      });

    expect(parentTaskRes.status).toBe(201);
    expect(parentTaskRes.body.data.title).toBe('Complete Buffet & Live Counters Setup');
    expect(parentTaskRes.body.data.status).toBe(TaskStatus.TO_DO);
    const parentTaskId = parentTaskRes.body.data._id;

    // 7. Team Lead acknowledges parent task
    const ackRes = await request(app)
      .patch(`/api/v1/tasks/${parentTaskId}/status`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ status: TaskStatus.ACKNOWLEDGED });

    expect(ackRes.status).toBe(200);
    expect(ackRes.body.data.status).toBe(TaskStatus.ACKNOWLEDGED);

    // 8. Team Lead breaks parent task into microtask assigned to worker
    const microtaskRes = await request(app)
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        parentTaskId,
        title: 'Arrange Chafing Dishes & Sterno Warmers on Counter 1-4',
        assigneeId: workerId,
        dueTime: '2026-12-20T15:00:00.000Z',
        priority: TaskPriority.MEDIUM,
        evidenceRequired: false,
      });

    expect(microtaskRes.status).toBe(201);
    expect(microtaskRes.body.data.parentTaskId).toBe(parentTaskId);
    const microtaskId = microtaskRes.body.data._id;

    // 9. Worker updates microtask: In Progress -> Submitted for Review
    await request(app)
      .patch(`/api/v1/tasks/${microtaskId}/status`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: TaskStatus.IN_PROGRESS });

    const submitMicroRes = await request(app)
      .patch(`/api/v1/tasks/${microtaskId}/status`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: TaskStatus.SUBMITTED_FOR_REVIEW });

    expect(submitMicroRes.status).toBe(200);
    expect(submitMicroRes.body.data.status).toBe(TaskStatus.SUBMITTED_FOR_REVIEW);

    // 10. Team Lead reviews and approves microtask
    const leadApproveRes = await request(app)
      .patch(`/api/v1/tasks/${microtaskId}/status`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ status: TaskStatus.COMPLETED });

    expect(leadApproveRes.status).toBe(200);
    expect(leadApproveRes.body.data.status).toBe(TaskStatus.COMPLETED);

    // 11. Team Lead submits Parent Task for Manager review
    const leadSubmitParentRes = await request(app)
      .patch(`/api/v1/tasks/${parentTaskId}/status`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ status: TaskStatus.SUBMITTED_FOR_REVIEW });

    expect(leadSubmitParentRes.status).toBe(200);
    expect(leadSubmitParentRes.body.data.status).toBe(TaskStatus.SUBMITTED_FOR_REVIEW);

    // 12. Manager reviews parent task and requests rework with a reason
    const reworkRes = await request(app)
      .patch(`/api/v1/tasks/${parentTaskId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        status: TaskStatus.REWORK_REQUIRED,
        reason: 'Missing Sterno fuel cans on dessert counter and spoons not placed.',
        revisedDueTime: '2026-12-20T17:30:00.000Z',
      });

    expect(reworkRes.status).toBe(200);
    expect(reworkRes.body.data.status).toBe(TaskStatus.REWORK_REQUIRED);
    expect(reworkRes.body.data.reworkReason).toMatch(/Missing Sterno fuel/i);

    // 13. Team Lead fixes and resubmits
    await request(app)
      .patch(`/api/v1/tasks/${parentTaskId}/status`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({ status: TaskStatus.SUBMITTED_FOR_REVIEW });

    // 14. Manager approves final completion
    const finalApproveRes = await request(app)
      .patch(`/api/v1/tasks/${parentTaskId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ status: TaskStatus.COMPLETED });

    expect(finalApproveRes.status).toBe(200);
    expect(finalApproveRes.body.data.status).toBe(TaskStatus.COMPLETED);
    expect(finalApproveRes.body.data.completedAt).toBeDefined();

    // 15. Verify Immutable Activity Log
    const activities = await TaskActivity.find({ taskId: parentTaskId }).sort({ createdAt: 1 });
    expect(activities.length).toBeGreaterThanOrEqual(4);
    const actions = activities.map((a) => a.action);
    expect(actions).toContain('PARENT_TASK_CREATED');
    expect(actions).toContain('STATUS_CHANGED');
  });

  it('should prevent starting a task when its dependencies are incomplete', async () => {
    // 1. Manager registers & creates event
    const mgrRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Manager Dependency Test',
      email: 'mgr.dep@events.com',
      password: 'Password@123',
      organizationName: 'Premier Productions',
    });
    const mgrToken = mgrRes.body.data.token;
    const orgId = mgrRes.body.data.organization._id;

    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        orgId,
        name: 'Concert Fest 2026',
        venue: 'Stadium Arena',
        startDate: '2026-11-25T15:00:00.000Z',
        endDate: '2026-11-25T23:00:00.000Z',
      });
    const eventId = eventRes.body.data._id;

    // Team
    const teamRes = await request(app)
      .post(`/api/v1/events/${eventId}/teams`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ name: 'Stage Rigging' });
    const teamId = teamRes.body.data._id;

    // Prerequisite task: Stage Truss Assembly
    const prereqRes = await request(app)
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        teamId,
        title: 'Stage Truss & Roof Assembly',
        dueTime: '2026-11-25T14:00:00.000Z',
        evidenceRequired: false,
      });
    const prereqId = prereqRes.body.data._id;

    // Dependent task: Lighting Rigging (depends on Truss Assembly)
    const dependentRes = await request(app)
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        teamId,
        title: 'Lighting Rigging on Overhead Truss',
        dueTime: '2026-11-25T16:00:00.000Z',
        dependencies: [prereqId],
        evidenceRequired: false,
      });
    const dependentId = dependentRes.body.data._id;

    // Attempt to set dependent task to IN_PROGRESS while prereq is TO_DO -> should be BLOCKED
    const blockRes = await request(app)
      .patch(`/api/v1/tasks/${dependentId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ status: TaskStatus.IN_PROGRESS });

    expect(blockRes.status).toBe(400);
    expect(blockRes.body.success).toBe(false);
    expect(blockRes.body.message).toMatch(/Prerequisites are not completed/i);

    // Now complete prerequisite task
    await request(app)
      .patch(`/api/v1/tasks/${prereqId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ status: TaskStatus.COMPLETED });

    // Now dependent task can transition to IN_PROGRESS
    const allowRes = await request(app)
      .patch(`/api/v1/tasks/${dependentId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ status: TaskStatus.IN_PROGRESS });

    expect(allowRes.status).toBe(200);
    expect(allowRes.body.data.status).toBe(TaskStatus.IN_PROGRESS);
  });
});
