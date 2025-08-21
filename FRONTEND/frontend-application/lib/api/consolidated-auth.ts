/**
 * Consolidated Auth Data Fetcher
 * Combines multiple API calls into a single consolidated response
 * Includes request deduplication and caching to prevent rate limiting
 */

import { buildApiUrl, apiConfig } from '@/lib/utils/api-config';
import type { ConsolidatedAuthResponse } from '@/application/auth/api/AuthApiClient';

// Request deduplication cache - prevents multiple concurrent requests for same data
const requestCache = new Map<string, Promise<any>>();
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache TTL values
const CACHE_TTL = {
  PROFILE: 30 * 1000, // 30 seconds for profile data
  ORGANIZATION: 60 * 1000, // 1 minute for organization data
  USER_WITH_ORG: 30 * 1000, // 30 seconds for combined user data
};

/**
 * Generic request deduplication wrapper
 */
async function dedupedRequest<T>(
  cacheKey: string,
  requestFn: () => Promise<T>,
  ttl: number = 30000
): Promise<T> {
  // Check if we have a valid cached result
  const cached = dataCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    console.log(`[Request Cache] Using cached data for: ${cacheKey}`);
    return cached.data;
  }

  // Check if request is already in progress
  if (requestCache.has(cacheKey)) {
    console.log(`[Request Cache] Deduplicating request for: ${cacheKey}`);
    return requestCache.get(cacheKey)!;
  }

  // Create new request
  const requestPromise = requestFn().then((data) => {
    // Cache the result
    dataCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Remove from active requests
    requestCache.delete(cacheKey);
    
    console.log(`[Request Cache] Cached new data for: ${cacheKey}`);
    return data;
  }).catch((error) => {
    // Remove from active requests on error
    requestCache.delete(cacheKey);
    throw error;
  });

  // Store in active requests
  requestCache.set(cacheKey, requestPromise);
  
  return requestPromise;
}

/**
 * Clear cache entries (useful for forced refresh)
 */
export function clearAuthCache(userId?: string) {
  if (userId) {
    // Clear specific user cache
    const keys = Array.from(dataCache.keys()).filter(key => key.includes(userId));
    keys.forEach(key => {
      dataCache.delete(key);
      requestCache.delete(key);
    });
    console.log(`[Request Cache] Cleared cache for user: ${userId}`);
  } else {
    // Clear all cache
    dataCache.clear();
    requestCache.clear();
    console.log('[Request Cache] Cleared all auth cache');
  }
}

interface ProfileResponse {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  phone?: string;
  organization_id?: string;
  organizationId?: string;
  role?: string;
  is_human_agent?: boolean;
  human_agent_id?: string;
  hasOrganization?: boolean;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
  organization?: {
    id: string;
    name: string;
  };
}

/**
 * Fetch consolidated user data by combining profile and organization endpoints
 * This replaces the non-existent /api/auth/user/consolidated endpoint
 */
export async function fetchConsolidatedUserData(
  token: string
): Promise<ConsolidatedAuthResponse> {
  try {
    // Parallel fetch for better performance
    const [profileResponse, orgResponse] = await Promise.allSettled([
      fetch(buildApiUrl(apiConfig.endpoints.profile), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(buildApiUrl(apiConfig.endpoints.organizationMembers), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    // Handle profile data
    let userData: ProfileResponse | null = null;
    if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
      userData = await profileResponse.value.json();
      console.log('[Consolidated Auth] Profile data fetched successfully');
    } else if (profileResponse.status === 'fulfilled') {
      console.warn('[Consolidated Auth] Profile fetch failed:', profileResponse.value.status);
    } else {
      console.error('[Consolidated Auth] Profile fetch error:', profileResponse.reason);
    }

    // Handle organization data
    let organizationData = null;
    if (orgResponse.status === 'fulfilled' && orgResponse.value.ok) {
      const membersData = await orgResponse.value.json();
      const members = Array.isArray(membersData) ? membersData : membersData.members || [];
      
      // Find current user in members list
      const currentUserMember = members.find((m: OrganizationMember) => 
        m.user_id === userData?.id || 
        (userData?.email && m.user_id === userData.email)
      );
      
      if (currentUserMember) {
        organizationData = {
          id: currentUserMember.organization_id,
          name: currentUserMember.organization?.name || 'Organization',
          memberRole: currentUserMember.role,
          memberSince: currentUserMember.created_at
        };
        console.log('[Consolidated Auth] Organization data found for user');
      } else {
        console.log('[Consolidated Auth] User not found in organization members');
      }
    } else if (orgResponse.status === 'fulfilled') {
      console.warn('[Consolidated Auth] Organization fetch failed:', orgResponse.value.status);
    } else {
      console.error('[Consolidated Auth] Organization fetch error:', orgResponse.reason);
    }

    // If we have organization_id from profile but couldn't fetch org data, create minimal org data
    if (!organizationData && userData && (userData.organization_id || userData.organizationId)) {
      organizationData = {
        id: userData.organization_id || userData.organizationId || '',
        name: 'Organization',
        memberRole: userData.role || 'member',
        memberSince: new Date().toISOString()
      };
    }

    // Return consolidated response with fallback values
    return {
      user: {
        id: userData?.id || '',
        email: userData?.email || '',
        profile: {
          name: userData?.name || userData?.email?.split('@')[0] || 'User',
          avatar: userData?.avatar,
          phone: userData?.phone
        }
      },
      organization: organizationData,
      permissions: [], // Backend doesn't provide this yet
      session: {
        expiresAt: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
      }
    };
  } catch (error) {
    console.error('[Consolidated Auth] Failed to fetch consolidated user data:', error);
    throw new Error('Failed to fetch user data');
  }
}

/**
 * Fetch user profile with organization data for auth context
 * This is optimized for the auth-context.tsx use case with request deduplication
 */
export async function fetchUserWithOrganization(
  userId: string,
  token: string
): Promise<{
  profile: ProfileResponse | null;
  organizationMember: OrganizationMember | null;
  hasOrganization: boolean;
}> {
  const cacheKey = `user-with-org-${userId}`;
  
  return dedupedRequest(
    cacheKey,
    async () => {
      // Fetch profile with deduplication
      const profile = await dedupedRequest(
        `profile-${userId}`,
        async () => {
          const profileResponse = await fetch(buildApiUrl(apiConfig.endpoints.profile), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            // Handle nested profile structure from API
            const profile = profileData.profile || profileData;
            console.log('[Consolidated Auth] Profile response:', profile);
            return profile;
          } else {
            console.log('[Consolidated Auth] Profile response failed:', profileResponse.status);
            return null;
          }
        },
        CACHE_TTL.PROFILE
      );

      // Fetch organization data with deduplication
      const organizationMember = await dedupedRequest(
        `org-member-${userId}`,
        async () => {
          // Try direct member endpoint first (might be supported in future)
          try {
            const directResponse = await fetch(
              buildApiUrl(apiConfig.endpoints.organizationMember(userId)),
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            console.log('[Consolidated Auth] Direct member endpoint response:', directResponse.status);
            if (directResponse.ok) {
              const data = await directResponse.json();
              console.log('[Consolidated Auth] Direct member data:', data);
              return data.member || data;
            }
          } catch (error) {
            console.log('[Consolidated Auth] Direct member endpoint error:', error);
            // Direct endpoint not available, fallback to bulk
          }

          // Fallback to bulk endpoint if direct fails
          const bulkResponse = await fetch(
            buildApiUrl(apiConfig.endpoints.organizationMembers),
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          console.log('[Consolidated Auth] Bulk members endpoint response:', bulkResponse.status);
          if (bulkResponse.ok) {
            const data = await bulkResponse.json();
            console.log('[Consolidated Auth] Bulk members data:', data);
            const members = Array.isArray(data) ? data : data.members || [];
            console.log('[Consolidated Auth] All members:', members);
            console.log('[Consolidated Auth] Looking for userId:', userId);
            const foundMember = members.find((m: any) => {
              console.log('[Consolidated Auth] Checking member:', m, 'against userId:', userId);
              // The API returns enriched members with 'id' field containing the user_id
              return m.id === userId || m.user_id === userId;
            }) || null;
            console.log('[Consolidated Auth] Found organization member:', foundMember);
            return foundMember;
          } else if (bulkResponse.status === 404) {
            // User doesn't belong to any organization yet
            console.log('[Consolidated Auth] User does not belong to any organization (404)');
            return null;
          }
          
          return null;
        },
        CACHE_TTL.ORGANIZATION
      );

      // If we found the member in the organization members list, they have an organization
      // Even if the member object doesn't have organization_id field
      const hasOrganization = !!(
        organizationMember ||
        profile?.organization_id ||
        profile?.organizationId
      );

      return {
        profile,
        organizationMember,
        hasOrganization
      };
    },
    CACHE_TTL.USER_WITH_ORG
  );
}