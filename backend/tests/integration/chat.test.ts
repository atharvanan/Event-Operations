import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { Conversation } from '../../src/models/Conversation.js';
import { Message } from '../../src/models/Message.js';
import { MessageType } from '../../src/constants/index.js';

const app = createApp();

describe('Phase 4 — Real-Time Communications & Comms Engine', () => {
  it('should support messaging, task links, voice notes, and room authorization security', async () => {
    // 1. Setup Manager & Lead
    const mgrRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Manager Chat Test',
      email: 'mgr.chat@events.com',
      password: 'Password@123',
      organizationName: 'Comms Productions',
    });
    const mgrToken = mgrRes.body.data.token;
    const orgId = mgrRes.body.data.organization._id;

    const leadRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Lead Sound Engineer',
      email: 'lead.sound@events.com',
      password: 'Password@123',
    });
    const leadToken = leadRes.body.data.token;
    const leadId = leadRes.body.data.user._id;

    // 2. Create Event & Team
    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        orgId,
        name: 'Grand Concert Comms Event',
        venue: 'Open Air Amphitheatre',
        startDate: '2026-11-29T10:00:00.000Z',
        endDate: '2026-11-29T23:00:00.000Z',
      });
    const eventId = eventRes.body.data._id;

    const teamRes = await request(app)
      .post(`/api/v1/events/${eventId}/teams`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        name: 'Audio Engineering',
        leadId,
      });
    const teamId = teamRes.body.data._id;

    // Create a task to test task sharing
    const taskRes = await request(app)
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        teamId,
        title: 'Check Front-of-House Line Array Delay',
        dueTime: '2026-11-29T15:00:00.000Z',
      });
    const taskId = taskRes.body.data._id;

    // 3. Retrieve Conversations for Lead
    const convsRes = await request(app)
      .get(`/api/v1/events/${eventId}/conversations`)
      .set('Authorization', `Bearer ${leadToken}`);

    expect(convsRes.status).toBe(200);
    expect(convsRes.body.data.length).toBeGreaterThanOrEqual(2); // Global + Team Internal
    const teamChat = convsRes.body.data.find((c: any) => c.type === 'TEAM_INTERNAL');
    expect(teamChat).toBeDefined();
    const conversationId = teamChat._id;

    // 4. Send text message
    const sendMsgRes = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        content: 'FOH delay line speakers calibrated at 45ms. Ready for sound check.',
        messageType: MessageType.TEXT,
      });

    expect(sendMsgRes.status).toBe(201);
    expect(sendMsgRes.body.data.content).toContain('FOH delay line');
    expect(sendMsgRes.body.data.senderId.name).toBe('Lead Sound Engineer');

    // 5. Share task link in chat
    const sendTaskLinkRes = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        content: 'Please review this audio task:',
        messageType: MessageType.TASK_LINK,
        taskIdReference: taskId,
      });

    expect(sendTaskLinkRes.status).toBe(201);
    expect(sendTaskLinkRes.body.data.taskIdReference._id).toBe(taskId);
    expect(sendTaskLinkRes.body.data.taskIdReference.title).toBe('Check Front-of-House Line Array Delay');

    // 6. Upload Voice Note
    const mockAudioBuffer = Buffer.from('RIFFmockaudioformatchunkdata');

    const voiceRes = await request(app)
      .post(`/api/v1/conversations/${conversationId}/voice-note`)
      .set('Authorization', `Bearer ${leadToken}`)
      .attach('file', mockAudioBuffer, { filename: 'voicenote_1.webm', contentType: 'audio/webm' })
      .field('durationSeconds', 12);

    expect(voiceRes.status).toBe(201);
    expect(voiceRes.body.data.messageType).toBe(MessageType.VOICE_NOTE);
    expect(voiceRes.body.data.mediaUrl).toMatch(/\/uploads\/chat\/.*\.webm/);
    expect(voiceRes.body.data.voiceDurationSeconds).toBe(12);

    // 7. Security: Unauthorized external user cannot read messages
    const hackerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Uninvited User',
      email: 'uninvited@external.com',
      password: 'Password@123',
    });
    const hackerToken = hackerRes.body.data.token;

    const readAttemptRes = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${hackerToken}`);

    expect(readAttemptRes.status).toBe(403);
    expect(readAttemptRes.body.success).toBe(false);
  });
});

