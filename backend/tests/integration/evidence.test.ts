import { describe, it, expect } from 'vitest';
import request from 'supertest';
import path from 'path';
import { createApp } from '../../src/app.js';
import { TaskStatus, TaskPriority, EvidenceReviewStatus } from '../../src/constants/index.js';
import { TaskActivity } from '../../src/models/TaskActivity.js';

const app = createApp();

describe('Phase 3 — Evidence Pipeline & Verification Workflows', () => {
  it('should upload photo evidence, gate task completion on proof approval, and handle review/rework', async () => {
    // 1. Setup Manager & Worker
    const mgrRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Manager Evidence Test',
      email: 'mgr.evidence@events.com',
      password: 'Password@123',
      organizationName: 'Visual Events',
    });
    const mgrToken = mgrRes.body.data.token;
    const orgId = mgrRes.body.data.organization._id;

    const workerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Worker Evidence Test',
      email: 'worker.evidence@events.com',
      password: 'Password@123',
    });
    const workerToken = workerRes.body.data.token;
    const workerId = workerRes.body.data.user._id;

    // 2. Create Event & Team
    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        orgId,
        name: 'Royal Palace Proof Verification Event',
        venue: 'Grand Courtyard',
        startDate: '2026-11-28T10:00:00.000Z',
        endDate: '2026-11-28T22:00:00.000Z',
      });
    const eventId = eventRes.body.data._id;

    const teamRes = await request(app)
      .post(`/api/v1/events/${eventId}/teams`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        name: 'Stage Carpentry',
        leadId: workerId,
        memberIds: [workerId],
      });
    const teamId = teamRes.body.data._id;

    // 3. Create Task requiring 1 photo evidence
    const taskRes = await request(app)
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        teamId,
        title: 'Floral Mandap Four-Pillar Construction',
        dueTime: '2026-11-28T14:00:00.000Z',
        evidenceRequired: true,
        minEvidenceCount: 1,
      });
    const taskId = taskRes.body.data._id;

    // 4. Try to mark task complete without uploading proof -> Should be rejected by evidence gate
    const prematureCompleteRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ status: TaskStatus.COMPLETED });

    expect(prematureCompleteRes.status).toBe(400);
    expect(prematureCompleteRes.body.message).toMatch(/Requires at least 1 verified evidence/i);

    // 5. Worker uploads a photo proof (mock buffer image)
    const dummyImageBuffer = Buffer.from('fake-jpeg-image-data-binary-stream');

    const uploadRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/evidence`)
      .set('Authorization', `Bearer ${workerToken}`)
      .attach('file', dummyImageBuffer, { filename: 'mandap_pillars_front.jpg', contentType: 'image/jpeg' })
      .field('caption', 'Completed four pillar erection with safety crossbars')
      .field('stage', 'completion_proof');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.reviewStatus).toBe(EvidenceReviewStatus.PENDING);
    expect(uploadRes.body.data.mediaType).toBe('PHOTO');
    const evidenceId = uploadRes.body.data._id;

    // 6. Verify TaskActivity logged evidence upload
    const activities = await TaskActivity.find({ taskId });
    const hasEvidenceActivity = activities.some((a) => a.action === 'EVIDENCE_SUBMITTED');
    expect(hasEvidenceActivity).toBe(true);

    // 7. Try to complete task while evidence is PENDING -> Still rejected
    const pendingCompleteRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ status: TaskStatus.COMPLETED });

    expect(pendingCompleteRes.status).toBe(400);

    // 8. Event Manager inspects and approves evidence item
    const reviewRes = await request(app)
      .patch(`/api/v1/evidence/${evidenceId}/review`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        reviewStatus: EvidenceReviewStatus.APPROVED,
        reviewNote: 'Pillars are plumb and tie-downs are solid. Approved.',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.reviewStatus).toBe(EvidenceReviewStatus.APPROVED);

    // 9. Now complete task -> should SUCCEED
    const finalCompleteRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({ status: TaskStatus.COMPLETED });

    expect(finalCompleteRes.status).toBe(200);
    expect(finalCompleteRes.body.data.status).toBe(TaskStatus.COMPLETED);

    // 10. Test rejection workflow: Worker uploads another photo, Lead rejects it
    const upload2Res = await request(app)
      .post(`/api/v1/tasks/${taskId}/evidence`)
      .set('Authorization', `Bearer ${workerToken}`)
      .attach('file', dummyImageBuffer, { filename: 'mandap_drape_test.jpg', contentType: 'image/jpeg' })
      .field('caption', 'Drapes test photo');
    const evidence2Id = upload2Res.body.data._id;

    const rejectRes = await request(app)
      .patch(`/api/v1/evidence/${evidence2Id}/review`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        reviewStatus: EvidenceReviewStatus.REJECTED,
        reviewNote: 'Drapes are wrinkled and floor clips are showing.',
        flagTaskRework: true,
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.reviewStatus).toBe(EvidenceReviewStatus.REJECTED);

    // 11. Verify Task became REWORK_REQUIRED
    const reloadedTask = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${mgrToken}`);

    expect(reloadedTask.body.data.task.status).toBe(TaskStatus.REWORK_REQUIRED);
    expect(reloadedTask.body.data.task.reworkReason).toMatch(/Drapes are wrinkled/i);
  });
});

