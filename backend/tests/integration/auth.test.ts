import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('Auth & User Lifecycle (Phase 1)', () => {
  it('should register a new manager with organization and return a JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Aarav Sharma',
        email: 'aarav@royalweddings.com',
        password: 'Password@123',
        phone: '+919876543210',
        organizationName: 'Royal Weddings & Events',
        preferredLanguage: 'hi',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('aarav@royalweddings.com');
    expect(res.body.data.user.preferredLanguage).toBe('hi');
    expect(res.body.data.organization).toBeDefined();
    expect(res.body.data.role).toBe('OWNER');
  });

  it('should prevent registration with duplicate email', async () => {
    // First registration
    await request(app).post('/api/v1/auth/register').send({
      name: 'Pooja Patil',
      email: 'pooja@decor.com',
      password: 'Password@123',
    });

    // Duplicate registration
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Pooja Duplicate',
      email: 'pooja@decor.com',
      password: 'AnotherPassword@123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should authenticate user with valid credentials and reject invalid credentials', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Rohan Deshmukh',
      email: 'rohan@lights.com',
      password: 'SecretPassword@123',
      preferredLanguage: 'mr',
    });

    // Valid login
    const validRes = await request(app).post('/api/v1/auth/login').send({
      email: 'rohan@lights.com',
      password: 'SecretPassword@123',
    });

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.token).toBeDefined();
    expect(validRes.body.data.user.name).toBe('Rohan Deshmukh');
    expect(validRes.body.data.user.preferredLanguage).toBe('mr');

    // Invalid login
    const invalidRes = await request(app).post('/api/v1/auth/login').send({
      email: 'rohan@lights.com',
      password: 'WrongPassword',
    });

    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);
  });

  it('should get current authenticated user profile and update language preference', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Kavita Joshi',
      email: 'kavita@catering.com',
      password: 'Password@123',
      preferredLanguage: 'en',
    });

    const token = regRes.body.data.token;

    // Get Me
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('kavita@catering.com');

    // Update language to Marathi
    const langRes = await request(app)
      .patch('/api/v1/auth/language')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferredLanguage: 'mr' });

    expect(langRes.status).toBe(200);
    expect(langRes.body.data.preferredLanguage).toBe('mr');
  });
});
