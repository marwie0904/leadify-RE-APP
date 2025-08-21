// Mock data for test mode
export const mockAnalyticsData = {
  overview: {
    total_conversations: 156,
    total_leads: 45,
    total_tokens: 1250000,
    total_cost: 125.50,
    conversion_rate: 28.8
  },
  tokenUsageByModel: [
    {
      model: 'GPT-5',
      tokens: 750000,
      promptTokens: 500000,
      completionTokens: 250000,
      cost: 75.00,
      requests: 150,
      avgTokensPerRequest: 5000
    },
    {
      model: 'MINI',
      tokens: 350000,
      promptTokens: 200000,
      completionTokens: 150000,
      cost: 35.00,
      requests: 200,
      avgTokensPerRequest: 1750
    },
    {
      model: 'NANO',
      tokens: 150000,
      promptTokens: 100000,
      completionTokens: 50000,
      cost: 15.50,
      requests: 300,
      avgTokensPerRequest: 500
    }
  ],
  tokenUsageByTask: [
    {
      task: 'BANT Extraction',
      tokens: 450000,
      cost: 45.00,
      requests: 150,
      avgTokensPerRequest: 3000,
      avgResponseTime: 2.5
    },
    {
      task: 'Generating Reply',
      tokens: 550000,
      cost: 55.00,
      requests: 200,
      avgTokensPerRequest: 2750,
      avgResponseTime: 3.2
    },
    {
      task: 'Scoring',
      tokens: 250000,
      cost: 25.50,
      requests: 250,
      avgTokensPerRequest: 1000,
      avgResponseTime: 1.8
    }
  ],
  monthlyConversations: Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return {
      date: date.toISOString().split('T')[0],
      conversations: Math.floor(Math.random() * 20) + 5,
      tokens: Math.floor(Math.random() * 50000) + 10000,
      cost: Math.random() * 10 + 2
    }
  })
}

export const mockConversationsData = {
  conversations: [
    {
      id: 'conv-1',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      agent_id: 'agent-1',
      agent_name: 'Sales Bot Pro',
      user_name: 'John Doe',
      user_email: 'john@example.com',
      source: 'web',
      status: 'active',
      message_count: 12,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 86400000).toISOString(),
      total_tokens: 1500,
      prompt_tokens: 800,
      completion_tokens: 700,
      messages: [
        { id: 'msg-1', content: 'Hello, I need help with property evaluation', role: 'user', created_at: new Date().toISOString() },
        { id: 'msg-2', content: 'I can help you with that! What type of property are you looking for?', role: 'assistant', created_at: new Date().toISOString() }
      ],
      avgCostPerMessage: 0.15,
      totalCost: 1.80,
      average_cost_per_message: 0.15,
      total_cost: 1.80
    },
    {
      id: 'conv-2',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      agent_id: 'agent-2',
      agent_name: 'Lead Qualifier AI',
      user_name: 'Jane Smith',
      user_email: 'jane@example.com',
      source: 'facebook',
      status: 'completed',
      message_count: 8,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      started_at: new Date(Date.now() - 172800000).toISOString(),
      total_tokens: 1200,
      prompt_tokens: 600,
      completion_tokens: 600,
      messages: [
        { id: 'msg-3', content: 'Looking for a house in the downtown area', role: 'user', created_at: new Date().toISOString() },
        { id: 'msg-4', content: 'Great! I can help you find the perfect property downtown.', role: 'assistant', created_at: new Date().toISOString() }
      ],
      avgCostPerMessage: 0.12,
      totalCost: 0.96,
      average_cost_per_message: 0.12,
      total_cost: 0.96
    }
  ],
  stats: {
    total_conversations: 156,
    active_conversations: 42,
    avg_messages_per_conversation: 10.5,
    total_cost: 125.50,
    avg_cost_per_conversation: 0.80,
    total_tokens_used: 1250000,
    average_tokens_per_conversation: 8000,
    conversations_by_source: {
      web: 80,
      facebook: 50,
      embed: 20,
      api: 6
    },
    total_cost_estimate: 125.50,
    average_cost_per_conversation: 0.80
  }
}

export const mockLeadsData = {
  leads: [
    {
      id: 'lead-1',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      agent_id: 'agent-1',
      agent_name: 'Sales Bot Pro',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1 555-0100',
      source: 'web',
      status: 'qualified',
      score: 85,
      budget: '$500,000 - $750,000',
      authority: 'Decision Maker',
      need: 'Family Home',
      timeline: '3-6 months',
      bant_score: 85,
      property_type: 'Single Family Home',
      location: 'Downtown Area',
      conversation_count: 3,
      created_at: new Date(Date.now() - 259200000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'lead-2',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      agent_id: 'agent-2',
      agent_name: 'Lead Qualifier AI',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1 555-0101',
      source: 'facebook',
      status: 'nurturing',
      score: 65,
      budget: '$300,000 - $400,000',
      authority: 'Influencer',
      need: 'Investment Property',
      timeline: '6-12 months',
      bant_score: 65,
      property_type: 'Condo',
      location: 'Suburban Area',
      conversation_count: 2,
      created_at: new Date(Date.now() - 432000000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ]
}

export const mockMembersData = {
  members: [
    {
      id: 'member-1',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      user_id: 'user-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      joined_at: new Date(Date.now() - 2592000000).toISOString(),
      last_active: new Date().toISOString()
    },
    {
      id: 'member-2',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      user_id: 'user-2',
      name: 'Sales Manager',
      email: 'sales@example.com',
      role: 'member',
      status: 'active',
      joined_at: new Date(Date.now() - 1728000000).toISOString(),
      last_active: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'member-3',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      user_id: 'user-3',
      name: 'Marketing Team',
      email: 'marketing@example.com',
      role: 'viewer',
      status: 'active',
      joined_at: new Date(Date.now() - 864000000).toISOString(),
      last_active: new Date(Date.now() - 7200000).toISOString()
    }
  ]
}

export const mockAgentsData = {
  agents: [
    {
      id: 'agent-1',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      name: 'Sales Bot Pro',
      description: 'Advanced sales qualification and property matching AI',
      status: 'active',
      type: 'sales',
      bant_enabled: true,
      bant_config: {
        weights: {
          budget: 30,
          authority: 25,
          need: 25,
          timeline: 20
        },
        thresholds: {
          qualified: 70,
          hot: 80,
          warm: 50,
          cold: 30
        },
        criteria: {
          budget: ['$200k-$400k', '$400k-$600k', '$600k-$800k', '$800k+'],
          authority: ['Decision Maker', 'Influencer', 'User', 'Champion'],
          need: ['Immediate', 'Short-term', 'Long-term', 'Exploring'],
          timeline: ['This month', '1-3 months', '3-6 months', '6+ months']
        },
        questions: {
          budget: 'What is your budget range for this property?',
          authority: 'Are you the primary decision maker for this purchase?',
          need: 'What specific features are you looking for in a property?',
          timeline: 'When are you planning to make a purchase?'
        }
      },
      created_at: new Date(Date.now() - 2592000000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'agent-2',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      name: 'Lead Qualifier AI',
      description: 'Intelligent lead qualification and scoring system',
      status: 'active',
      type: 'qualifier',
      bant_enabled: true,
      bant_config: {
        weights: {
          budget: 25,
          authority: 30,
          need: 20,
          timeline: 25
        },
        thresholds: {
          qualified: 75,
          hot: 85,
          warm: 55,
          cold: 35
        },
        criteria: {
          budget: ['Under $200k', '$200k-$500k', '$500k-$1M', 'Over $1M'],
          authority: ['Owner', 'Partner', 'Manager', 'Employee'],
          need: ['Critical', 'Important', 'Nice to have', 'Exploring'],
          timeline: ['Immediate', '1-2 months', '3-6 months', 'Future']
        },
        questions: {
          budget: 'What is your investment capacity?',
          authority: 'What is your role in the decision process?',
          need: 'How urgent is your property requirement?',
          timeline: 'What is your target timeline for acquisition?'
        }
      },
      created_at: new Date(Date.now() - 1728000000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  stats: {
    total_agents: 2,
    active_agents: 2,
    bant_enabled: 2,
    bant_enabled_agents: 2,
    conversations_handled: 156,
    leads_generated: 45,
    total_conversations: 156,
    total_leads: 45,
    total_tokens: 1250000,
    average_lead_score: 75
  }
}

export const mockIssuesData = {
  issues: [
    {
      id: 'issue-1',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      title: 'Chat widget not loading on mobile',
      description: 'The chat widget fails to load on mobile devices when embedded in our website.',
      status: 'open',
      priority: 'high',
      category: 'bug',
      reporter: 'john@example.com',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'issue-2',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      title: 'Slow response times during peak hours',
      description: 'AI responses are taking longer than usual during business hours.',
      status: 'investigating',
      priority: 'medium',
      category: 'performance',
      reporter: 'admin@example.com',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  features: [
    {
      id: 'feature-1',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      title: 'Add WhatsApp integration',
      description: 'Support for WhatsApp Business API to handle conversations from WhatsApp.',
      status: 'planned',
      priority: 'high',
      votes: 15,
      requester: 'sales@example.com',
      created_at: new Date(Date.now() - 432000000).toISOString(),
      updated_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'feature-2',
      organization_id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      title: 'Custom AI training on company data',
      description: 'Allow training the AI on our specific property listings and company policies.',
      status: 'under_review',
      priority: 'medium',
      votes: 8,
      requester: 'marketing@example.com',
      created_at: new Date(Date.now() - 604800000).toISOString(),
      updated_at: new Date(Date.now() - 259200000).toISOString()
    }
  ]
}