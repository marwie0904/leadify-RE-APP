// Client-side configuration
export const config = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
} as const

// Validate that required environment variables are set
if (typeof window !== 'undefined') {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    console.warn('Missing required environment variables')
  }
  
  // Log the API URL being used
  console.log('[Config] API URL:', config.API_URL)
}