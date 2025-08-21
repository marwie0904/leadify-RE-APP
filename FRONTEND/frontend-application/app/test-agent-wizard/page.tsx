"use client"

import { AgentCreationWizard } from "@/components/onboarding/agent-creation-wizard"

export default function TestAgentWizardPage() {
  return (
    <AgentCreationWizard
      organizationId="test-org-id"
      organizationName="Test Organization"
      onComplete={() => console.log("Agent created!")}
      onBack={() => console.log("Back clicked")}
    />
  )
}