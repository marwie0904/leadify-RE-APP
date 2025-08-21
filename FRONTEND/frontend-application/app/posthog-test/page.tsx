"use client"

import { useEffect } from "react"
import { usePostHog } from "posthog-js/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PostHogTestPage() {
  const posthog = usePostHog()

  useEffect(() => {
    // Send a test event when the page loads
    console.log("Sending PostHog test event...")
    posthog?.capture("posthog_test_page_viewed", {
      test: true,
      timestamp: new Date().toISOString(),
      message: "PostHog installation verification"
    })
  }, [posthog])

  const sendTestEvent = () => {
    console.log("Sending manual test event...")
    posthog?.capture("test_button_clicked", {
      button_name: "Test PostHog",
      timestamp: new Date().toISOString(),
      test: true
    })
    alert("Test event sent to PostHog! Check your PostHog dashboard.")
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>PostHog Installation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ PostHog is Installed!</h3>
            <p className="text-sm text-green-700">
              A test event has been automatically sent to PostHog.
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              PostHog Session ID: <code className="bg-gray-100 px-2 py-1 rounded">
                {typeof window !== 'undefined' && posthog?.get_session_id()}
              </code>
            </p>
            <p className="text-sm text-gray-600">
              PostHog Distinct ID: <code className="bg-gray-100 px-2 py-1 rounded">
                {typeof window !== 'undefined' && posthog?.get_distinct_id()}
              </code>
            </p>
          </div>

          <Button 
            onClick={sendTestEvent}
            className="w-full"
          >
            Send Test Event to PostHog
          </Button>

          <div className="text-sm text-gray-500 space-y-1">
            <p>• This page automatically sent a "posthog_test_page_viewed" event</p>
            <p>• Click the button above to send a "test_button_clicked" event</p>
            <p>• Check your PostHog dashboard to see these events</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}