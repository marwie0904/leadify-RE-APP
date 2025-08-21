// Utility functions for transforming BANT configurations between database and frontend formats

export interface CriteriaItem {
  id?: string
  min?: number
  max?: number
  type?: string
  points: number
  label: string
}

export interface BANTConfig {
  id?: string
  agent_id?: string
  budget_weight: number
  authority_weight: number
  need_weight: number
  timeline_weight: number
  contact_weight: number
  budget_criteria: CriteriaItem[]
  authority_criteria: CriteriaItem[]
  need_criteria: CriteriaItem[]
  timeline_criteria: CriteriaItem[]
  contact_criteria: CriteriaItem[]
  priority_threshold: number
  hot_threshold: number
  warm_threshold: number
  bant_scoring_prompt?: string
  criteria_prompt?: string  // AI-generated scoring criteria prompt
  created_at?: string
  updated_at?: string
}

// Transform database format to frontend format
export function transformDBToFrontend(dbConfig: any): BANTConfig {
  return {
    ...dbConfig,
    // Budget criteria - already in correct format usually
    budget_criteria: ensureCriteriaArray(dbConfig.budget_criteria?.ranges || dbConfig.budget_criteria),
    
    // Authority criteria - already in correct format usually
    authority_criteria: ensureCriteriaArray(dbConfig.authority_criteria?.levels || dbConfig.authority_criteria),
    
    // Need criteria - might be stored as string array
    need_criteria: transformNeedCriteria(dbConfig.need_criteria),
    
    // Timeline criteria - already in correct format usually
    timeline_criteria: ensureCriteriaArray(dbConfig.timeline_criteria?.ranges || dbConfig.timeline_criteria),
    
    // Contact criteria - ensure it's an array
    contact_criteria: ensureCriteriaArray(dbConfig.contact_criteria)
  }
}

// Transform frontend format to database format
export function transformFrontendToDB(config: BANTConfig): any {
  return {
    ...config,
    budget_criteria: {
      ranges: config.budget_criteria || []
    },
    authority_criteria: {
      levels: config.authority_criteria || []
    },
    need_criteria: {
      categories: config.need_criteria || []
    },
    timeline_criteria: {
      ranges: config.timeline_criteria || []
    },
    contact_criteria: config.contact_criteria || []
  }
}

// Ensure criteria is always an array
function ensureCriteriaArray(criteria: any): CriteriaItem[] {
  if (Array.isArray(criteria)) {
    return criteria
  }
  return []
}

// Transform need criteria which might be stored as string array
function transformNeedCriteria(needCriteria: any): CriteriaItem[] {
  // If it's already an array of objects, return it
  if (Array.isArray(needCriteria)) {
    return needCriteria
  }
  
  // If it has a categories property
  if (needCriteria?.categories) {
    // If categories is an array of strings
    if (Array.isArray(needCriteria.categories)) {
      return needCriteria.categories.map((cat: any) => {
        if (typeof cat === 'string') {
          return {
            type: cat.toLowerCase().replace(/\s+/g, '_'),
            label: cat,
            points: 10
          }
        }
        return cat
      })
    }
  }
  
  return []
}