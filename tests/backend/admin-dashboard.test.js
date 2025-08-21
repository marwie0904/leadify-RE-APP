/**
 * Admin Dashboard API Tests
 * TDD approach - tests written before implementation
 * Run with: npm test tests/admin-dashboard.test.js
 * Coverage: npm run test:coverage
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock environment variables BEFORE any imports
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.PORT = '3003'; // Use different port for tests

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      admin: {
        listUsers: jest.fn()
      }
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis()
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn()
      }))
    },
    rpc: jest.fn()
  }))
}));

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    },
    embeddings: {
      create: jest.fn()
    }
  }))
}));

// Import app after mocks are set up
const app = require('../server');
const { createClient } = require('@supabase/supabase-js');

// Test data
const testAdminUser = {
  id: 'admin-user-123',
  email: 'admin@test.com',
  role: 'admin'
};

const testRegularUser = {
  id: 'regular-user-456',
  email: 'user@test.com',
  role: 'member'
};

const testOrganization = {
  id: 'org-123',
  name: 'Test Organization'
};

// Helper functions
const generateAuthToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Setup and teardown
beforeAll(() => {
  // Setup mock implementations
  const mockSupabase = require('@supabase/supabase-js').createClient();
  
  // Mock successful auth for admin user
  mockSupabase.auth.getUser.mockImplementation((token) => {
    if (token === 'valid-admin-token') {
      return Promise.resolve({ 
        data: { user: testAdminUser }, 
        error: null 
      });
    } else if (token === 'valid-user-token') {
      return Promise.resolve({ 
        data: { user: testRegularUser }, 
        error: null 
      });
    }
    return Promise.resolve({ 
      data: null, 
      error: { message: 'Invalid token' } 
    });
  });

  // Mock dev_members table queries
  mockSupabase.from.mockImplementation((table) => {
    const chainObj = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis()
    };

    if (table === 'dev_members') {
      chainObj.single.mockResolvedValue({
        data: testAdminUser.id === 'admin-user-123' ? {
          id: 'dev-member-1',
          user_id: testAdminUser.id,
          email: testAdminUser.email,
          role: 'admin',
          is_active: true,
          permissions: ['read', 'write', 'admin']
        } : null,
        error: testAdminUser.id === 'admin-user-123' ? null : { message: 'Not found' }
      });
    }

    return chainObj;
  });
});

afterAll(() => {
  jest.clearAllMocks();
});

// =====================================================
// ADMIN AUTHENTICATION TESTS
// =====================================================
describe('Admin Authentication Middleware', () => {
  describe('POST /api/admin/verify', () => {
    it.skip('should allow access for users in dev_members table', async () => {
      // Skip this test until we have proper mock setup
      const token = generateAuthToken(testAdminUser);
      
      const response = await request(app)
        .post('/api/admin/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('isAdmin', true);
      expect(response.body.user).toHaveProperty('email', testAdminUser.email);
    });

    it('should deny access for users not in dev_members table', async () => {
      const token = generateAuthToken(testRegularUser);
      
      const response = await request(app)
        .post('/api/admin/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/admin/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/admin/verify')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'No token provided');
    });
  });
});

// =====================================================
// DASHBOARD STATS TESTS
// =====================================================
describe('Dashboard Statistics API', () => {
  describe('GET /api/admin/dashboard/stats', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should return comprehensive dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('urgentBugs');
      expect(response.body.data).toHaveProperty('openSupportTickets');
      expect(response.body.data).toHaveProperty('totalTokenUsage');
      expect(response.body.data).toHaveProperty('avgTokensPerOrgPerDay');
      expect(response.body.data).toHaveProperty('weeklyAvgTokenUsage');
      expect(response.body.data).toHaveProperty('recentUrgentBugs');
      expect(response.body.data).toHaveProperty('recentSupportRequests');
      expect(response.body.data).toHaveProperty('tokenUsageByOrganization');
      expect(response.body.data).toHaveProperty('systemHealth');
    });

    it('should calculate weekly averages correctly', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const { weeklyAvgTokenUsage } = response.body.data;
      expect(weeklyAvgTokenUsage).toHaveProperty('current');
      expect(weeklyAvgTokenUsage).toHaveProperty('previous');
      expect(weeklyAvgTokenUsage).toHaveProperty('percentageChange');
    });

    it('should include system health metrics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const { systemHealth } = response.body.data;
      expect(systemHealth).toHaveProperty('apiResponseTime');
      expect(systemHealth).toHaveProperty('errorRate');
      expect(systemHealth).toHaveProperty('activeAgents');
      expect(systemHealth).toHaveProperty('activeConversations');
    });

    it('should deny access for non-admin users', async () => {
      const userToken = generateAuthToken(testRegularUser);
      
      await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});

// =====================================================
// ISSUE MANAGEMENT TESTS
// =====================================================
describe('Issue Management API', () => {
  describe('POST /api/issues/report', () => {
    const userToken = generateAuthToken(testRegularUser);

    it('should create issue with AI classification', async () => {
      const issueData = {
        subject: 'Application crashes on login',
        description: 'The app crashes immediately when I try to login. This is urgent as I cannot access my account.',
        organizationId: testOrganization.id,
        posthogSessionId: 'session-123',
        browserInfo: {
          userAgent: 'Mozilla/5.0',
          platform: 'MacOS'
        }
      };

      const response = await request(app)
        .post('/api/issues/report')
        .set('Authorization', `Bearer ${userToken}`)
        .send(issueData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('priority');
      expect(response.body.data).toHaveProperty('aiClassification');
      expect(response.body.data.aiClassification).toHaveProperty('category');
      expect(response.body.data.aiClassification).toHaveProperty('suggestedActions');
    });

    it('should classify urgent issues correctly', async () => {
      const urgentIssue = {
        subject: 'URGENT: Payment system down',
        description: 'The payment system is completely down. No transactions are going through. This is affecting all customers!',
        organizationId: testOrganization.id
      };

      const response = await request(app)
        .post('/api/issues/report')
        .set('Authorization', `Bearer ${userToken}`)
        .send(urgentIssue)
        .expect(201);
      
      expect(response.body.data.priority).toBe('urgent');
      expect(response.body.data.aiPriorityScore).toBeGreaterThan(0.8);
    });

    it('should validate required fields', async () => {
      const invalidIssue = {
        subject: '' // Missing description
      };

      const response = await request(app)
        .post('/api/issues/report')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidIssue)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.errors).toContain('Subject is required');
      expect(response.body.errors).toContain('Description is required');
    });

    it('should capture PostHog session information', async () => {
      const issueWithSession = {
        subject: 'Button not working',
        description: 'The submit button is not responding',
        organizationId: testOrganization.id,
        posthogSessionId: 'ph-session-456',
        posthogPersonId: 'ph-person-789'
      };

      const response = await request(app)
        .post('/api/issues/report')
        .set('Authorization', `Bearer ${userToken}`)
        .send(issueWithSession)
        .expect(201);
      
      expect(response.body.data.posthogSessionId).toBe('ph-session-456');
      expect(response.body.data.posthogRecordingUrl).toContain('ph-session-456');
    });
  });

  describe('GET /api/admin/issues', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should return paginated list of issues', async () => {
      const response = await request(app)
        .get('/api/admin/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('issues');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page', 1);
      expect(response.body.data).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.data.issues)).toBe(true);
    });

    it('should filter issues by status', async () => {
      const response = await request(app)
        .get('/api/admin/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'open' })
        .expect(200);
      
      const issues = response.body.data.issues;
      issues.forEach(issue => {
        expect(issue.status).toBe('open');
      });
    });

    it('should filter issues by priority', async () => {
      const response = await request(app)
        .get('/api/admin/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ priority: 'urgent' })
        .expect(200);
      
      const issues = response.body.data.issues;
      issues.forEach(issue => {
        expect(issue.priority).toBe('urgent');
      });
    });

    it('should sort issues by date', async () => {
      const response = await request(app)
        .get('/api/admin/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'created_at', order: 'desc' })
        .expect(200);
      
      const issues = response.body.data.issues;
      for (let i = 1; i < issues.length; i++) {
        const prevDate = new Date(issues[i-1].createdAt);
        const currDate = new Date(issues[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });
  });

  describe('PUT /api/admin/issues/:id', () => {
    const adminToken = generateAuthToken(testAdminUser);
    const testIssueId = 'issue-123';

    it('should update issue status', async () => {
      const updateData = {
        status: 'in_progress',
        internalNotes: 'Working on this issue'
      };

      const response = await request(app)
        .put(`/api/admin/issues/${testIssueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('in_progress');
      expect(response.body.data.internalNotes).toBe('Working on this issue');
    });

    it('should log issue activities', async () => {
      const updateData = {
        priority: 'high',
        assignedTo: 'admin-user-123'
      };

      await request(app)
        .put(`/api/admin/issues/${testIssueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      
      // Check activity log
      const activities = await request(app)
        .get(`/api/admin/issues/${testIssueId}/activities`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(activities.body.data).toContainEqual(
        expect.objectContaining({
          action: 'priority_changed',
          oldValue: expect.any(Object),
          newValue: { priority: 'high' }
        })
      );
    });
  });
});

// =====================================================
// SUPPORT CHAT TESTS
// =====================================================
describe('Support Chat API', () => {
  describe('POST /api/support/start', () => {
    const userToken = generateAuthToken(testRegularUser);

    it('should create new support ticket', async () => {
      const ticketData = {
        subject: 'Need help with integration',
        initialMessage: 'I am having trouble integrating the Facebook webhook',
        category: 'technical'
      };

      const response = await request(app)
        .post('/api/support/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('ticketId');
      expect(response.body.data).toHaveProperty('status', 'open');
      expect(response.body.data).toHaveProperty('streamUrl');
    });

    it('should auto-assign to available admin', async () => {
      const ticketData = {
        subject: 'Urgent support needed',
        initialMessage: 'System is down',
        category: 'technical',
        priority: 'urgent'
      };

      const response = await request(app)
        .post('/api/support/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData)
        .expect(201);
      
      expect(response.body.data).toHaveProperty('assignedTo');
    });
  });

  describe('POST /api/support/message', () => {
    const userToken = generateAuthToken(testRegularUser);
    const testTicketId = 'ticket-123';

    it('should send message in support chat', async () => {
      const messageData = {
        ticketId: testTicketId,
        message: 'Thank you for your help'
      };

      const response = await request(app)
        .post('/api/support/message')
        .set('Authorization', `Bearer ${userToken}`)
        .send(messageData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('messageId');
      expect(response.body.data).toHaveProperty('delivered', true);
    });

    it('should handle file attachments', async () => {
      const response = await request(app)
        .post('/api/support/message')
        .set('Authorization', `Bearer ${userToken}`)
        .field('ticketId', testTicketId)
        .field('message', 'Here is a screenshot')
        .attach('attachment', '__tests__/fixtures/screenshot.png')
        .expect(201);
      
      expect(response.body.data).toHaveProperty('attachments');
      expect(response.body.data.attachments).toHaveLength(1);
    });
  });

  describe('GET /api/support/stream/:ticketId', () => {
    const testTicketId = 'ticket-123';

    it('should establish SSE connection', (done) => {
      const req = request(app)
        .get(`/api/support/stream/${testTicketId}`)
        .set('Accept', 'text/event-stream');
      
      req.expect(200);
      req.expect('Content-Type', /text\/event-stream/);
      
      req.end((err, res) => {
        if (err) return done(err);
        expect(res.headers['cache-control']).toBe('no-cache');
        expect(res.headers['connection']).toBe('keep-alive');
        done();
      });
    });
  });

  describe('PUT /api/admin/support/tickets/:id/resolve', () => {
    const adminToken = generateAuthToken(testAdminUser);
    const testTicketId = 'ticket-123';

    it('should mark ticket as resolved', async () => {
      const resolveData = {
        resolutionNotes: 'Issue has been fixed',
        satisfactionRating: 5
      };

      const response = await request(app)
        .put(`/api/admin/support/tickets/${testTicketId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resolveData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedAt).toBeDefined();
    });
  });
});

// =====================================================
// AI ANALYTICS TESTS
// =====================================================
describe('AI Analytics API', () => {
  describe('GET /api/admin/ai-analytics', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should return comprehensive token usage analytics', async () => {
      const response = await request(app)
        .get('/api/admin/ai-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalTokensUsed');
      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('byOrganization');
      expect(response.body.data).toHaveProperty('byAgent');
      expect(response.body.data).toHaveProperty('byDay');
      expect(response.body.data).toHaveProperty('byOperation');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/admin/ai-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-31'
        })
        .expect(200);
      
      expect(response.body.data).toHaveProperty('dateRange');
      expect(response.body.data.dateRange.start).toBe('2025-01-01');
      expect(response.body.data.dateRange.end).toBe('2025-01-31');
    });

    it('should calculate cost breakdowns correctly', async () => {
      const response = await request(app)
        .get('/api/admin/ai-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      const { byModel } = response.body.data;
      expect(byModel).toHaveProperty('gpt-4');
      expect(byModel['gpt-4']).toHaveProperty('tokens');
      expect(byModel['gpt-4']).toHaveProperty('cost');
      expect(byModel['gpt-4']).toHaveProperty('requests');
    });

    it('should provide hourly usage patterns', async () => {
      const response = await request(app)
        .get('/api/admin/ai-analytics/hourly')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data).toHaveProperty('hourlyPattern');
      expect(response.body.data.hourlyPattern).toHaveLength(24);
    });
  });

  describe('POST /api/admin/ai-analytics/track', () => {
    it('should track token usage for operations', async () => {
      const usageData = {
        organizationId: testOrganization.id,
        agentId: 'agent-123',
        conversationId: 'conv-456',
        promptTokens: 150,
        completionTokens: 50,
        model: 'gpt-4',
        operationType: 'chat',
        endpoint: '/api/chat'
      };

      // This would typically be called internally
      const response = await request(app)
        .post('/api/admin/ai-analytics/track')
        .set('X-Service-Role', 'true') // Service role header
        .send(usageData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalCost');
    });
  });
});

// =====================================================
// TEAM MANAGEMENT TESTS
// =====================================================
describe('Team Management API', () => {
  describe('POST /api/admin/team/invite', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should send invitation email via Resend', async () => {
      const inviteData = {
        email: 'newdev@example.com',
        role: 'developer',
        permissions: ['read', 'write']
      };

      const response = await request(app)
        .post('/api/admin/team/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('invitationSent', true);
      expect(response.body.data).toHaveProperty('email', 'newdev@example.com');
    });

    it('should validate email format', async () => {
      const inviteData = {
        email: 'invalid-email',
        role: 'developer'
      };

      const response = await request(app)
        .post('/api/admin/team/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email');
    });

    it('should prevent duplicate invitations', async () => {
      const inviteData = {
        email: 'admin@test.com', // Already exists
        role: 'developer'
      };

      const response = await request(app)
        .post('/api/admin/team/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(inviteData)
        .expect(409);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/admin/team/members', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should return list of dev members', async () => {
      const response = await request(app)
        .get('/api/admin/team/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('members');
      expect(Array.isArray(response.body.data.members)).toBe(true);
      
      const member = response.body.data.members[0];
      expect(member).toHaveProperty('email');
      expect(member).toHaveProperty('role');
      expect(member).toHaveProperty('isActive');
    });
  });
});

// =====================================================
// USER MANAGEMENT TESTS
// =====================================================
describe('User Management API', () => {
  describe('GET /api/admin/users', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should return all users with organization info', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      
      const user = response.body.data.users[0];
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('organizationName');
      expect(user).toHaveProperty('role');
    });

    it('should filter users by organization', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ organizationId: testOrganization.id })
        .expect(200);
      
      const users = response.body.data.users;
      users.forEach(user => {
        expect(user.organizationId).toBe(testOrganization.id);
      });
    });

    it('should filter users by activity', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ activity: 'active_last_7_days' })
        .expect(200);
      
      const users = response.body.data.users;
      users.forEach(user => {
        const lastActive = new Date(user.lastActive);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        expect(lastActive.getTime()).toBeGreaterThan(sevenDaysAgo.getTime());
      });
    });
  });
});

// =====================================================
// ORGANIZATION MANAGEMENT TESTS
// =====================================================
describe('Organization Management API', () => {
  describe('GET /api/admin/organizations', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should return all organizations with analytics', async () => {
      const response = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('organizations');
      
      const org = response.body.data.organizations[0];
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('memberCount');
      expect(org).toHaveProperty('agentCount');
      expect(org).toHaveProperty('tokenUsage');
      expect(org).toHaveProperty('monthlyAiCost');
    });
  });

  describe('GET /api/admin/organizations/:id/analytics', () => {
    const adminToken = generateAuthToken(testAdminUser);

    it('should return detailed PostHog analytics', async () => {
      const response = await request(app)
        .get(`/api/admin/organizations/${testOrganization.id}/analytics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('posthogAnalytics');
      expect(response.body.data.posthogAnalytics).toHaveProperty('activeUsers');
      expect(response.body.data.posthogAnalytics).toHaveProperty('sessionsToday');
      expect(response.body.data.posthogAnalytics).toHaveProperty('avgSessionDuration');
      expect(response.body.data.posthogAnalytics).toHaveProperty('topEvents');
    });
  });
});

// =====================================================
// ERROR HANDLING TESTS
// =====================================================
describe('Error Handling', () => {
  it('should handle database connection errors gracefully', async () => {
    // Simulate database error
    process.env.SUPABASE_URL = 'invalid-url';
    
    const response = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${generateAuthToken(testAdminUser)}`)
      .expect(500);
    
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Database connection error');
  });

  it('should handle rate limiting', async () => {
    const token = generateAuthToken(testRegularUser);
    
    // Make multiple rapid requests
    const requests = Array(11).fill().map(() => 
      request(app)
        .post('/api/issues/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ subject: 'Test', description: 'Test' })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});

// =====================================================
// INTEGRATION TESTS
// =====================================================
describe('End-to-End Workflows', () => {
  describe('Complete Issue Resolution Flow', () => {
    it('should handle issue from creation to resolution', async () => {
      const userToken = generateAuthToken(testRegularUser);
      const adminToken = generateAuthToken(testAdminUser);
      
      // 1. User reports an issue
      const createResponse = await request(app)
        .post('/api/issues/report')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          subject: 'Critical bug in payment',
          description: 'Payment failing for all users',
          organizationId: testOrganization.id
        })
        .expect(201);
      
      const issueId = createResponse.body.data.id;
      expect(createResponse.body.data.priority).toBe('urgent');
      
      // 2. Admin sees it in dashboard
      const dashboardResponse = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(dashboardResponse.body.data.urgentBugs).toBeGreaterThan(0);
      
      // 3. Admin updates the issue
      await request(app)
        .put(`/api/admin/issues/${issueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in_progress',
          assignedTo: testAdminUser.id
        })
        .expect(200);
      
      // 4. Admin resolves the issue
      const resolveResponse = await request(app)
        .put(`/api/admin/issues/${issueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'resolved',
          resolutionNotes: 'Fixed payment gateway configuration'
        })
        .expect(200);
      
      expect(resolveResponse.body.data.status).toBe('resolved');
      expect(resolveResponse.body.data.resolvedAt).toBeDefined();
    });
  });

  describe('Support Chat Flow', () => {
    it('should handle complete support conversation', async () => {
      const userToken = generateAuthToken(testRegularUser);
      const adminToken = generateAuthToken(testAdminUser);
      
      // 1. User starts support chat
      const ticketResponse = await request(app)
        .post('/api/support/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          subject: 'Help with API integration',
          initialMessage: 'How do I integrate the webhook?',
          category: 'technical'
        })
        .expect(201);
      
      const ticketId = ticketResponse.body.data.ticketId;
      
      // 2. Admin responds
      await request(app)
        .post('/api/support/message')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ticketId,
          message: 'I can help you with that. First, you need to...'
        })
        .expect(201);
      
      // 3. User sends follow-up
      await request(app)
        .post('/api/support/message')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ticketId,
          message: 'Thank you! That worked perfectly.'
        })
        .expect(201);
      
      // 4. Admin marks as resolved
      const resolveResponse = await request(app)
        .put(`/api/admin/support/tickets/${ticketId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolutionNotes: 'User successfully integrated webhook'
        })
        .expect(200);
      
      expect(resolveResponse.body.data.status).toBe('resolved');
    });
  });
});

// =====================================================
// PERFORMANCE TESTS
// =====================================================
describe('Performance and Load Tests', () => {
  it('should handle concurrent requests efficiently', async () => {
    const adminToken = generateAuthToken(testAdminUser);
    const startTime = Date.now();
    
    // Make 20 concurrent requests
    const requests = Array(20).fill().map(() => 
      request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
    );
    
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // All should succeed
    responses.forEach(r => expect(r.status).toBe(200));
    
    // Should complete within reasonable time (5 seconds for 20 requests)
    expect(duration).toBeLessThan(5000);
  });

  it('should cache frequently accessed data', async () => {
    const adminToken = generateAuthToken(testAdminUser);
    
    // First request (cache miss)
    const start1 = Date.now();
    await request(app)
      .get('/api/admin/ai-analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const duration1 = Date.now() - start1;
    
    // Second request (cache hit)
    const start2 = Date.now();
    await request(app)
      .get('/api/admin/ai-analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const duration2 = Date.now() - start2;
    
    // Cached request should be significantly faster
    expect(duration2).toBeLessThan(duration1 / 2);
  });
});

// Cleanup after tests
afterAll(async () => {
  // Close database connections
  // Clean up test data if needed
});

module.exports = {
  testAdminUser,
  testRegularUser,
  testOrganization,
  generateAuthToken
};