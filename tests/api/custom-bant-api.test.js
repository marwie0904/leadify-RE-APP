const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    embeddings: {
      create: jest.fn(),
    },
  }));
});

describe('Custom BANT Configuration API', () => {
  let app;
  let supabase;
  let server;
  
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import the app after environment variables are set
    delete require.cache[require.resolve('../server.js')];
    const appModule = require('../server.js');
    app = appModule.app;
    server = appModule.server;
    
    // Get the mocked supabase instance
    supabase = createClient();
  });
  
  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });
  
  const createAuthToken = (userId = 'test-user-id') => {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET);
  };
  
  describe('POST /api/agents/:id/bant-config', () => {
    it('should create a custom BANT configuration', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const token = createAuthToken(userId);
      
      const bantConfig = {
        budget_weight: 30,
        authority_weight: 20,
        need_weight: 15,
        timeline_weight: 25,
        contact_weight: 10,
        budget_criteria: [
          { min: 20000000, max: null, points: 30, label: '>$20M' },
          { min: 15000000, max: 20000000, points: 25, label: '$15-20M' }
        ],
        authority_criteria: [
          { type: 'sole_owner', points: 20, label: 'Sole Owner' },
          { type: 'partner', points: 15, label: 'Business Partner' }
        ],
        need_criteria: [
          { type: 'residence', points: 15, label: 'Primary Residence' }
        ],
        timeline_criteria: [
          { type: 'within_1_month', points: 25, label: 'Within 1 Month' }
        ],
        contact_criteria: [
          { type: 'full_contact', points: 10, label: 'Name + Phone + Email' }
        ],
        priority_threshold: 85,
        hot_threshold: 75,
        warm_threshold: 55
      };
      
      // Mock agent verification
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: userId },
        error: null
      });
      
      // Mock config creation
      supabase.from().upsert().select().single.mockResolvedValueOnce({
        data: {
          id: 'config-id',
          agent_id: agentId,
          ...bantConfig,
          bant_scoring_prompt: 'Generated prompt',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });
      
      const response = await request(app)
        .post(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`)
        .send(bantConfig);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.agent_id).toBe(agentId);
      expect(response.body.config.bant_scoring_prompt).toBeDefined();
    });
    
    it('should validate weight sum equals 100', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const token = createAuthToken(userId);
      
      const invalidConfig = {
        budget_weight: 30,
        authority_weight: 20,
        need_weight: 15,
        timeline_weight: 25,
        contact_weight: 5, // Sum is 95, not 100
        budget_criteria: [],
        authority_criteria: [],
        need_criteria: [],
        timeline_criteria: [],
        contact_criteria: []
      };
      
      // Mock agent verification
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: userId },
        error: null
      });
      
      const response = await request(app)
        .post(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidConfig);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('weights must sum to 100');
    });
    
    it('should validate threshold order', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const token = createAuthToken(userId);
      
      const invalidConfig = {
        budget_weight: 20,
        authority_weight: 20,
        need_weight: 20,
        timeline_weight: 20,
        contact_weight: 20,
        budget_criteria: [],
        authority_criteria: [],
        need_criteria: [],
        timeline_criteria: [],
        contact_criteria: [],
        priority_threshold: 70,
        hot_threshold: 80, // Should be less than priority
        warm_threshold: 60
      };
      
      // Mock agent verification
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: userId },
        error: null
      });
      
      const response = await request(app)
        .post(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidConfig);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('thresholds must be in descending order');
    });
    
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/agents/test-agent-id/bant-config')
        .send({});
      
      expect(response.status).toBe(401);
    });
    
    it('should verify agent ownership', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const otherUserId = 'other-user-id';
      const token = createAuthToken(userId);
      
      // Mock agent owned by different user
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: otherUserId },
        error: null
      });
      
      const response = await request(app)
        .post(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          budget_weight: 20,
          authority_weight: 20,
          need_weight: 20,
          timeline_weight: 20,
          contact_weight: 20,
          budget_criteria: [],
          authority_criteria: [],
          need_criteria: [],
          timeline_criteria: [],
          contact_criteria: []
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not authorized');
    });
  });
  
  describe('GET /api/agents/:id/bant-config', () => {
    it('should retrieve custom BANT configuration', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const token = createAuthToken(userId);
      
      // Mock agent verification
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: userId },
        error: null
      });
      
      // Mock config retrieval
      const mockConfig = {
        id: 'config-id',
        agent_id: agentId,
        budget_weight: 30,
        authority_weight: 20,
        need_weight: 15,
        timeline_weight: 25,
        contact_weight: 10,
        budget_criteria: [{ min: 20000000, max: null, points: 30, label: '>$20M' }],
        authority_criteria: [],
        need_criteria: [],
        timeline_criteria: [],
        contact_criteria: [],
        bant_scoring_prompt: 'Custom prompt',
        priority_threshold: 90,
        hot_threshold: 80,
        warm_threshold: 60
      };
      
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockConfig,
        error: null
      });
      
      const response = await request(app)
        .get(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.config).toEqual(mockConfig);
    });
    
    it('should return 404 if no custom config exists', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const token = createAuthToken(userId);
      
      // Mock agent verification
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: userId },
        error: null
      });
      
      // Mock config not found
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      const response = await request(app)
        .get(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No custom BANT configuration found');
    });
  });
  
  describe('DELETE /api/agents/:id/bant-config', () => {
    it('should delete custom BANT configuration', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const token = createAuthToken(userId);
      
      // Mock agent verification
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: userId },
        error: null
      });
      
      // Mock config deletion
      supabase.from().delete().eq().mockResolvedValueOnce({
        error: null
      });
      
      const response = await request(app)
        .delete(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });
  });
  
  describe('BANT Prompt Generation', () => {
    it('should generate correct prompt from configuration', async () => {
      const agentId = 'test-agent-id';
      const userId = 'test-user-id';
      const token = createAuthToken(userId);
      
      const bantConfig = {
        budget_weight: 40,
        authority_weight: 15,
        need_weight: 10,
        timeline_weight: 30,
        contact_weight: 5,
        budget_criteria: [
          { min: 10000000, max: null, points: 40, label: '>$10M' },
          { min: 5000000, max: 10000000, points: 30, label: '$5-10M' },
          { min: 1000000, max: 5000000, points: 20, label: '$1-5M' },
          { min: 0, max: 1000000, points: 10, label: '<$1M' }
        ],
        authority_criteria: [
          { type: 'sole_decision', points: 15, label: 'Sole Decision Maker' },
          { type: 'joint_decision', points: 10, label: 'Joint Decision' },
          { type: 'influencer', points: 5, label: 'Influencer Only' }
        ],
        need_criteria: [
          { type: 'urgent', points: 10, label: 'Urgent Need' },
          { type: 'planned', points: 7, label: 'Planned Purchase' },
          { type: 'exploring', points: 3, label: 'Just Exploring' }
        ],
        timeline_criteria: [
          { type: 'immediate', points: 30, label: 'Immediate' },
          { type: '1_month', points: 25, label: 'Within 1 Month' },
          { type: '3_months', points: 15, label: 'Within 3 Months' },
          { type: '6_months', points: 5, label: 'Within 6 Months' }
        ],
        contact_criteria: [
          { type: 'complete', points: 5, label: 'Complete Contact Info' },
          { type: 'partial', points: 3, label: 'Partial Contact Info' },
          { type: 'none', points: 0, label: 'No Contact Info' }
        ],
        priority_threshold: 88,
        hot_threshold: 75,
        warm_threshold: 50
      };
      
      // Mock agent verification
      supabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: agentId, user_id: userId },
        error: null
      });
      
      // Mock config creation
      supabase.from().upsert().select().single.mockResolvedValueOnce({
        data: {
          id: 'config-id',
          agent_id: agentId,
          ...bantConfig,
          bant_scoring_prompt: 'mocked',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });
      
      const response = await request(app)
        .post(`/api/agents/${agentId}/bant-config`)
        .set('Authorization', `Bearer ${token}`)
        .send(bantConfig);
      
      expect(response.status).toBe(200);
      
      // Verify the prompt contains all the necessary information
      const insertCall = supabase.from().upsert.mock.calls[0][0][0];
      const generatedPrompt = insertCall.bant_scoring_prompt;
      
      expect(generatedPrompt).toContain('Budget (40% of total score)');
      expect(generatedPrompt).toContain('>$10M = 40 points');
      expect(generatedPrompt).toContain('Authority (15% of total score)');
      expect(generatedPrompt).toContain('Timeline (30% of total score)');
      expect(generatedPrompt).toContain('Priority: Score >= 88');
      expect(generatedPrompt).toContain('Hot: Score >= 75');
      expect(generatedPrompt).toContain('Warm: Score >= 50');
    });
  });
});