"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WelcomeScreen } from "./welcome-screen"
import { OrganizationSetup } from "./organization-setup"
import { CompanyInfoSetup } from "./company-info-setup"
import { AgentCreationWizard } from "./agent-creation-wizard"
import { OnboardingComplete } from "./onboarding-complete"
import { useAuth } from "@/contexts/simple-auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export type OnboardingStep = 
  | "welcome"
  | "organization"
  | "company-info"
  | "agent-creation"
  | "complete"

interface OnboardingFlowProps {
  initialStep?: OnboardingStep
}

export function OnboardingFlow({ initialStep = "welcome" }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep)
  
  // Debug logging
  console.log("[OnboardingFlow] Current step:", currentStep)
  console.log("[OnboardingFlow] Initial step was:", initialStep)
  const [organizationData, setOrganizationData] = useState<{ id: string; name: string } | null>(null)
  const [organizationName, setOrganizationName] = useState<string>("")
  const [companyInfo, setCompanyInfo] = useState<{
    companyOverview: string
    industry: string
    productService: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const { getAuthHeaders, refreshUserOrganization, signOut } = useAuth()
  const router = useRouter()

  const handleOrganizationName = (name: string) => {
    console.log("[OnboardingFlow] Organization name received:", name)
    console.log("[OnboardingFlow] Moving to company-info step")
    setOrganizationName(name)
    setCurrentStep("company-info")
  }

  const handleCompanyInfo = async (info: {
    companyOverview: string
    industry: string
    productService: string
  }) => {
    setCompanyInfo(info)
    // Now create the organization with all the collected data
    await createOrganization(organizationName, info)
  }

  const createOrganization = async (
    name: string,
    info: {
      companyOverview: string
      industry: string
      productService: string
    }
  ) => {
    setLoading(true)
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const response = await fetch(`${API_BASE_URL}/api/organizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          name,
          company_overview: info.companyOverview,
          industry: info.industry,
          product_service: info.productService,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create organization`)
      }

      const data = await response.json()
      console.log("Organization created:", data)
      
      // Store organization data for agent creation
      setOrganizationData({
        id: data.organization?.id || data.id,
        name
      })

      // Don't refresh user organization data yet to prevent redirect
      // We'll refresh after the entire onboarding is complete
      
      // Move to agent creation step
      setCurrentStep("agent-creation")
      
    } catch (error) {
      console.error("Failed to create organization:", error)
      toast.error((error as Error).message || "Failed to create organization")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinOrganization = () => {
    // This is handled in the OrganizationSetup component
    // User will see instructions to get an invite
  }

  const handleAgentCreated = () => {
    setCurrentStep("complete")
  }

  const handleComplete = async () => {
    // Refresh user organization data now that onboarding is complete
    await refreshUserOrganization()
    // Navigate to dashboard
    router.push("/dashboard")
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Failed to logout")
    }
  }

  return (
    <AnimatePresence mode="wait">
      {currentStep === "welcome" && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <WelcomeScreen onComplete={() => setCurrentStep("organization")} />
        </motion.div>
      )}

      {currentStep === "organization" && (
        <motion.div
          key="organization"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <OrganizationSetup
            onCreateOrganization={handleOrganizationName}
            onJoinOrganization={handleJoinOrganization}
            onLogout={handleLogout}
            loading={loading}
          />
        </motion.div>
      )}

      {currentStep === "company-info" && (
        <motion.div
          key="company-info"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CompanyInfoSetup
            organizationName={organizationName}
            onNext={handleCompanyInfo}
            onBack={() => setCurrentStep("organization")}
            loading={loading}
          />
        </motion.div>
      )}

      {currentStep === "agent-creation" && organizationData && (
        <motion.div
          key="agent-creation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AgentCreationWizard
            organizationId={organizationData.id}
            organizationName={organizationData.name}
            onComplete={handleAgentCreated}
            onBack={() => setCurrentStep("organization")}
          />
        </motion.div>
      )}

      {currentStep === "complete" && (
        <motion.div
          key="complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <OnboardingComplete
            organizationName={organizationData?.name || ""}
            onContinue={handleComplete}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}