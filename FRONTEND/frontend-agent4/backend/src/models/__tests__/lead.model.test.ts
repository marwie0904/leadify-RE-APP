import { Lead, LeadStatus, LeadClassification, CreateLeadDTO, UpdateLeadDTO, validateLead } from '../lead.model';

describe('Lead Model', () => {
  describe('Lead Entity', () => {
    it('should create a valid lead entity', () => {
      const lead = new Lead({
        id: 'lead-123',
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
        source: 'Website',
        status: LeadStatus.NEW,
        classification: LeadClassification.WARM,
        score: 75,
        assignedToId: 'agent-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(lead.id).toBe('lead-123');
      expect(lead.name).toBe('John Doe');
      expect(lead.email).toBe('john@example.com');
      expect(lead.status).toBe(LeadStatus.NEW);
      expect(lead.classification).toBe(LeadClassification.WARM);
      expect(lead.score).toBe(75);
    });

    it('should calculate priority correctly', () => {
      const hotLead = new Lead({
        id: 'lead-1',
        organizationId: 'org-123',
        name: 'Hot Lead',
        email: 'hot@example.com',
        source: 'Website',
        classification: LeadClassification.HOT,
        score: 90,
      });

      const coldLead = new Lead({
        id: 'lead-2',
        organizationId: 'org-123',
        name: 'Cold Lead',
        email: 'cold@example.com',
        source: 'Website',
        classification: LeadClassification.COLD,
        score: 20,
      });

      expect(hotLead.getPriority()).toBe('high');
      expect(coldLead.getPriority()).toBe('low');
    });

    it('should track status history', () => {
      const lead = new Lead({
        id: 'lead-123',
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        source: 'Website',
        status: LeadStatus.NEW,
      });

      lead.updateStatus(LeadStatus.CONTACTED, 'user-123');
      expect(lead.status).toBe(LeadStatus.CONTACTED);
      expect(lead.statusHistory).toHaveLength(1);
      expect(lead.statusHistory[0]).toMatchObject({
        from: LeadStatus.NEW,
        to: LeadStatus.CONTACTED,
        changedBy: 'user-123',
      });
    });

    it('should add and manage tags', () => {
      const lead = new Lead({
        id: 'lead-123',
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        source: 'Website',
      });

      lead.addTag('enterprise');
      lead.addTag('high-value');
      lead.addTag('enterprise'); // duplicate

      expect(lead.tags).toHaveLength(2);
      expect(lead.tags).toContain('enterprise');
      expect(lead.tags).toContain('high-value');

      lead.removeTag('enterprise');
      expect(lead.tags).toHaveLength(1);
      expect(lead.tags).not.toContain('enterprise');
    });

    it('should convert to JSON properly', () => {
      const lead = new Lead({
        id: 'lead-123',
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        metadata: { industry: 'tech' },
      });

      const json = lead.toJSON();
      expect(json.id).toBe('lead-123');
      expect(json.metadata).toEqual({ industry: 'tech' });
    });
  });

  describe('CreateLeadDTO Validation', () => {
    it('should validate a valid CreateLeadDTO', () => {
      const dto: CreateLeadDTO = {
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        source: 'Website',
      };

      const result = validateLead.create(dto);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const dto: CreateLeadDTO = {
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'invalid-email',
        source: 'Website',
      };

      const result = validateLead.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject invalid phone number', () => {
      const dto: CreateLeadDTO = {
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123', // too short
        source: 'Website',
      };

      const result = validateLead.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid phone number format');
    });

    it('should validate score range', () => {
      const dto: CreateLeadDTO = {
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        source: 'Website',
        score: 150, // out of range
      };

      const result = validateLead.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Score must be between 0 and 100');
    });
  });

  describe('UpdateLeadDTO Validation', () => {
    it('should validate a valid UpdateLeadDTO', () => {
      const dto: UpdateLeadDTO = {
        status: LeadStatus.QUALIFIED,
        classification: LeadClassification.HOT,
        score: 95,
      };

      const result = validateLead.update(dto);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const dto: UpdateLeadDTO = {
        notes: 'Updated notes about the lead',
      };

      const result = validateLead.update(dto);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const dto: any = {
        status: 'INVALID_STATUS',
      };

      const result = validateLead.update(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid status');
    });

    it('should reject invalid classification', () => {
      const dto: any = {
        classification: 'INVALID_CLASSIFICATION',
      };

      const result = validateLead.update(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid classification');
    });
  });

  describe('Lead Scoring', () => {
    it('should calculate lead quality score', () => {
      const highQualityLead = new Lead({
        id: 'lead-1',
        organizationId: 'org-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
        classification: LeadClassification.HOT,
        score: 95,
        tags: ['enterprise', 'decision-maker'],
      });

      const lowQualityLead = new Lead({
        id: 'lead-2',
        organizationId: 'org-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        classification: LeadClassification.COLD,
        score: 20,
      });

      expect(highQualityLead.getQualityScore()).toBeGreaterThan(80);
      expect(lowQualityLead.getQualityScore()).toBeLessThan(40);
    });
  });
});