import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';

describe('Auth Endpoints (/api/auth)', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  const validUser = {
    name: 'Siva Kumar',
    email: 'siva@example.com',
    password: 'password123'
  };

  describe('POST /api/auth/signup', () => {
    it('should register a new user and return token + sanitized user', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('siva@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject registration if email is duplicate', async () => {
      await request(app).post('/api/auth/signup').send(validUser);
      const res = await request(app).post('/api/auth/signup').send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject registration if password is under 8 characters', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Short Pass',
        email: 'short@example.com',
        password: '12345'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send(validUser);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(validUser.email);
    });

    it('should return identical error message for wrong password and unknown email', async () => {
      const wrongPassRes = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'wrongpassword'
      });

      const unknownEmailRes = await request(app).post('/api/auth/login').send({
        email: 'unknown@example.com',
        password: 'password123'
      });

      expect(wrongPassRes.status).toBe(401);
      expect(unknownEmailRes.status).toBe(401);
      expect(wrongPassRes.body.message).toBe('Invalid email or password');
      expect(unknownEmailRes.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me & profile/password', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/signup').send(validUser);
      token = res.body.token;
    });

    it('should return user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(validUser.email);
    });

    it('should return 401 when token is missing or invalid', async () => {
      const resNoToken = await request(app).get('/api/auth/me');
      expect(resNoToken.status).toBe(401);

      const resBadToken = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(resBadToken.status).toBe(401);
    });

    it('should update profile successfully', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Siva Updated',
          email: 'siva_updated@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Siva Updated');
      expect(res.body.user.email).toBe('siva_updated@example.com');
    });

    it('should update password and allow login with new password', async () => {
      const updateRes = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: validUser.password,
          newPassword: 'newpassword123'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      const loginRes = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'newpassword123'
      });
      expect(loginRes.status).toBe(200);
    });
  });
});

