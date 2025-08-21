// Simple test to validate Supabase Realtime setup
const { createClient } = require('@supabase/supabase-js')

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key'

if (!supabaseUrl || supabaseUrl === 'your_supabase_url' || !supabaseKey || supabaseKey === 'your_supabase_anon_key') {
  console.error('❌ Supabase environment variables not properly configured')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRealtimeConnection() {
  console.log('🧪 Testing Supabase Realtime connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('messages').select('id').limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    
    // Test realtime subscription
    console.log('🔄 Testing Realtime subscription...')
    
    const channel = supabase
      .channel('test_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('✅ Realtime message received:', payload)
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription successful!')
          console.log('🎉 SSE to Supabase Realtime migration validated!')
          
          // Cleanup and exit
          setTimeout(() => {
            supabase.removeChannel(channel)
            process.exit(0)
          }, 2000)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Realtime subscription failed:', status)
          process.exit(1)
        }
      })
    
    // Test notification subscription as well
    const notificationChannel = supabase
      .channel('test_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('✅ Realtime notification received:', payload)
        }
      )
      .subscribe((status) => {
        console.log('🔔 Notification subscription status:', status)
      })
    
    // Keep the test running for a bit
    setTimeout(() => {
      console.log('⏱️  Test completed after 10 seconds')
      supabase.removeChannel(channel)
      supabase.removeChannel(notificationChannel)
      process.exit(0)
    }, 10000)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testRealtimeConnection()