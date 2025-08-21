"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  
  useEffect(() => {
    // Redirect to analytics page by default
    router.replace(`/admin/organizations/${orgId}/analytics`)
  }, [orgId, router])
  
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to analytics...</p>
      </div>
    </div>
  )
}