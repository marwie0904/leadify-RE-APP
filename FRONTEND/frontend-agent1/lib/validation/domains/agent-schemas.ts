import { z } from 'zod';
import {
  nonEmptyString,
  sanitizedText,
  trimmedString,
  alphanumericString,
  normalizedEmail,
  urlString,
  csrfToken,
  percentage,
  positiveInt
} from '../core/base-schemas';

/**
 * Agent configuration schema
 */
export const agentConfigSchema = z.object({
  // Basic Information
  name: nonEmptyString
    .max(100, 'Agent name is too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Agent name contains invalid characters'),
  description: sanitizedText
    .max(500, 'Description is too long')
    .optional(),
  avatar: urlString.optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  
  // Model Configuration
  model: z.enum([
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'custom'
  ]),
  customModelEndpoint: urlString.optional(),
  customModelApiKey: z.string()
    .min(20, 'API key seems too short')
    .optional(),
  
  // Behavior Configuration
  temperature: z.number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature cannot exceed 2')
    .default(0.7),
  maxTokens: positiveInt
    .max(4096, 'Max tokens cannot exceed 4096')
    .default(1000),
  topP: z.number()
    .min(0, 'Top P must be at least 0')
    .max(1, 'Top P cannot exceed 1')
    .default(1),
  frequencyPenalty: z.number()
    .min(-2, 'Frequency penalty must be at least -2')
    .max(2, 'Frequency penalty cannot exceed 2')
    .default(0),
  presencePenalty: z.number()
    .min(-2, 'Presence penalty must be at least -2')
    .max(2, 'Presence penalty cannot exceed 2')
    .default(0),
  
  // Response Configuration
  responseTimeout: positiveInt
    .max(300, 'Timeout cannot exceed 300 seconds')
    .default(30), // seconds
  retryAttempts: z.number()
    .int()
    .min(0, 'Retry attempts must be at least 0')
    .max(5, 'Retry attempts cannot exceed 5')
    .default(3),
  streamResponses: z.boolean().default(true),
  
  // Capabilities
  capabilities: z.object({
    webSearch: z.boolean().default(false),
    codeExecution: z.boolean().default(false),
    imageGeneration: z.boolean().default(false),
    fileAccess: z.boolean().default(false),
    apiCalling: z.boolean().default(false)
  }),
  
  // Access Control
  allowedDomains: z.array(trimmedString).optional(),
  blockedDomains: z.array(trimmedString).optional(),
  maxConversationLength: positiveInt
    .max(1000, 'Conversation length cannot exceed 1000 messages')
    .default(100),
  
  csrfToken: csrfToken
});

/**
 * Agent prompt settings schema
 */
export const agentPromptSchema = z.object({
  agentId: z.string().uuid(),
  
  // System Prompt
  systemPrompt: sanitizedText
    .max(4000, 'System prompt is too long')
    .refine(
      (prompt) => prompt.trim().length > 0,
      'System prompt cannot be empty'
    ),
  
  // Conversation Starters
  conversationStarters: z.array(
    nonEmptyString.max(200, 'Conversation starter is too long')
  ).max(5, 'Maximum 5 conversation starters allowed').optional(),
  
  // Example Conversations
  examples: z.array(z.object({
    user: nonEmptyString.max(500, 'User message is too long'),
    assistant: nonEmptyString.max(1000, 'Assistant response is too long'),
    context: trimmedString.max(200, 'Context is too long').optional()
  })).max(10, 'Maximum 10 examples allowed').optional(),
  
  // Knowledge Base
  knowledgeBase: z.array(z.object({
    id: z.string().uuid(),
    title: nonEmptyString.max(100, 'Title is too long'),
    content: sanitizedText.max(5000, 'Content is too long'),
    category: trimmedString.max(50, 'Category is too long').optional(),
    isActive: z.boolean().default(true)
  })).optional(),
  
  // Response Templates
  responseTemplates: z.array(z.object({
    trigger: nonEmptyString.max(100, 'Trigger is too long'),
    response: nonEmptyString.max(1000, 'Response is too long'),
    priority: z.number().int().min(0).max(10).default(5),
    exactMatch: z.boolean().default(false)
  })).max(50, 'Maximum 50 response templates allowed').optional(),
  
  // Behavioral Rules
  rules: z.array(z.object({
    type: z.enum(['allow', 'deny', 'redirect']),
    pattern: nonEmptyString.max(200, 'Pattern is too long'),
    action: trimmedString.max(500, 'Action is too long').optional(),
    message: sanitizedText.max(500, 'Message is too long').optional()
  })).optional(),
  
  // Personality Settings
  personality: z.object({
    tone: z.enum(['professional', 'friendly', 'casual', 'formal', 'enthusiastic']).default('professional'),
    humor: z.number().min(0).max(10).default(0),
    empathy: z.number().min(0).max(10).default(7),
    assertiveness: z.number().min(0).max(10).default(5),
    verbosity: z.number().min(0).max(10).default(5)
  }).optional(),
  
  csrfToken: csrfToken
});

/**
 * Agent training data schema
 */
export const agentTrainingSchema = z.object({
  agentId: z.string().uuid(),
  
  // Training Data
  trainingData: z.array(z.object({
    input: nonEmptyString.max(1000, 'Input is too long'),
    output: nonEmptyString.max(2000, 'Output is too long'),
    feedback: z.enum(['positive', 'negative', 'neutral']).optional(),
    metadata: z.record(z.string(), z.any()).optional()
  })).min(1, 'At least one training example is required')
    .max(1000, 'Maximum 1000 training examples allowed'),
  
  // Training Configuration
  trainingConfig: z.object({
    epochs: positiveInt.max(100, 'Epochs cannot exceed 100').default(3),
    batchSize: positiveInt.max(64, 'Batch size cannot exceed 64').default(8),
    learningRate: z.number()
      .positive('Learning rate must be positive')
      .max(1, 'Learning rate cannot exceed 1')
      .default(0.001),
    validationSplit: percentage.default(20)
  }).optional(),
  
  // Fine-tuning Options
  fineTuneBase: z.boolean().default(false),
  preserveOriginalBehavior: z.boolean().default(true),
  
  csrfToken: csrfToken
});

/**
 * Agent integration schema
 */
export const agentIntegrationSchema = z.object({
  agentId: z.string().uuid(),
  
  // Integration Type
  type: z.enum(['webhook', 'api', 'database', 'custom']),
  name: nonEmptyString.max(100, 'Integration name is too long'),
  description: sanitizedText.max(500, 'Description is too long').optional(),
  
  // Connection Details
  endpoint: urlString,
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  
  // Authentication
  authentication: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('none')
    }),
    z.object({
      type: z.literal('apiKey'),
      apiKey: nonEmptyString,
      headerName: nonEmptyString.default('X-API-Key')
    }),
    z.object({
      type: z.literal('bearer'),
      token: nonEmptyString
    }),
    z.object({
      type: z.literal('basic'),
      username: nonEmptyString,
      password: nonEmptyString
    }),
    z.object({
      type: z.literal('oauth2'),
      clientId: nonEmptyString,
      clientSecret: nonEmptyString,
      tokenUrl: urlString,
      scope: trimmedString.optional()
    })
  ]),
  
  // Request Configuration
  requestMapping: z.record(z.string(), z.string()).optional(),
  responseMapping: z.record(z.string(), z.string()).optional(),
  
  // Error Handling
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(5).default(3),
  timeoutSeconds: positiveInt.max(300).default(30),
  
  // Activation
  isActive: z.boolean().default(true),
  triggerEvents: z.array(z.enum([
    'conversation_start',
    'message_received',
    'message_sent',
    'conversation_end',
    'handoff_requested',
    'error_occurred'
  ])).min(1, 'At least one trigger event is required'),
  
  csrfToken: csrfToken
});

/**
 * Agent analytics configuration schema
 */
export const agentAnalyticsSchema = z.object({
  agentId: z.string().uuid(),
  
  // Metrics to Track
  trackMetrics: z.object({
    responseTime: z.boolean().default(true),
    messageCount: z.boolean().default(true),
    conversationDuration: z.boolean().default(true),
    userSatisfaction: z.boolean().default(true),
    errorRate: z.boolean().default(true),
    handoffRate: z.boolean().default(true)
  }),
  
  // Reporting
  reportingInterval: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  emailReports: z.boolean().default(false),
  reportRecipients: z.array(normalizedEmail).optional(),
  
  // Alerts
  alerts: z.array(z.object({
    metric: z.enum([
      'response_time',
      'error_rate',
      'handoff_rate',
      'satisfaction_score'
    ]),
    threshold: z.number(),
    comparison: z.enum(['greater_than', 'less_than', 'equals']),
    windowMinutes: positiveInt.max(1440).default(60), // max 24 hours
    enabled: z.boolean().default(true)
  })).optional(),
  
  // Data Retention
  retentionDays: positiveInt
    .max(365, 'Retention period cannot exceed 365 days')
    .default(90),
  
  csrfToken: csrfToken
});

// ===== Type Exports =====

export type AgentConfigFormData = z.infer<typeof agentConfigSchema>;
export type AgentPromptFormData = z.infer<typeof agentPromptSchema>;
export type AgentTrainingFormData = z.infer<typeof agentTrainingSchema>;
export type AgentIntegrationFormData = z.infer<typeof agentIntegrationSchema>;
export type AgentAnalyticsFormData = z.infer<typeof agentAnalyticsSchema>;

// ===== Validation Helpers =====

/**
 * Validate prompt for potential issues
 */
export function validatePrompt(prompt: string): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for personal information patterns
  const personalInfoPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
  ];
  
  personalInfoPatterns.forEach(pattern => {
    if (pattern.test(prompt)) {
      warnings.push('Prompt may contain personal information');
    }
  });
  
  // Check prompt length
  if (prompt.length < 50) {
    suggestions.push('Consider adding more context to improve agent responses');
  }
  
  // Check for clear instructions
  if (!prompt.includes('you') && !prompt.includes('your')) {
    suggestions.push('Consider addressing the agent directly for clarity');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}