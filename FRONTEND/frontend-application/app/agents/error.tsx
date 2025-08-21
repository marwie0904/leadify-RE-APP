"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AgentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Agents error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Unable to Load Agents
        </h2>
        <p className="text-gray-600 mb-6">
          There was an error loading your agents. Please try again.
        </p>
        <div className="space-y-2">
          <Button
            onClick={reset}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/dashboard"}
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}