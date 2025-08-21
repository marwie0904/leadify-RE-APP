/**
 * Notification Service Tests
 * Comprehensive test suite for notification system
 */

const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { createClient } = require('@supabase/supabase-js');

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('../services/emailService');
jest.mock('../utils/notificationTemplates', () => ({
  getTemplate: jest.fn((type, data) => ({
    subject: `Test Subject for ${type}`,
    text: `Test text for ${type}`,
    html: `<p>Test HTML for ${type}</p>`
  }))
}));

describe('NotificationService', () => {
  let mockSupabase;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { id: 'test-notification-id', user_id: 'test-user-id' },
              error: null
            }))
          }))
        })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                user_id: 'test-user-id',
                email_enabled: true,
                in_app_enabled: true,
                push_enabled: false,
                preferences: {
                  handoff_assigned: true,
                  lead_assigned: true,
                  lead_qualified: true
                }
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              error: null
            }))
          }))
        }))
      }))
    };
    
    createClient.mockReturnValue(mockSupabase);
    
    // Mock email service
    emailService.sendEmailWithRetry = jest.fn(() => Promise.resolve({ 
      success: true, 
      messageId: 'test-message-id' 
    }));
    emailService.isEmailServiceConfigured = jest.fn(() => true);
    emailService.getStatus = jest.fn(() => ({
      configured: true,
      provider: 'smtp',
      from: 'test@example.com'
    }));
  });

  describe('sendNotification', () => {
    it('should send both email and in-app notifications when enabled', async () => {
      // Mock user details
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                user_id: 'test-user-id',
                email_enabled: true,
                in_app_enabled: true,
                preferences: {}
              },
              error: null
            }))
          }))
        }))
      }));
      
      // Mock organization member lookup
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                user_id: 'test-user-id',
                role: 'agent',
                organization_id: 'test-org-id'
              },
              error: null
            }))
          }))
        }))
      }));
      
      // Mock auth.users lookup
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-user-id',
                email: 'test@example.com',
                raw_user_meta_data: { name: 'Test User' }
              },
              error: null
            }))
          }))
        }))
      }));
      
      // Mock in-app notification creation
      mockSupabase.from.mockImplementationOnce(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { id: 'notification-id', user_id: 'test-user-id' },
              error: null
            }))
          }))
        }))
      }));
      
      const result = await notificationService.sendNotification({
        userId: 'test-user-id',
        type: 'handoff_assigned',
        title: 'Test Notification',
        message: 'Test message',
        link: 'http://example.com',
        data: { test: 'data' }
      });
      
      expect(result.success).toBe(true);
      expect(result.results.inApp).toEqual({
        success: true,
        notificationId: 'notification-id'
      });
      expect(result.results.email).toEqual({
        success: true,
        messageId: 'test-message-id'
      });
      expect(emailService.sendEmailWithRetry).toHaveBeenCalled();
    });

    it('should skip email notification when disabled', async () => {
      // Mock user preferences with email disabled
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                user_id: 'test-user-id',
                email_enabled: false,
                in_app_enabled: true,
                preferences: {}
              },
              error: null
            }))
          }))
        }))
      }));
      
      // Mock organization member lookup
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                user_id: 'test-user-id',
                role: 'agent'
              },
              error: null
            }))
          }))
        }))
      }));
      
      // Mock auth.users lookup
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-user-id',
                email: 'test@example.com',
                raw_user_meta_data: { name: 'Test User' }
              },
              error: null
            }))
          }))
        }))
      }));
      
      // Mock in-app notification creation
      mockSupabase.from.mockImplementationOnce(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { id: 'notification-id' },
              error: null
            }))
          }))
        }))
      }));
      
      const result = await notificationService.sendNotification({
        userId: 'test-user-id',
        type: 'handoff_assigned',
        title: 'Test Notification',
        message: 'Test message'
      });
      
      expect(result.success).toBe(true);
      expect(result.results.email).toBeNull();
      expect(emailService.sendEmailWithRetry).not.toHaveBeenCalled();
    });
  });

  describe('notifyHandoffToAgents', () => {
    it('should notify all agents in organization about handoff', async () => {
      // Mock organization members lookup
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => Promise.resolve({
              data: [
                { user_id: 'agent-1', role: 'admin' },
                { user_id: 'agent-2', role: 'agent' }
              ],
              error: null
            }))
          }))
        }))
      }));
      
      // Mock sendNotification
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification')
        .mockImplementation(() => Promise.resolve({ success: true }));
      
      const result = await notificationService.notifyHandoffToAgents('conv-123', {
        organizationId: 'org-123',
        priority: 'high',
        reason: 'Customer needs help',
        customerId: 'cust-123',
        customerName: 'John Doe',
        source: 'web'
      });
      
      expect(result.success).toBe(true);
      expect(result.notifiedCount).toBe(2);
      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'agent-1',
          type: 'handoff_assigned',
          title: '🔔 New Handoff Request'
        })
      );
    });

    it('should handle no agents found gracefully', async () => {
      // Mock empty organization members
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      }));
      
      const result = await notificationService.notifyHandoffToAgents('conv-123', {
        organizationId: 'org-123',
        priority: 'normal'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No agents found');
    });
  });

  describe('notifyLeadAssignment', () => {
    it('should notify agent about lead assignment', async () => {
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification')
        .mockImplementation(() => Promise.resolve({ success: true }));
      
      const result = await notificationService.notifyLeadAssignment('lead-123', 'agent-123', {
        leadName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-1234',
        classification: 'hot',
        score: 85,
        source: 'web',
        details: 'High-value lead'
      });
      
      expect(result.success).toBe(true);
      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'agent-123',
          type: 'lead_assigned',
          title: '📋 New Lead Assigned',
          message: 'You have been assigned a new lead: Jane Doe'
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              error: null
            }))
          }))
        }))
      }));
      
      const result = await notificationService.markAsRead('notification-123', 'user-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              error: { message: 'Database error' }
            }))
          }))
        }))
      }));
      
      const result = await notificationService.markAsRead('notification-123', 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch user notifications with pagination', async () => {
      const mockNotifications = [
        { id: '1', title: 'Notification 1', read: false },
        { id: '2', title: 'Notification 2', read: true }
      ];
      
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => Promise.resolve({
                data: mockNotifications,
                error: null
              }))
            }))
          }))
        }))
      }));
      
      const result = await notificationService.getUserNotifications('user-123', {
        limit: 10,
        offset: 0,
        unreadOnly: false
      });
      
      expect(result.success).toBe(true);
      expect(result.notifications).toEqual(mockNotifications);
    });

    it('should filter unread notifications when requested', async () => {
      const mockNotifications = [
        { id: '1', title: 'Notification 1', read: false }
      ];
      
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: mockNotifications,
                  error: null
                }))
              }))
            }))
          }))
        }))
      }));
      
      const result = await notificationService.getUserNotifications('user-123', {
        limit: 10,
        offset: 0,
        unreadOnly: true
      });
      
      expect(result.success).toBe(true);
      expect(result.notifications).toEqual(mockNotifications);
    });
  });

  describe('SSE Client Management', () => {
    it('should register and unregister SSE clients', () => {
      const mockRes = { write: jest.fn() };
      
      notificationService.registerSSEClient('user-123', mockRes);
      expect(notificationService.sseClients.has('user-123')).toBe(true);
      
      notificationService.sendRealTimeNotification('user-123', {
        type: 'test',
        title: 'Test',
        message: 'Test message'
      });
      
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('data: {')
      );
      
      notificationService.unregisterSSEClient('user-123');
      expect(notificationService.sseClients.has('user-123')).toBe(false);
    });

    it('should handle SSE client errors gracefully', () => {
      const mockRes = { 
        write: jest.fn(() => { 
          throw new Error('Connection closed'); 
        }) 
      };
      
      notificationService.registerSSEClient('user-123', mockRes);
      
      // Should not throw when sending to failed connection
      expect(() => {
        notificationService.sendRealTimeNotification('user-123', {
          type: 'test',
          title: 'Test',
          message: 'Test message'
        });
      }).not.toThrow();
      
      // Client should be removed after error
      expect(notificationService.sseClients.has('user-123')).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = notificationService.getStatus();
      
      expect(status).toEqual({
        emailServiceConfigured: true,
        emailServiceStatus: {
          configured: true,
          provider: 'smtp',
          from: 'test@example.com'
        },
        connectedClients: 0,
        supabaseConnected: true
      });
    });
  });
});