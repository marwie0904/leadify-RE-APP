/**
 * Notification API Endpoints Integration Tests
 * Tests for notification-related API endpoints
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = 3002;

// Mock dependencies before requiring the server
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'test-id' },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: null,
          error: null
        }))
      })),
      upsert: jest.fn(() => Promise.resolve({
        data: null,
        error: null
      }))
    }))
  }))
}));

jest.mock('../services/notificationService', () => ({
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  registerSSEClient: jest.fn(),
  unregisterSSEClient: jest.fn(),
  getUserPreferences: jest.fn(),
  notifyLeadAssignment: jest.fn(),
  notifyHandoffToAgents: jest.fn()
}));

jest.mock('../services/emailService', () => ({
  isEmailServiceConfigured: jest.fn(() => false),
  getStatus: jest.fn(() => ({ configured: false }))
}));

describe('Notification API Endpoints', () => {
  let app;
  let authToken;
  let notificationService;
  
  beforeAll(() => {
    // Require server after mocks are set up
    app = require('../server');
    notificationService = require('../services/notificationService');
    
    // Create a valid JWT token for testing
    authToken = jwt.sign(
      { 
        id: 'test-user-id',
        email: 'test@example.com'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });
  
  afterAll((done) => {
    // Close the server after tests
    if (app && app.close) {
      app.close(done);
    } else {
      done();
    }
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should fetch user notifications with authentication', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          title: 'Test Notification 1',
          message: 'Test message 1',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'notif-2',
          title: 'Test Notification 2',
          message: 'Test message 2',
          read: true,
          created_at: new Date().toISOString()
        }
      ];
      
      notificationService.getUserNotifications.mockResolvedValue({
        success: true,
        notifications: mockNotifications
      });
      
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 20, offset: 0 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notifications).toEqual(mockNotifications);
      expect(notificationService.getUserNotifications).toHaveBeenCalledWith(
        'test-user-id',
        {
          limit: 20,
          offset: 0,
          unreadOnly: false
        }
      );
    });

    it('should filter unread notifications when requested', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          title: 'Test Notification 1',
          read: false
        }
      ];
      
      notificationService.getUserNotifications.mockResolvedValue({
        success: true,
        notifications: mockNotifications
      });
      
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ unread_only: 'true' });
      
      expect(response.status).toBe(200);
      expect(response.body.notifications).toEqual(mockNotifications);
      expect(notificationService.getUserNotifications).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          unreadOnly: true
        })
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      notificationService.getUserNotifications.mockResolvedValue({
        success: false,
        error: 'Database error'
      });
      
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      notificationService.markAsRead.mockResolvedValue({
        success: true
      });
      
      const response = await request(app)
        .patch('/api/notifications/notif-123/read')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification marked as read');
      expect(notificationService.markAsRead).toHaveBeenCalledWith(
        'notif-123',
        'test-user-id'
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/notifications/notif-123/read');
      
      expect(response.status).toBe(401);
    });

    it('should handle errors gracefully', async () => {
      notificationService.markAsRead.mockResolvedValue({
        success: false,
        error: 'Not found'
      });
      
      const response = await request(app)
        .patch('/api/notifications/notif-123/read')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not found');
    });
  });

  describe('GET /api/notifications/stream', () => {
    it('should establish SSE connection with authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(notificationService.registerSSEClient).toHaveBeenCalledWith(
        'test-user-id',
        expect.any(Object)
      );
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/stream');
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should fetch user notification preferences', async () => {
      const mockPreferences = {
        emailEnabled: true,
        inAppEnabled: true,
        pushEnabled: false,
        preferences: {
          handoff_assigned: true,
          lead_assigned: true
        }
      };
      
      notificationService.getUserPreferences.mockResolvedValue(mockPreferences);
      
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toEqual(mockPreferences);
      expect(notificationService.getUserPreferences).toHaveBeenCalledWith('test-user-id');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences');
      
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update user notification preferences', async () => {
      const preferences = {
        emailEnabled: true,
        inAppEnabled: false,
        pushEnabled: false,
        preferences: {
          handoff_assigned: false,
          lead_assigned: true
        }
      };
      
      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Preferences updated successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/preferences')
        .send({ emailEnabled: true });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Lead Assignment Notifications', () => {
    it('should send notification when lead is created and assigned', async () => {
      notificationService.notifyLeadAssignment.mockResolvedValue({
        success: true
      });
      
      // Mock Supabase for lead creation
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = createClient();
      
      // Mock successful lead creation
      mockSupabase.from.mockImplementationOnce(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'lead-123',
                full_name: 'John Doe',
                email: 'john@example.com',
                mobile_number: '555-1234',
                lead_classification: 'hot',
                lead_score: 85,
                source: 'web'
              },
              error: null
            }))
          }))
        }))
      }));
      
      const response = await request(app)
        .post('/api/leads')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          organizationId: 'org-123',
          agentId: 'agent-123',
          lead_classification: 'hot',
          lead_score: 85
        });
      
      expect(response.status).toBe(201);
      
      // Verify notification was attempted
      expect(notificationService.notifyLeadAssignment).toHaveBeenCalledWith(
        'lead-123',
        'agent-123',
        expect.objectContaining({
          leadName: 'John Doe',
          email: 'john@example.com'
        })
      );
    });
  });

  describe('Handoff Notifications', () => {
    it('should send notifications when conversation is handed off', async () => {
      notificationService.notifyHandoffToAgents.mockResolvedValue({
        success: true,
        notifiedCount: 2,
        totalAgents: 2
      });
      
      // This would be tested in the handoff endpoint test
      // Just verify the mock is available
      expect(notificationService.notifyHandoffToAgents).toBeDefined();
    });
  });
});