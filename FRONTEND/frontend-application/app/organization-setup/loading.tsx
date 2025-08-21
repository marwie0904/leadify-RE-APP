import { Loader2 } from "lucide-react"

export default function OrganizationSetupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">Setting up your organization...</p>
      </div>
    </div>
  )
}