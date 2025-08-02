// Common types used across multiple API endpoints

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  message?: string
  success?: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  statusCode?: number
}

export interface PaginationParams {
  limit?: number
  offset?: number
  page?: number
  pageSize?: number
}

export interface PaginationResponse {
  limit: number
  offset: number
  total: number
  hasMore?: boolean
  page?: number
  totalPages?: number
}

export interface TimestampedEntity {
  created_at: string
  updated_at?: string
}

export interface IdentifiableEntity {
  id: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortParams {
  sortBy?: string
  sortDirection?: SortDirection
}

// Request body type that replaces 'any' in ApiOptions
export type ApiRequestBody = 
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | undefined
  | FormData
  | Array<unknown>

// Headers type
export type ApiHeaders = Record<string, string>

// Common status types
export type Status = 'active' | 'inactive' | 'pending' | 'archived'

// Common role types
export type Role = 'user' | 'admin' | 'human_agent' | 'viewer'

// Date range filter
export interface DateRangeFilter {
  start?: string
  end?: string
  startDate?: string
  endDate?: string
}