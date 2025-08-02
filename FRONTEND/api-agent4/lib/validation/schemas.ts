import { z } from 'zod'

// Base schemas for common data types
export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const dateStringSchema = z.string().datetime()

// User schemas
export const userRoleSchema = z.enum(['admin', 'moderator', 'agent', 'human_agent'])

export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string(),
  role: userRoleSchema,
  organizationId: uuidSchema,
  hasOrganization: z.boolean(),
  isHumanAgent: z.boolean().optional(),
  humanAgentId: uuidSchema.optional(),
})

export type User = z.infer<typeof userSchema>

// Organization schemas
export const organizationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
  owner_id: uuidSchema,
})

export type Organization = z.infer<typeof organizationSchema>

// API Response schemas
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
})

export const paginationSchema = z.object({
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
})

// Generic API response wrapper
export function createApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.union([
    z.object({
      data: dataSchema,
      success: z.literal(true),
    }),
    z.object({
      error: z.string(),
      success: z.literal(false),
      details: z.any().optional(),
    }),
  ])
}

// Agent schemas
export const agentSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  created_at: dateStringSchema.optional(),
  updated_at: dateStringSchema.optional(),
  organization_id: uuidSchema,
})

export type Agent = z.infer<typeof agentSchema>

export const agentsListResponseSchema = z.object({
  agents: z.array(agentSchema),
})

// Lead schemas
export const leadSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'converted']).optional(),
  assigned_agent_id: uuidSchema.nullable().optional(),
  organization_id: uuidSchema,
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
  source: z.string().optional(),
  notes: z.string().optional(),
})

export type Lead = z.infer<typeof leadSchema>

export const leadsListResponseSchema = z.object({
  leads: z.array(leadSchema),
  pagination: paginationSchema.optional(),
})

// Conversation schemas
export const conversationModeSchema = z.enum(['ai', 'handoff_requested', 'human'])
export const handoffPrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const messageSchema = z.object({
  id: uuidSchema,
  content: z.string(),
  sender: z.enum(['user', 'ai', 'human_agent']),
  timestamp: dateStringSchema,
  human_agent_id: uuidSchema.optional(),
  agent_name: z.string().optional(),
})

export type Message = z.infer<typeof messageSchema>

export const conversationSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  leadName: z.string(),
  user_name: z.string().optional(),
  lastMessage: z.string(),
  lastMessageAt: dateStringSchema,
  last_message_at: dateStringSchema.optional(),
  source: z.string().optional(),
  mode: conversationModeSchema,
  priority: handoffPrioritySchema,
  assigned_human_agent_id: uuidSchema.nullable().optional(),
  created_at: dateStringSchema.optional(),
  agents: z.object({
    name: z.string(),
    organization_id: uuidSchema,
  }).optional(),
  human_agents: z.object({
    id: uuidSchema,
    name: z.string(),
  }).nullable().optional(),
  hasHandoffRequest: z.boolean().optional(),
  handoffPriority: handoffPrioritySchema.optional(),
  handoffRequestedAt: dateStringSchema.optional(),
})

export type Conversation = z.infer<typeof conversationSchema>

export const conversationsListResponseSchema = z.object({
  conversations: z.array(conversationSchema),
})

export const messagesResponseSchema = z.union([
  z.object({
    messages: z.array(messageSchema),
  }),
  z.array(messageSchema),
])

// Dashboard schemas
export const dashboardSummarySchema = z.object({
  totalLeads: z.number(),
  activeConversations: z.number(),
  conversionRate: z.number(),
  avgResponseTime: z.number(),
  leadsOverTime: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })).optional(),
})

// Chat schemas
export const chatRequestSchema = z.object({
  message: z.string(),
  conversationId: uuidSchema.optional(),
  agentId: uuidSchema.optional(),
  leadId: uuidSchema.optional(),
})

export const chatResponseSchema = z.object({
  response: z.string(),
  conversationId: uuidSchema,
  messageId: uuidSchema.optional(),
})

// Human-in-loop schemas
export const handoffStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'cancelled'])
export const humanAgentStatusSchema = z.enum(['available', 'busy', 'offline'])

export const handoffRequestSchema = z.object({
  id: uuidSchema,
  conversation_id: uuidSchema,
  requested_by: z.string(),
  reason: z.string().optional(),
  priority: handoffPrioritySchema,
  status: handoffStatusSchema,
  created_at: dateStringSchema,
  requested_at: dateStringSchema.optional(),
  conversations: conversationSchema.optional(),
})

export type HandoffRequest = z.infer<typeof handoffRequestSchema>

export const humanAgentSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: emailSchema.optional(),
  status: humanAgentStatusSchema.optional(),
  user_id: uuidSchema.optional(),
})

export type HumanAgent = z.infer<typeof humanAgentSchema>

export const humanAgentDashboardSchema = z.object({
  agent: humanAgentSchema,
  pendingHandoffs: z.array(handoffRequestSchema),
  assignedConversations: z.array(conversationSchema),
  stats: z.object({
    pendingCount: z.number(),
    assignedCount: z.number(),
  }),
})

export const priorityQueueResponseSchema = z.object({
  conversations: z.array(conversationSchema),
  pagination: paginationSchema,
})

// Profile/Settings schemas
export const profileResponseSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string(),
  role: userRoleSchema,
  organizationId: uuidSchema.optional(),
  organization: organizationSchema.optional(),
  isHumanAgent: z.boolean().optional(),
  humanAgentId: uuidSchema.optional(),
})

// Organization member schemas
export const organizationMemberSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  organization_id: uuidSchema,
  role: userRoleSchema,
  created_at: dateStringSchema,
  users: z.object({
    email: emailSchema,
    name: z.string().optional(),
  }),
})

export const organizationMembersResponseSchema = z.object({
  members: z.array(organizationMemberSchema),
})

// File upload response schema
export const fileUploadResponseSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
})

// Generic success response
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
})

// BANT Scoring schemas (Budget, Authority, Need, Timeline)
export const bantMetricSchema = z.object({
  score: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  evidencePoints: z.array(z.string()).optional(),
})

export type BANTMetric = z.infer<typeof bantMetricSchema>

export const bantScoreSchema = z.object({
  budget: bantMetricSchema,
  authority: bantMetricSchema,
  need: bantMetricSchema,
  timeline: bantMetricSchema,
  totalScore: z.number().min(0).max(100),
  lastUpdated: dateStringSchema,
  updatedBy: z.string(),
})

export type BANTScore = z.infer<typeof bantScoreSchema>

// Contact Information schema
export const contactInfoSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional().refine(
    val => !val || /^\+?[\d\s-()]+$/.test(val),
    'Invalid phone format'
  ),
  preferredContact: z.enum(['email', 'phone', 'sms']),
})

export type ContactInfo = z.infer<typeof contactInfoSchema>

// Lead Source schema
export const leadSourceSchema = z.object({
  channel: z.enum(['web', 'facebook', 'email', 'phone', 'referral']),
  referrer: z.string().url().optional(),
  campaign: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export type LeadSource = z.infer<typeof leadSourceSchema>

// Enhanced Lead schema with BANT
export const enhancedLeadSchema = z.object({
  id: uuidSchema,
  contactInfo: contactInfoSchema,
  source: leadSourceSchema,
  bantScore: bantScoreSchema.optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'converted']),
  assignedAgentId: uuidSchema.optional(),
  organizationId: uuidSchema,
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
  notes: z.string().optional(),
})

export type EnhancedLead = z.infer<typeof enhancedLeadSchema>

// Create Lead Request schema
export const createLeadSchema = z.object({
  contactInfo: contactInfoSchema,
  source: leadSourceSchema,
  initialBANT: z.object({
    budget: z.number().min(0).max(10),
    authority: z.number().min(0).max(10),
    need: z.number().min(0).max(10),
    timeline: z.number().min(0).max(10),
  }).optional(),
  notes: z.string().max(1000).optional(),
})

export type CreateLeadData = z.infer<typeof createLeadSchema>

// Update BANT Score Request schema
export const updateBANTSchema = z.object({
  budget: z.number().min(0).max(10),
  authority: z.number().min(0).max(10),
  need: z.number().min(0).max(10),
  timeline: z.number().min(0).max(10),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export type UpdateBANTData = z.infer<typeof updateBANTSchema> & { leadId: string }

// Update Lead Status Request schema
export const updateLeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'converted']),
  reason: z.string().optional(),
})

export type UpdateStatusData = z.infer<typeof updateLeadStatusSchema> & { leadId: string }

// Health Check schemas
export const serviceStatusSchema = z.object({
  status: z.enum(['up', 'down', 'degraded']),
  responseTime: z.number().optional(),
  error: z.string().optional(),
  lastCheck: dateStringSchema,
})

export const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  checks: z.object({
    database: serviceStatusSchema,
    api: serviceStatusSchema,
    dependencies: serviceStatusSchema,
  }),
  timestamp: dateStringSchema,
  version: z.string(),
})

export type HealthCheckResult = z.infer<typeof healthCheckSchema>

// Enhanced Dashboard Summary schema (v1)
export const dashboardSummaryV1Schema = z.object({
  totalLeads: z.number(),
  activeConversations: z.number(),
  conversionRate: z.number(),
  avgResponseTime: z.number(),
  leadsOverTime: z.array(z.object({
    date: z.string(),
    count: z.number(),
    bantScore: z.number().optional(),
  })).optional(),
  bantDistribution: z.object({
    budget: z.array(z.number()),
    authority: z.array(z.number()),
    need: z.array(z.number()),
    timeline: z.array(z.number()),
  }).optional(),
  leadsBySource: z.array(z.object({
    source: z.string(),
    count: z.number(),
    conversionRate: z.number(),
  })).optional(),
})

export type DashboardSummaryV1 = z.infer<typeof dashboardSummaryV1Schema>

// API Response schemas for new endpoints
export const createLeadResponseSchema = z.object({
  lead: enhancedLeadSchema,
  message: z.string().optional(),
})

export const updateBANTResponseSchema = z.object({
  bantScore: bantScoreSchema,
  lead: enhancedLeadSchema.partial(),
  message: z.string().optional(),
})

export const updateStatusResponseSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'converted']),
  lead: enhancedLeadSchema.partial(),
  message: z.string().optional(),
})

// Enhanced leads list response
export const enhancedLeadsListResponseSchema = z.object({
  leads: z.array(enhancedLeadSchema),
  pagination: paginationSchema.optional(),
  summary: z.object({
    total: z.number(),
    byStatus: z.record(z.number()),
    avgBANTScore: z.number().optional(),
  }).optional(),
})

// Export type utilities
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; details?: any }

// Validation helper functions
export function validateApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown
): T {
  return schema.parse(data)
}

export function safeValidateApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}