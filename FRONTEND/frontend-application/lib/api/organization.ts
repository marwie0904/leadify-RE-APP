/**
 * Organization API Helper
 * Handles organization-related API calls with proper error handling and fallbacks
 */

import { buildApiUrl, apiConfig } from '@/lib/utils/api-config';
import { withRetry } from './retry-handler';
import { withFallback } from './fallback-handlers';

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'moderator' | 'agent' | 'human_agent';
  email: string;
  name?: string;
  username?: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  status?: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at?: string;
  organization?: {
    id: string;
    name: string;
  };
}

export interface OrganizationMemberResponse {
  member?: OrganizationMember;
  members?: OrganizationMember[];
  success?: boolean;
  message?: string;
}

/**
 * Get a single organization member by ID
 * Implements fallback to bulk endpoint if direct endpoint is not available
 */
export async function getOrganizationMember(
  memberId: string,
  token: string
): Promise<OrganizationMemberResponse> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Try direct endpoint first (for future backend support)
    const directUrl = buildApiUrl(apiConfig.endpoints.organizationMember(memberId));
    console.log(`[Organization API] Attempting direct member fetch: ${directUrl}`);
    
    const directResponse = await withRetry(
      () => fetch(directUrl, { headers }),
      { maxRetries: 1 } // Only retry once for direct endpoint
    );

    if (directResponse.ok) {
      const data = await directResponse.json();
      console.log('[Organization API] Direct member fetch successful');
      return { member: data.member || data, success: true };
    }

    // If 404, try bulk endpoint as fallback
    if (directResponse.status === 404) {
      console.log('[Organization API] Direct endpoint not found, falling back to bulk endpoint');
      
      const bulkResponse = await withRetry(
        () => fetch(buildApiUrl(apiConfig.endpoints.organizationMembers), { headers })
      );

      if (bulkResponse.ok) {
        const data = await bulkResponse.json();
        const members = Array.isArray(data) ? data : data.members || [];
        
        // Find the specific member
        const member = members.find((m: OrganizationMember) => 
          m.id === memberId || m.user_id === memberId
        );
        
        if (member) {
          console.log('[Organization API] Member found in bulk response');
          return { member, success: true };
        }
        
        return {
          success: false,
          message: 'Member not found in organization'
        };
      }
    }

    // Other errors
    const errorText = await directResponse.text();
    throw new Error(`Failed to fetch member: ${directResponse.status} - ${errorText}`);
    
  } catch (error) {
    console.error('[Organization API] Failed to fetch organization member:', error);
    throw error;
  }
}

/**
 * Get all organization members
 */
export async function getOrganizationMembers(
  token: string
): Promise<OrganizationMember[]> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await withRetry(
      () => fetch(buildApiUrl(apiConfig.endpoints.organizationMembers), { headers })
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch members: ${response.status}`);
    }

    const data = await response.json();
    const members = Array.isArray(data) ? data : data.members || [];
    
    // Normalize member data
    return members.map(normalizeMemberData);
    
  } catch (error) {
    console.error('[Organization API] Failed to fetch organization members:', error);
    // Return empty array as fallback
    return withFallback(
      () => Promise.reject(error),
      apiConfig.endpoints.organizationMembers,
      []
    );
  }
}

/**
 * Update organization member role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await withRetry(
      () => fetch(
        buildApiUrl(apiConfig.endpoints.organizationMemberRole(memberId)),
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ role: newRole })
        }
      ),
      { maxRetries: 2 } // Fewer retries for mutations
    );

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: data.message };
    }

    if (response.status === 403) {
      return {
        success: false,
        message: "You don't have permission to change this member's role"
      };
    }

    const errorText = await response.text();
    return {
      success: false,
      message: `Failed to update role: ${errorText}`
    };
    
  } catch (error) {
    console.error('[Organization API] Failed to update member role:', error);
    return {
      success: false,
      message: 'Network error while updating role'
    };
  }
}

/**
 * Remove organization member
 */
export async function removeOrganizationMember(
  memberId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await withRetry(
      () => fetch(
        buildApiUrl(apiConfig.endpoints.organizationMember(memberId)),
        {
          method: 'DELETE',
          headers
        }
      ),
      { maxRetries: 2 }
    );

    if (response.ok) {
      return { success: true, message: 'Member removed successfully' };
    }

    if (response.status === 403) {
      return {
        success: false,
        message: "You don't have permission to remove this member"
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        message: 'Member not found'
      };
    }

    const errorText = await response.text();
    return {
      success: false,
      message: `Failed to remove member: ${errorText}`
    };
    
  } catch (error) {
    console.error('[Organization API] Failed to remove member:', error);
    return {
      success: false,
      message: 'Network error while removing member'
    };
  }
}

/**
 * Invite new member to organization
 */
export async function inviteOrganizationMember(
  inviteData: { email: string; role: string },
  token: string
): Promise<{ success: boolean; message?: string; invitation?: any }> {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await withRetry(
      () => fetch(
        buildApiUrl(apiConfig.endpoints.organizationInvite),
        {
          method: 'POST',
          headers,
          body: JSON.stringify(inviteData)
        }
      ),
      { maxRetries: 2 }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: 'Invitation sent successfully',
        invitation: data.invitation || data
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to send invitation'
    };
    
  } catch (error) {
    console.error('[Organization API] Failed to invite member:', error);
    return {
      success: false,
      message: 'Network error while sending invitation'
    };
  }
}

/**
 * Normalize member data from various formats
 */
function normalizeMemberData(member: any): OrganizationMember {
  return {
    id: member.id,
    user_id: member.user_id || member.userId,
    organization_id: member.organization_id || member.organizationId,
    role: member.role,
    email: member.email,
    name: member.name || 
          member.username || 
          member.full_name || 
          member.fullName ||
          (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null) ||
          member.email?.split('@')[0] ||
          'Unknown User',
    status: member.status || 'active',
    created_at: member.created_at || member.createdAt || member.joinedAt || new Date().toISOString(),
    updated_at: member.updated_at || member.updatedAt || member.lastActive,
    organization: member.organization
  };
}