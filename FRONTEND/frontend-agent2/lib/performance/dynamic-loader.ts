import dynamic from 'next/dynamic';
import React, { type ComponentType } from 'react';

interface DynamicComponentConfig {
  loader: () => Promise<any>;
  loading?: () => React.JSX.Element;
  ssr?: boolean;
}

interface DynamicComponentMap {
  [key: string]: DynamicComponentConfig;
}

// Loading skeletons
const ChartSkeleton = () => (
  React.createElement('div', { className: "w-full h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center" },
    React.createElement('div', { className: "text-muted-foreground" }, "Loading chart...")
  )
);

const TableSkeleton = () => (
  React.createElement('div', { className: "w-full space-y-4" },
    React.createElement('div', { className: "h-4 bg-muted animate-pulse rounded w-3/4" }),
    React.createElement('div', { className: "h-4 bg-muted animate-pulse rounded w-1/2" }),
    React.createElement('div', { className: "h-4 bg-muted animate-pulse rounded w-2/3" }),
    React.createElement('div', { className: "h-4 bg-muted animate-pulse rounded w-1/3" })
  )
);

const ComponentSkeleton = () => (
  React.createElement('div', { className: "w-full h-48 bg-muted animate-pulse rounded-lg flex items-center justify-center" },
    React.createElement('div', { className: "text-muted-foreground" }, "Loading...")
  )
);

const DatePickerSkeleton = () => (
  React.createElement('div', { className: "h-10 w-64 bg-muted animate-pulse rounded" })
);

export const dynamicComponents: DynamicComponentMap = {
  // Analytics components (heavy with recharts)
  RevenueChart: {
    loader: () => import('@/components/analytics/revenue-chart'),
    loading: ChartSkeleton,
    ssr: false,
  },
  AccountGrowth: {
    loader: () => import('@/components/analytics/account-growth'),
    loading: ChartSkeleton,
    ssr: false,
  },
  AnalyticsTab: {
    loader: () => import('@/components/analytics/analytics-tab'),
    loading: ComponentSkeleton,
    ssr: false,
  },
  OverviewTab: {
    loader: () => import('@/components/analytics/overview-tab'),
    loading: ComponentSkeleton,
    ssr: false,
  },
  ReportsTab: {
    loader: () => import('@/components/analytics/reports-tab'),
    loading: TableSkeleton,
    ssr: false,
  },
  NotificationsTab: {
    loader: () => import('@/components/analytics/notifications-tab'),
    loading: ComponentSkeleton,
    ssr: false,
  },

  // Agent management (heavy tables and forms)
  AgentManagementPage: {
    loader: () => import('@/components/agents/agent-management-page'),
    loading: TableSkeleton,
    ssr: false,
  },
  ChatPreviewModal: {
    loader: () => import('@/components/agents/chat-preview-modal'),
    loading: ComponentSkeleton,
    ssr: false,
  },
  FacebookIntegration: {
    loader: () => import('@/components/agents/facebook-integration'),
    loading: ComponentSkeleton,
    ssr: false,
  },

  // Heavy third-party components
  DateRangePicker: {
    loader: () => import('@/components/date-range-picker'),
    loading: DatePickerSkeleton,
    ssr: false,
  },
  FileUpload: {
    loader: () => import('@/components/ui/file-upload'),
    loading: () => (
      React.createElement('div', { className: "h-32 border-2 border-dashed rounded-lg animate-pulse bg-muted flex items-center justify-center" },
        React.createElement('div', { className: "text-muted-foreground" }, "Loading file upload...")
      )
    ),
    ssr: false,
  },

  // Conversations and chat interfaces
  ConversationsPage: {
    loader: () => import('@/app/conversations/page'),
    loading: ComponentSkeleton,
    ssr: false,
  },

  // Organization management
  OrganizationMembersTable: {
    loader: () => import('@/components/organization/organization-members-table'),
    loading: TableSkeleton,
    ssr: false,
  },
  InviteMemberModal: {
    loader: () => import('@/components/organization/invite-member-modal'),
    loading: ComponentSkeleton,
    ssr: false,
  },

  // Leads management
  LeadsTable: {
    loader: () => import('@/components/leads/leads-table'),
    loading: TableSkeleton,
    ssr: false,
  },
  LeadDetailsModal: {
    loader: () => import('@/components/leads/lead-details-modal'),
    loading: ComponentSkeleton,
    ssr: false,
  },

  // Human-in-loop components
  PendingHandoffCard: {
    loader: () => import('@/components/human-in-loop/pending-handoff-card'),
    loading: ComponentSkeleton,
    ssr: false,
  },
  HandoffRequestButton: {
    loader: () => import('@/components/human-in-loop/handoff-request-button'),
    loading: () => (
      React.createElement('div', { className: "h-8 w-24 bg-muted animate-pulse rounded" })
    ),
    ssr: false,
  },
};

export function getDynamicComponent(name: keyof typeof dynamicComponents) {
  const config = dynamicComponents[name];
  if (!config) {
    throw new Error(`Dynamic component '${name}' not found`);
  }

  return dynamic(config.loader, {
    loading: config.loading,
    ssr: config.ssr ?? true,
  });
}

// Preload utility for dynamic components
export function preloadComponent(name: keyof typeof dynamicComponents) {
  const config = dynamicComponents[name];
  if (config) {
    // Preload the component
    config.loader().catch(console.error);
  }
}

// Preload multiple components
export function preloadComponents(names: (keyof typeof dynamicComponents)[]) {
  names.forEach(preloadComponent);
}

// Hook for component preloading on hover/interaction
export function useComponentPreloader() {
  const preloadOnHover = (name: keyof typeof dynamicComponents) => {
    return {
      onMouseEnter: () => preloadComponent(name),
      onFocus: () => preloadComponent(name),
    };
  };

  const preloadOnVisible = (name: keyof typeof dynamicComponents) => {
    // This would integrate with Intersection Observer
    // For now, just preload immediately
    preloadComponent(name);
  };

  return {
    preloadOnHover,
    preloadOnVisible,
    preloadComponent,
    preloadComponents,
  };
}