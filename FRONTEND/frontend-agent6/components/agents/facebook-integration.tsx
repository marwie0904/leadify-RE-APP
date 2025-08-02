"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Facebook,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Info,
  AlertTriangle,
  Globe,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface FacebookIntegrationStatus {
  connected: boolean
  pageName?: string
  pageId?: string
  webhookSubscribed?: boolean
  lastSync?: string
  error?: string
  accessToken?: string
  refreshToken?: string
}

interface FacebookIntegrationProps {
  agentId: string
  agentName: string
  compact?: boolean
}

// Helper function to test basic connectivity
async function testConnectivity(): Promise<{ canReachApi: boolean; error?: string }> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    // Try a simple HEAD request first to test basic connectivity
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "HEAD",
      mode: "cors",
      cache: "no-cache",
    })

    return { canReachApi: true }
  } catch (error) {
    console.error("Connectivity test failed:", error)
    return {
      canReachApi: false,
      error: error instanceof Error ? error.message : "Unknown connectivity error",
    }
  }
}

export function FacebookIntegration({ agentId, agentName, compact = false }: FacebookIntegrationProps) {
  const { getAuthHeaders } = useAuth()
  const [status, setStatus] = useState<FacebookIntegrationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null)
  const [connectivityIssue, setConnectivityIssue] = useState<boolean>(false)

  useEffect(() => {
    // Check if we're returning from OAuth flow
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const error = urlParams.get("error")
    const code = urlParams.get("code")
    const state = urlParams.get("state")
    const accessToken = urlParams.get("access_token")
    const refreshToken = urlParams.get("refresh_token")

    // Log tokens if they exist in URL params
    if (accessToken) {
      console.log("🔑 Access Token from OAuth callback:", accessToken)
    }
    if (refreshToken) {
      console.log("🔄 Refresh Token from OAuth callback:", refreshToken)
    }

    if (success === "true") {
      toast.success("Facebook integration completed successfully!")
      setConnecting(false) // Reset connecting state
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
      // Refresh status
      setTimeout(() => checkApiAvailability(), 1000)
    } else if (error) {
      toast.error(`Facebook integration failed: ${error}`)
      setConnecting(false) // Reset connecting state
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (code || state) {
      setConnecting(false) // Reset connecting state
      // Refresh status to see if integration was successful
      setTimeout(() => checkApiAvailability(), 1000)
    }

    // If no OAuth params detected, reset connecting state after a delay
    if (!success && !error && !code && !state) {
      setTimeout(() => {
        setConnecting(false)
      }, 5000)
    }

    // Initial check with delay to avoid immediate failures
    const timer = setTimeout(() => {
      checkApiAvailability()
    }, 1000)

    return () => clearTimeout(timer)
  }, [agentId])

  const checkApiAvailability = async () => {
    setLoading(true)
    setConnectivityIssue(false)

    try {
      // First test basic connectivity
      const connectivityTest = await testConnectivity()

      if (!connectivityTest.canReachApi) {
        setConnectivityIssue(true)
        setApiAvailable(false)
        setStatus({
          connected: false,
          error: "Cannot reach the API server. Please check your internet connection.",
        })
        return
      }

      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      // Check the status endpoint
      let response: Response

      try {
        response = await Promise.race([
          fetch(`${API_BASE_URL}/api/facebook/status/${agentId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            mode: "cors",
            credentials: "omit",
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 8000)),
        ])
      } catch (fetchError) {
        console.error("Fetch error:", fetchError)

        if (fetchError instanceof Error) {
          if (fetchError.message === "Request timeout") {
            setApiAvailable(false)
            setStatus({
              connected: false,
              error: "Facebook integration service is not responding (timeout)",
            })
            return
          } else if (fetchError.message.includes("Load failed") || fetchError.name === "TypeError") {
            setConnectivityIssue(true)
            setApiAvailable(false)
            setStatus({
              connected: false,
              error: "Network error - Facebook integration service may not be available",
            })
            return
          }
        }

        throw fetchError
      }

      if (response.ok) {
        const data = await response.json()

        // Log tokens from API response
        if (data.accessToken) {
          console.log("🔑 Access Token from API status:", data.accessToken)
        }
        if (data.refreshToken) {
          console.log("🔄 Refresh Token from API status:", data.refreshToken)
        }

        setStatus(data)
        setApiAvailable(true)
      } else if (response.status === 404) {
        // No integration found, but API is available
        setStatus({ connected: false })
        setApiAvailable(true)
      } else if (response.status >= 500) {
        // Server error - API might not be implemented
        setApiAvailable(false)
        setStatus({ connected: false, error: "Facebook integration API is experiencing server issues" })
      } else {
        // Other client errors
        setApiAvailable(true)
        setStatus({ connected: false, error: `API Error: ${response.status} ${response.statusText}` })
      }
    } catch (error) {
      console.error("Failed to check Facebook API availability:", error)

      let errorMessage = "Unknown error"

      if (error instanceof Error) {
        errorMessage = error.message

        // Handle specific error types
        if (error.message.includes("Load failed")) {
          errorMessage = "Cannot connect to Facebook integration service (network error)"
          setConnectivityIssue(true)
        } else if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
          errorMessage = "Cannot reach Facebook integration service"
          setConnectivityIssue(true)
        } else if (error.message === "Request timeout") {
          errorMessage = "Facebook integration service is not responding"
        }
      }

      setApiAvailable(false)
      setStatus({ connected: false, error: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleConnectFacebook = async () => {
    if (!apiAvailable) {
      toast.error("Facebook integration API is not available. Please contact your administrator.")
      return
    }

    // Show a mock integration flow for now since the API isn't working
    if (connectivityIssue) {
      toast.info(
        "Facebook integration is not available due to connectivity issues. This is a preview of the integration flow.",
      )

      // Simulate the integration process
      setConnecting(true)

      setTimeout(() => {
        const mockAccessToken = "mock_access_token_" + Date.now()
        const mockRefreshToken = "mock_refresh_token_" + Date.now()

        // Log mock tokens
        console.log("🔑 Mock Access Token (Demo Mode):", mockAccessToken)
        console.log("🔄 Mock Refresh Token (Demo Mode):", mockRefreshToken)

        setStatus({
          connected: true,
          pageName: "Demo Facebook Page",
          pageId: "demo-page-123",
          webhookSubscribed: false,
          lastSync: new Date().toISOString(),
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        })
        setConnecting(false)
        toast.success("Demo Facebook integration connected! (This is a simulation)")
      }, 2000)

      return
    }

    setConnecting(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const oauthUrl = `${API_BASE_URL}/api/facebook/oauth?agentId=${agentId}`

      // Add a small delay to show the debug info
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Test if we can reach the OAuth endpoint first
      try {
        const authHeaders = await getAuthHeaders()
        const testResponse = await Promise.race([
          fetch(oauthUrl, {
            method: "HEAD", // Just test if endpoint exists
            headers: {
              ...authHeaders,
            },
            mode: "cors",
            credentials: "omit",
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Test request timeout")), 5000)),
        ])

        if (!testResponse.ok && testResponse.status !== 405) {
          // 405 Method Not Allowed is OK for HEAD request
          throw new Error(`OAuth endpoint not accessible: ${testResponse.status} ${testResponse.statusText}`)
        }
      } catch (testError) {
        if (testError instanceof Error && testError.message.includes("timeout")) {
          throw new Error("OAuth endpoint is not responding (timeout)")
        }

        // Continue anyway - HEAD might not be supported
      }

      // Add a countdown before redirect
      for (let i = 3; i > 0; i--) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Try multiple redirect methods
      let redirectSuccess = false

      // Method 1: Direct window.location.href
      try {
        window.location.href = oauthUrl
        redirectSuccess = true

        // If we reach here, the redirect might have failed
        setTimeout(() => {
          if (!redirectSuccess) {
          }
        }, 2000)
      } catch (error) {}

      // Method 2: window.open in same tab (fallback)
      if (!redirectSuccess) {
        setTimeout(() => {
          try {
            const newWindow = window.open(oauthUrl, "_self")
            if (!newWindow) {
              throw new Error("window.open returned null - likely blocked by popup blocker")
            }
            redirectSuccess = true
          } catch (error) {
            // Method 3: Create a temporary link and click it
            try {
              const link = document.createElement("a")
              link.href = oauthUrl
              link.target = "_self"
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              redirectSuccess = true
            } catch (linkError) {
              // Method 4: Manual redirect instruction
              toast.error("Automatic redirect failed. Please click the manual redirect button below.")

              // Show manual redirect option
              const manualRedirectButton = document.createElement("button")
              manualRedirectButton.textContent = "Click here to continue to Facebook"
              manualRedirectButton.className = "bg-blue-500 text-white px-4 py-2 rounded mt-2"
              manualRedirectButton.onclick = () => {
                window.open(oauthUrl, "_self")
              }

              // Find a place to insert the button (this is a fallback)
              console.log("Manual redirect required:", oauthUrl)
            }
          }
        }, 2000)
      }

      // Set a timeout to reset connecting state in case user comes back without completing OAuth
      setTimeout(() => {
        if (!redirectSuccess) {
          setConnecting(false)
          toast.error("Automatic redirect failed. Please copy the URL from debug info and open it manually.")
        }
      }, 10000) // 10 second timeout
    } catch (error) {
      console.error("Failed to start Facebook OAuth:", error)

      let errorMessage = "Unknown error occurred"

      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast.error(`Failed to start Facebook connection: ${errorMessage}`)
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Facebook integration?")) {
      return
    }

    // If this is a demo connection, just reset the state
    if (connectivityIssue && status?.connected) {
      console.log("🔑 Clearing Access Token (Demo Mode):", status.accessToken)
      console.log("🔄 Clearing Refresh Token (Demo Mode):", status.refreshToken)
      setStatus({ connected: false })
      toast.success("Demo Facebook integration disconnected")
      return
    }

    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const response = await Promise.race([
        fetch(`${API_BASE_URL}/api/facebook/disconnect/${agentId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          mode: "cors",
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Disconnect request timeout")), 10000)),
      ])

      if (response.ok) {
        const data = await response.json()

        // Log token clearing
        if (status?.accessToken) {
          console.log("🔑 Clearing Access Token:", status.accessToken)
        }
        if (status?.refreshToken) {
          console.log("🔄 Clearing Refresh Token:", status.refreshToken)
        }

        toast.success("Facebook integration disconnected")
        setStatus({ connected: false })
      } else {
        throw new Error(`Failed to disconnect: ${response.statusText}`)
      }
    } catch (error) {
      console.error("Failed to disconnect Facebook:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Failed to disconnect Facebook: ${errorMessage}`)
    }
  }

  const getStatusBadge = () => {
    if (loading) {
      return <Badge variant="outline">Loading...</Badge>
    }

    if (connectivityIssue && status?.connected) {
      return <Badge className="bg-orange-100 text-orange-800">Demo Mode</Badge>
    }

    if (apiAvailable === false) {
      return <Badge variant="secondary">Not Available</Badge>
    }

    if (!status) {
      return <Badge variant="destructive">Unknown</Badge>
    }

    if (status.error) {
      return <Badge variant="destructive">Error</Badge>
    }

    if (status.connected && status.webhookSubscribed) {
      return <Badge className="bg-green-100 text-green-800">Connected & Active</Badge>
    }

    if (status.connected) {
      return <Badge className="bg-yellow-100 text-yellow-800">Connected (Setup Required)</Badge>
    }

    return <Badge variant="outline">Not Connected</Badge>
  }

  const getStatusIcon = () => {
    if (loading) {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    }

    if (connectivityIssue && status?.connected) {
      return <Globe className="h-5 w-5 text-orange-500" />
    }

    if (apiAvailable === false) {
      return <Info className="h-5 w-5 text-muted-foreground" />
    }

    if (status?.connected && status?.webhookSubscribed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }

    if (status?.error) {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }

    return <Facebook className="h-5 w-5 text-blue-500" />
  }

  // If API is not available, show a different UI
  if (apiAvailable === false && !status?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Facebook className="h-5 w-5 text-blue-500" />
              <span>Facebook Messenger Integration</span>
            </div>
            <Badge variant="secondary">Not Available</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  {connectivityIssue ? "Network Connectivity Issue" : "Facebook Integration Service Not Available"}
                </p>
                <p className="text-sm">
                  {connectivityIssue
                    ? "Cannot connect to the Facebook integration service. This may be due to network issues or the service being temporarily unavailable."
                    : "The Facebook Messenger integration feature is currently being developed. This feature will allow your AI agent to respond to messages on your Facebook page automatically."}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={checkApiAvailability}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2 bg-transparent"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>{loading ? "Checking..." : "Check Availability"}</span>
            </Button>

            {connectivityIssue && (
              <Button
                onClick={handleConnectFacebook}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 bg-transparent"
                disabled={connecting}
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                <span>{connecting ? "Connecting..." : "Try Demo Mode"}</span>
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Connect your Facebook page to enable Messenger integration</p>
            <p>• Your AI agent will respond to messages automatically</p>
            <p>• You can manage responses and view conversations in the Conversations tab</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Facebook className="h-5 w-5 text-blue-500" />
            <span>Facebook Messenger Integration</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!compact && (
          <div className="flex items-start space-x-3">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium">Connect {agentName} to Facebook Messenger</p>
              <p className="text-xs text-muted-foreground">
                Allow your AI agent to respond to messages on your Facebook page
                {connectivityIssue && status?.connected && " (Demo Mode - API not available)"}
              </p>
            </div>
          </div>
        )}

        {status?.error && !status?.connected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>{status.error}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {connectivityIssue && status?.connected && (
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Demo Mode Active</p>
                <p className="text-sm">
                  This is a demonstration of the Facebook integration interface. The actual API is not available due to
                  connectivity issues.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {status?.connected && !compact && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connected Page:</span>
              <span className="text-sm">{status.pageName || "Unknown Page"}</span>
            </div>
            {status.pageId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Page ID:</span>
                <span className="text-sm font-mono">{status.pageId}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Webhook Status:</span>
              <Badge variant={status.webhookSubscribed ? "default" : "outline"}>
                {status.webhookSubscribed ? "Active" : "Not Subscribed"}
              </Badge>
            </div>
            {status.lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Sync:</span>
                <span className="text-sm">{new Date(status.lastSync).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!status?.connected ? (
            <>
              <Button
                onClick={handleConnectFacebook}
                disabled={connecting || loading}
                className="flex items-center space-x-2"
                size={compact ? "sm" : "default"}
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
                <span>{connecting ? "Connecting..." : connectivityIssue ? "Try Demo Mode" : "Integrate Facebook"}</span>
                <ExternalLink className="h-3 w-3" />
              </Button>

              {/* Manual redirect button - shown when automatic redirect fails */}
              {connecting && (
                <Button
                  onClick={() => {
                    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
                    const oauthUrl = `${API_BASE_URL}/api/facebook/oauth?agentId=${agentId}`
                    window.open(oauthUrl, "_blank")
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open in New Tab</span>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={checkApiAvailability}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 bg-transparent"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span>{loading ? "Refreshing..." : "Refresh"}</span>
              </Button>

              <Button onClick={handleDisconnect} variant="destructive" size="sm">
                Disconnect
              </Button>
            </>
          )}
        </div>

        {!compact && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Connect your Facebook page to enable Messenger integration</p>
            <p>• Your AI agent will respond to messages automatically</p>
            <p>• You can manage responses and view conversations in the Conversations tab</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
