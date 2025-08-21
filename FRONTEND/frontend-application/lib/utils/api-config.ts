/**
 * API Configuration Utilities
 * Handles consistent URL building and configuration across the application
 */

/**
 * Get the base API URL with trailing slash removed
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  // Ensure no trailing slash for consistency
  return url.replace(/\/$/, '');
}

/**
 * Build a complete API URL with proper formatting
 * @param endpoint - The API endpoint (with or without leading slash)
 * @returns Complete URL with proper formatting
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure endpoint starts with slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get request timeout based on environment
 */
export function getRequestTimeout(): number {
  return isDevelopment() ? 30000 : 10000; // 30s in dev, 10s in prod
}

/**
 * API Configuration object
 */
export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  timeout: getRequestTimeout(),
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  endpoints: {
    // Auth endpoints
    profile: '/api/settings/profile',
    signIn: '/api/auth/signin',
    signOut: '/api/auth/signout',
    
    // Organization endpoints
    organizationMembers: '/api/organization/members',
    organizationMember: (id: string) => `/api/organization/members/${id}`,
    organizationMemberRole: (id: string) => `/api/organization/members/${id}/role`,
    organizationInvite: '/api/organization/invite',
    
    // Agent endpoints
    agents: '/api/agents',
    agent: (id: string) => `/api/agents/${id}`,
    createAgent: '/api/agents',
    agentDocuments: (id: string) => `/api/agents/${id}/documents`,
    
    // Conversation endpoints
    conversations: '/api/conversations',
    conversation: (id: string) => `/api/conversations/${id}`,
    conversationMessages: (id: string) => `/api/conversations/${id}/messages`,
    sendMessage: (id: string) => `/api/conversations/${id}/send-message`,
    requestHandoff: (id: string) => `/api/conversations/${id}/request-handoff`,
    acceptHandoff: (id: string) => `/api/conversations/${id}/accept-handoff`,
    priorityQueue: '/api/conversations/priority-queue',
    
    // Lead endpoints
    leads: '/api/leads',
    lead: (id: string) => `/api/leads/${id}`,
    assignAgent: (id: string) => `/api/leads/${id}/assign-agent`,
    
    // Dashboard & Analytics
    dashboardSummary: '/api/dashboard/summary',
    analyticsRevenue: '/api/analytics/revenue',
    
    // Human Agent endpoints
    humanAgentDashboard: '/api/human-agents/dashboard',
    
    // Chat endpoint
    chat: '/api/chat',
    
    // Health endpoints
    health: '/api/health',
    healthReady: '/api/health/ready',
    healthLive: '/api/health/live',
  }
} as const;

/**
 * Type-safe endpoint builder
 */
export function getEndpoint<K extends keyof typeof apiConfig.endpoints>(
  key: K,
  ...args: typeof apiConfig.endpoints[K] extends (...args: any[]) => string 
    ? Parameters<typeof apiConfig.endpoints[K]> 
    : []
): string {
  const endpoint = apiConfig.endpoints[key];
  if (typeof endpoint === 'function') {
    return (endpoint as any)(...args);
  }
  return endpoint as string;
}