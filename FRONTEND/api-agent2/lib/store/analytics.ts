import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export interface AnalyticsMetric {
  id: string
  name: string
  value: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  period: string
}

export interface ChartData {
  name: string
  [key: string]: any // Allow flexible data structure for different chart types
}

export interface Report {
  id: string
  name: string
  type: 'revenue' | 'user' | 'conversion' | 'custom'
  data: any
  generatedAt: string
}

export interface Notification {
  id: string
  title: string
  description: string
  type: 'info' | 'warning' | 'error' | 'success'
  timestamp: string
  read: boolean
}

interface AnalyticsState {
  // State
  dateRange: DateRange
  metrics: AnalyticsMetric[]
  chartData: Record<string, ChartData[]> // Keyed by chart type
  reports: Report[]
  notifications: Notification[]
  selectedReportType: string | null
  loading: boolean
  error: string | null

  // Actions
  setDateRange: (dateRange: DateRange) => void
  setMetrics: (metrics: AnalyticsMetric[]) => void
  updateMetric: (id: string, updates: Partial<AnalyticsMetric>) => void
  
  // Chart data actions
  setChartData: (chartType: string, data: ChartData[]) => void
  clearChartData: (chartType?: string) => void
  
  // Report actions
  setReports: (reports: Report[]) => void
  addReport: (report: Report) => void
  removeReport: (id: string) => void
  selectReportType: (type: string | null) => void
  
  // Notification actions
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markNotificationAsRead: (id: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Utility actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  dateRange: { from: undefined, to: undefined },
  metrics: [],
  chartData: {},
  reports: [],
  notifications: [],
  selectedReportType: null,
  loading: false,
  error: null,
}

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setDateRange: (dateRange) =>
          set((state) => ({ ...state, dateRange })),

        setMetrics: (metrics) =>
          set((state) => ({ ...state, metrics })),

        updateMetric: (id, updates) =>
          set((state) => ({
            ...state,
            metrics: state.metrics.map((metric) =>
              metric.id === id ? { ...metric, ...updates } : metric
            ),
          })),

        // Chart data management
        setChartData: (chartType, data) =>
          set((state) => ({
            ...state,
            chartData: { ...state.chartData, [chartType]: data },
          })),

        clearChartData: (chartType) =>
          set((state) => ({
            ...state,
            chartData: chartType
              ? { ...state.chartData, [chartType]: [] }
              : {},
          })),

        // Report management
        setReports: (reports) =>
          set((state) => ({ ...state, reports })),

        addReport: (report) =>
          set((state) => ({
            ...state,
            reports: [...state.reports, report],
          })),

        removeReport: (id) =>
          set((state) => ({
            ...state,
            reports: state.reports.filter((report) => report.id !== id),
          })),

        selectReportType: (type) =>
          set((state) => ({ ...state, selectedReportType: type })),

        // Notification management
        setNotifications: (notifications) =>
          set((state) => ({ ...state, notifications })),

        addNotification: (notification) =>
          set((state) => ({
            ...state,
            notifications: [notification, ...state.notifications],
          })),

        markNotificationAsRead: (id) =>
          set((state) => ({
            ...state,
            notifications: state.notifications.map((notif) =>
              notif.id === id ? { ...notif, read: true } : notif
            ),
          })),

        removeNotification: (id) =>
          set((state) => ({
            ...state,
            notifications: state.notifications.filter(
              (notif) => notif.id !== id
            ),
          })),

        clearNotifications: () =>
          set((state) => ({ ...state, notifications: [] })),

        setLoading: (loading) =>
          set((state) => ({ ...state, loading })),

        setError: (error) =>
          set((state) => ({ ...state, error })),

        reset: () => set(initialState),
      }),
      {
        name: 'analytics-storage',
        partialize: (state) => ({
          dateRange: state.dateRange,
          selectedReportType: state.selectedReportType,
          // Don't persist metrics, chartData, or notifications as they should be fresh
        }),
      }
    )
  )
)