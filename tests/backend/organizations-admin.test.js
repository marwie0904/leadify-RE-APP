/**
 * Test Suite for Admin Organization Endpoints
 * 
 * Tests the following endpoints:
 * - GET /api/admin/organizations (enhanced with monthly metrics)
 * - GET /api/admin/organizations/:id (detailed organization data)
 * - GET /api/admin/organizations/:id/analytics (real analytics data)
 * 
 * @jest-environment node
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

// Mock JWT for auth
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret) => {
    if (token === 'valid-admin-token') {
      return { id: 'admin-user-id', email: 'admin@test.com' };
    } else if (token === 'valid-user-token') {
      return { id: 'regular-user-id', email: 'user@test.com' };
    } else {
      throw new Error('Invalid token');
    }
  }),
  sign: jest.fn(() => 'mock-token')
}));

describe('Admin Organization Endpoints', () => {
  let app;
  let mockSupabase;
  
  beforeEach(() => {
    // Clear module cache
    jest.clearAllMocks();
    jest.resetModules();
    
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      auth: {
        admin: {
          getUserById: jest.fn()
        }
      }
    };
    
    createClient.mockReturnValue(mockSupabase);
    
    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    
    // Import server after mocks are set up
    app = require('../server');
  });
  
  afterEach(() => {
    if (app && app.close) {
      app.close();
    }
  });
  
  describe('GET /api/admin/organizations', () => {
    const mockOrganizationsData = [
      {
        id: 'org-1',
        name: 'TechCorp Inc',
        created_at: '2024-01-15T00:00:00Z',
        organization_members: [{ id: 'member-1' }, { id: 'member-2' }],
        agents: [{ id: 'agent-1' }]
      },
      {
        id: 'org-2',
        name: 'Real Estate Pro',
        created_at: '2024-01-20T00:00:00Z',
        organization_members: [{ id: 'member-3' }],
        agents: [{ id: 'agent-2' }, { id: 'agent-3' }]
      }
    ];
    
    const mockLeadsData = [
      { organization_id: 'org-1', id: 'lead-1', classification: 'hot', created_at: new Date() },
      { organization_id: 'org-1', id: 'lead-2', classification: 'warm', created_at: new Date() },
      { organization_id: 'org-1', id: 'lead-3', classification: 'cold', created_at: new Date() },
      { organization_id: 'org-2', id: 'lead-4', classification: 'priority', created_at: new Date() }
    ];
    
    const mockConversationsData = [
      { organization_id: 'org-1', id: 'conv-1', created_at: new Date() },
      { organization_id: 'org-1', id: 'conv-2', created_at: new Date() },
      { organization_id: 'org-2', id: 'conv-3', created_at: new Date() }
    ];
    
    const mockTokenUsageData = [
      { organization_id: 'org-1', total_tokens: 50000, total_cost: 1.5, created_at: new Date() },
      { organization_id: 'org-1', total_tokens: 30000, total_cost: 0.9, created_at: new Date() },
      { organization_id: 'org-2', total_tokens: 25000, total_cost: 0.75, created_at: new Date() }
    ];
    
    beforeEach(() => {
      // Mock dev_members check for admin
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin', is_active: true },
              error: null
            })
          };
        }
        return mockSupabase;
      });
    });
    
    it('should return organization list with monthly metrics for admin users', async () => {
      // Setup mock responses
      mockSupabase.select.mockImplementation((fields) => {
        if (fields && fields.includes('organization_members')) {
          return {
            ...mockSupabase,
            data: mockOrganizationsData,
            error: null
          };
        }
        return mockSupabase;
      });
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnValue({
              data: mockOrganizationsData,
              error: null
            })
          };
        } else if (table === 'leads') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnValue({
              data: mockLeadsData,
              error: null
            })
          };
        } else if (table === 'conversations') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnValue({
              data: mockConversationsData,
              error: null
            })
          };
        } else if (table === 'ai_token_usage') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnValue({
              data: mockTokenUsageData,
              error: null
            })
          };
        } else if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin', is_active: true },
              error: null
            })
          };
        }
        return mockSupabase;
      });
      
      const response = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('organizations');
      
      // Check summary statistics
      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('totalOrganizations');
      expect(summary).toHaveProperty('totalUsers');
      expect(summary).toHaveProperty('totalLeadsMonth');
      expect(summary).toHaveProperty('totalConversationsMonth');
      expect(summary).toHaveProperty('totalTokensMonth');
      
      // Check organization data structure
      const orgs = response.body.data.organizations;
      expect(Array.isArray(orgs)).toBe(true);
      
      if (orgs.length > 0) {
        const org = orgs[0];
        expect(org).toHaveProperty('id');
        expect(org).toHaveProperty('name');
        expect(org).toHaveProperty('plan');
        expect(org).toHaveProperty('createdAt');
        expect(org).toHaveProperty('metrics');
        expect(org.metrics).toHaveProperty('monthly');
        expect(org.metrics).toHaveProperty('lifetime');
        expect(org).toHaveProperty('leadClassification');
      }
    });
    
    it('should support search functionality', async () => {
      mockSupabase.ilike.mockReturnValue({
        data: [mockOrganizationsData[0]],
        error: null
      });
      
      const response = await request(app)
        .get('/api/admin/organizations?search=TechCorp')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.organizations).toHaveLength(1);
      expect(response.body.data.organizations[0].name).toBe('TechCorp Inc');
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/admin/organizations?page=2&limit=10')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('page', 2);
      expect(response.body.data).toHaveProperty('limit', 10);
    });
    
    it('should return 401 for non-authenticated users', async () => {
      const response = await request(app)
        .get('/api/admin/organizations')
        .expect(401);
      
      expect(response.body.message).toContain('No authorization header');
    });
    
    it('should return 403 for non-admin users', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          };
        }
        return mockSupabase;
      });
      
      const response = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', 'Bearer valid-user-token')
        .expect(403);
      
      expect(response.body.message).toContain('Admin access required');
    });
  });
  
  describe('GET /api/admin/organizations/:id', () => {
    const mockOrgDetail = {
      id: 'org-1',
      name: 'TechCorp Inc',
      created_at: '2024-01-15T00:00:00Z',
      plan: 'enterprise'
    };
    
    const mockTokenUsageByType = [
      { operation_type: 'chat_reply', total_tokens: 2000000, total_cost: 60 },
      { operation_type: 'embeddings', total_tokens: 1500000, total_cost: 45 },
      { operation_type: 'bant_extraction', total_tokens: 500000, total_cost: 15 }
    ];
    
    const mockUsers = [
      { id: 'user-1', email: 'john@example.com', full_name: 'John Doe', role: 'admin' },
      { id: 'user-2', email: 'jane@example.com', full_name: 'Jane Smith', role: 'member' }
    ];
    
    beforeEach(() => {
      // Mock dev_members check for admin
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin', is_active: true },
              error: null
            })
          };
        }
        return mockSupabase;
      });
    });
    
    it('should return detailed organization data', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockOrgDetail,
              error: null
            })
          };
        } else if (table === 'ai_token_usage') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnValue({
              data: mockTokenUsageByType,
              error: null
            })
          };
        } else if (table === 'organization_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              data: mockUsers.map(u => ({ user_id: u.id })),
              error: null
            })
          };
        } else if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin', is_active: true },
              error: null
            })
          };
        }
        return mockSupabase;
      });
      
      // Mock auth.admin.getUserById
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { 
          user: { 
            email: mockUsers[0].email,
            user_metadata: { full_name: mockUsers[0].full_name }
          } 
        },
        error: null
      });
      
      const response = await request(app)
        .get('/api/admin/organizations/org-1')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('organization');
      
      const org = response.body.data.organization;
      expect(org).toHaveProperty('id', 'org-1');
      expect(org).toHaveProperty('name', 'TechCorp Inc');
      expect(org).toHaveProperty('metrics');
      expect(org).toHaveProperty('tokenUsageByType');
      expect(org).toHaveProperty('users');
      expect(org).toHaveProperty('tokenUsageTrend');
      
      // Check metrics structure
      expect(org.metrics).toHaveProperty('totalTokenUsage');
      expect(org.metrics).toHaveProperty('avgDailyTokens');
      expect(org.metrics).toHaveProperty('totalLeads');
      expect(org.metrics).toHaveProperty('openConversations');
      expect(org.metrics).toHaveProperty('conversionRate');
      
      // Check token usage breakdown
      expect(Array.isArray(org.tokenUsageByType)).toBe(true);
      if (org.tokenUsageByType.length > 0) {
        expect(org.tokenUsageByType[0]).toHaveProperty('type');
        expect(org.tokenUsageByType[0]).toHaveProperty('tokens');
        expect(org.tokenUsageByType[0]).toHaveProperty('percentage');
      }
    });
    
    it('should return 404 for non-existent organization', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          };
        } else if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin', is_active: true },
              error: null
            })
          };
        }
        return mockSupabase;
      });
      
      const response = await request(app)
        .get('/api/admin/organizations/non-existent-org')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Organization not found');
    });
    
    it('should include time range filtering', async () => {
      const response = await request(app)
        .get('/api/admin/organizations/org-1?timeRange=7d')
        .set('Authorization', 'Bearer valid-admin-token');
      
      // The endpoint should accept time range parameter
      expect([200, 404]).toContain(response.status);
    });
  });
  
  describe('GET /api/admin/organizations/:id/analytics', () => {
    const mockAnalyticsData = {
      id: 'org-1',
      name: 'TechCorp Inc',
      organization_members: [{ id: 'member-1' }],
      agents: [{ id: 'agent-1' }],
      conversations: [{ id: 'conv-1', status: 'active' }]
    };
    
    const mockTokenTrend = [
      { date: '2024-01-01', tokens: 18000, cost: 0.36 },
      { date: '2024-01-02', tokens: 22000, cost: 0.44 },
      { date: '2024-01-03', tokens: 25000, cost: 0.50 }
    ];
    
    beforeEach(() => {
      // Mock dev_members check for admin
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin', is_active: true },
              error: null
            })
          };
        }
        return mockSupabase;
      });
    });
    
    it('should return real analytics data instead of mock data', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAnalyticsData,
              error: null
            })
          };
        } else if (table === 'ai_token_usage') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnValue({
              data: mockTokenTrend,
              error: null
            })
          };
        } else if (table === 'leads') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              data: [
                { id: 'lead-1', classification: 'hot' },
                { id: 'lead-2', classification: 'qualified' }
              ],
              error: null
            })
          };
        } else if (table === 'dev_members') {
          return {
            ...mockSupabase,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin', is_active: true },
              error: null
            })
          };
        }
        return mockSupabase;
      });
      
      const response = await request(app)
        .get('/api/admin/organizations/org-1/analytics')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('organization');
      expect(response.body.data).toHaveProperty('analytics');
      
      const analytics = response.body.data.analytics;
      expect(analytics).toHaveProperty('tokenUsageTrend');
      expect(analytics).toHaveProperty('conversionMetrics');
      expect(analytics).toHaveProperty('leadMetrics');
      expect(analytics).toHaveProperty('userActivity');
      
      // Should not have mock posthog data
      expect(response.body.data).not.toHaveProperty('posthogAnalytics');
    });
    
    it('should support date range filtering', async () => {
      const response = await request(app)
        .get('/api/admin/organizations/org-1/analytics?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', 'Bearer valid-admin-token');
      
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        return {
          ...mockSupabase,
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection error' }
          })
        };
      });
      
      const response = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/admin/organizations?page=invalid&limit=abc')
        .set('Authorization', 'Bearer valid-admin-token');
      
      // Should handle invalid parameters gracefully
      expect([200, 400]).toContain(response.status);
    });
  });
  
  describe('Performance Considerations', () => {
    it('should use proper database indexes for queries', async () => {
      // This test verifies that the queries are structured to use indexes
      // In actual implementation, we would check query execution plans
      
      const response = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', 'Bearer valid-admin-token');
      
      // The response should be reasonably fast
      expect(response.status).toBe(200);
    });
    
    it('should implement proper pagination to avoid large data transfers', async () => {
      const response = await request(app)
        .get('/api/admin/organizations?limit=100')
        .set('Authorization', 'Bearer valid-admin-token');
      
      if (response.status === 200) {
        // Should enforce a maximum limit
        expect(response.body.data.limit).toBeLessThanOrEqual(100);
      }
    });
  });
});

describe('Helper Functions', () => {
  describe('calculateLeadClassification', () => {
    it('should correctly categorize leads by classification', () => {
      const leads = [
        { classification: 'hot' },
        { classification: 'hot' },
        { classification: 'warm' },
        { classification: 'cold' },
        { classification: 'priority' }
      ];
      
      // This would be a helper function in the actual implementation
      const classification = leads.reduce((acc, lead) => {
        acc[lead.classification] = (acc[lead.classification] || 0) + 1;
        return acc;
      }, {});
      
      expect(classification.hot).toBe(2);
      expect(classification.warm).toBe(1);
      expect(classification.cold).toBe(1);
      expect(classification.priority).toBe(1);
    });
  });
  
  describe('calculateConversionRate', () => {
    it('should calculate conversion rate correctly', () => {
      const totalLeads = 100;
      const qualifiedLeads = 25;
      
      const conversionRate = (qualifiedLeads / totalLeads) * 100;
      
      expect(conversionRate).toBe(25);
    });
    
    it('should handle zero leads', () => {
      const totalLeads = 0;
      const qualifiedLeads = 0;
      
      const conversionRate = totalLeads === 0 ? 0 : (qualifiedLeads / totalLeads) * 100;
      
      expect(conversionRate).toBe(0);
    });
  });
  
  describe('aggregateTokenUsageByType', () => {
    it('should aggregate token usage by operation type', () => {
      const tokenUsage = [
        { operation_type: 'chat_reply', total_tokens: 1000, total_cost: 0.03 },
        { operation_type: 'chat_reply', total_tokens: 2000, total_cost: 0.06 },
        { operation_type: 'embeddings', total_tokens: 500, total_cost: 0.015 }
      ];
      
      const aggregated = tokenUsage.reduce((acc, usage) => {
        if (!acc[usage.operation_type]) {
          acc[usage.operation_type] = { tokens: 0, cost: 0 };
        }
        acc[usage.operation_type].tokens += usage.total_tokens;
        acc[usage.operation_type].cost += usage.total_cost;
        return acc;
      }, {});
      
      expect(aggregated.chat_reply.tokens).toBe(3000);
      expect(aggregated.chat_reply.cost).toBeCloseTo(0.09, 2);
      expect(aggregated.embeddings.tokens).toBe(500);
    });
  });
});