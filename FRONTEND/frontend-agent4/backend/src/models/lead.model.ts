export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export enum LeadClassification {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
  PRIORITY = 'PRIORITY',
}

export interface LeadStatusHistory {
  from: LeadStatus;
  to: LeadStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

export interface LeadData {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  source: string;
  status?: LeadStatus;
  classification?: LeadClassification;
  score?: number;
  notes?: string;
  tags?: string[];
  assignedToId?: string;
  metadata?: Record<string, any>;
  statusHistory?: LeadStatusHistory[];
  lastContactedAt?: Date;
  convertedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Lead {
  public readonly id: string;
  public readonly organizationId: string;
  public name: string;
  public email: string;
  public phone?: string;
  public company?: string;
  public position?: string;
  public source: string;
  public status: LeadStatus;
  public classification: LeadClassification;
  public score: number;
  public notes?: string;
  public tags: string[];
  public assignedToId?: string;
  public metadata: Record<string, any>;
  public statusHistory: LeadStatusHistory[];
  public lastContactedAt?: Date;
  public convertedAt?: Date;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(data: LeadData) {
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.company = data.company;
    this.position = data.position;
    this.source = data.source;
    this.status = data.status || LeadStatus.NEW;
    this.classification = data.classification || LeadClassification.COLD;
    this.score = data.score || 0;
    this.notes = data.notes;
    this.tags = data.tags || [];
    this.assignedToId = data.assignedToId;
    this.metadata = data.metadata || {};
    this.statusHistory = data.statusHistory || [];
    this.lastContactedAt = data.lastContactedAt;
    this.convertedAt = data.convertedAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  updateStatus(newStatus: LeadStatus, changedBy: string, reason?: string): void {
    if (this.status !== newStatus) {
      this.statusHistory.push({
        from: this.status,
        to: newStatus,
        changedAt: new Date(),
        changedBy,
        reason,
      });
      this.status = newStatus;
      this.updatedAt = new Date();

      if (newStatus === LeadStatus.CONTACTED) {
        this.lastContactedAt = new Date();
      } else if (newStatus === LeadStatus.CONVERTED) {
        this.convertedAt = new Date();
      }
    }
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  getPriority(): 'high' | 'medium' | 'low' {
    if (this.classification === LeadClassification.HOT || this.classification === LeadClassification.PRIORITY) {
      return 'high';
    } else if (this.classification === LeadClassification.WARM || this.score >= 60) {
      return 'medium';
    }
    return 'low';
  }

  getQualityScore(): number {
    let qualityScore = this.score;

    // Bonus points for complete information
    if (this.phone) qualityScore += 5;
    if (this.company) qualityScore += 10;
    if (this.position) qualityScore += 5;
    if (this.tags.length > 0) qualityScore += 5;

    // Classification weight
    const classificationWeights = {
      [LeadClassification.HOT]: 1.5,
      [LeadClassification.PRIORITY]: 1.4,
      [LeadClassification.WARM]: 1.2,
      [LeadClassification.COLD]: 0.8,
    };

    qualityScore *= classificationWeights[this.classification];

    // Cap at 100
    return Math.min(Math.round(qualityScore), 100);
  }

  toJSON(): LeadData {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      email: this.email,
      phone: this.phone,
      company: this.company,
      position: this.position,
      source: this.source,
      status: this.status,
      classification: this.classification,
      score: this.score,
      notes: this.notes,
      tags: this.tags,
      assignedToId: this.assignedToId,
      metadata: this.metadata,
      statusHistory: this.statusHistory,
      lastContactedAt: this.lastContactedAt,
      convertedAt: this.convertedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateLeadDTO {
  organizationId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  source: string;
  classification?: LeadClassification;
  score?: number;
  notes?: string;
  tags?: string[];
  assignedToId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateLeadDTO {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  status?: LeadStatus;
  classification?: LeadClassification;
  score?: number;
  notes?: string;
  tags?: string[];
  assignedToId?: string;
  metadata?: Record<string, any>;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
}

export const validateLead = {
  create(dto: CreateLeadDTO): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (dto.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation
    if (dto.phone) {
      const phoneRegex = /^\+?[\d\s-()]+$/;
      if (!phoneRegex.test(dto.phone) || dto.phone.length < 10) {
        errors.push('Invalid phone number format');
      }
    }

    // Source validation
    if (dto.source.trim().length < 2) {
      errors.push('Source must be at least 2 characters long');
    }

    // Classification validation
    if (dto.classification && !Object.values(LeadClassification).includes(dto.classification)) {
      errors.push('Invalid classification');
    }

    // Score validation
    if (dto.score !== undefined && (dto.score < 0 || dto.score > 100)) {
      errors.push('Score must be between 0 and 100');
    }

    return {
      success: errors.length === 0,
      errors,
    };
  },

  update(dto: UpdateLeadDTO): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (dto.name !== undefined && dto.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    // Email validation
    if (dto.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation
    if (dto.phone !== undefined && dto.phone !== '') {
      const phoneRegex = /^\+?[\d\s-()]+$/;
      if (!phoneRegex.test(dto.phone) || dto.phone.length < 10) {
        errors.push('Invalid phone number format');
      }
    }

    // Status validation
    if (dto.status && !Object.values(LeadStatus).includes(dto.status)) {
      errors.push('Invalid status');
    }

    // Classification validation
    if (dto.classification && !Object.values(LeadClassification).includes(dto.classification)) {
      errors.push('Invalid classification');
    }

    // Score validation
    if (dto.score !== undefined && (dto.score < 0 || dto.score > 100)) {
      errors.push('Score must be between 0 and 100');
    }

    return {
      success: errors.length === 0,
      errors,
    };
  },
};