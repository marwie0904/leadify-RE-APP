"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, Lightbulb, AlertCircle, ExternalLink, Mail, TrendingUp } from "lucide-react"
import { IssueReportModal } from "@/components/issue-report-modal"
import { FeatureRequestModal } from "@/components/feature-request-modal"
import { toast } from "sonner"

export default function HelpPage() {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false)

  const handleCardClick = (destination: string) => {
    switch (destination) {
      case '/guide':
        // Navigate to full guide - can be replaced with actual route
        window.open('https://docs.yourapp.com', '_blank')
        break
      case '/feature-request':
        // Open feature request modal
        setIsFeatureModalOpen(true)
        break
      case '/report-issue':
        // Open issue report modal
        setIsIssueModalOpen(true)
        break
      default:
        console.log(`Navigating to: ${destination}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-10 lg:px-12 lg:py-12 space-y-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Center</h1>
        <p className="text-gray-600">Get help with your AI agent and lead management system</p>
      </div>

      {/* Cards Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full Guide Card */}
        <Card 
          className="bg-white border-gray-200 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          onClick={() => handleCardClick('/guide')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="mt-4">Full Guide</CardTitle>
            <CardDescription>
              Complete documentation and tutorials for using the platform
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Feature Request Card */}
        <Card 
          className="bg-white border-gray-200 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          onClick={() => handleCardClick('/feature-request')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Lightbulb className="h-8 w-8 text-blue-600" />
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="mt-4">Request Feature</CardTitle>
            <CardDescription>
              Suggest new features and improvements - Help shape the future of our platform
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Report Issue Card */}
        <Card 
          className="bg-white border-gray-200 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          onClick={() => handleCardClick('/report-issue')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="mt-4">Report Issue</CardTitle>
            <CardDescription>
              Report a bug or technical issue - We'll respond within 24 hours
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto">
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Find answers to common questions about the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I create my first AI agent?</AccordionTrigger>
                <AccordionContent>
                  To create your first AI agent, navigate to the Agents page and click the "Create AI Agent" button. 
                  You'll need to provide a name, select a language, and optionally upload documents to train your agent. 
                  The agent will be ready to use once the setup is complete.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>What is BANT scoring and how does it work?</AccordionTrigger>
                <AccordionContent>
                  BANT scoring is a lead qualification framework that evaluates leads based on Budget, Authority, Need, 
                  and Timeline. Our AI agents automatically score leads during conversations based on the information 
                  gathered. You can customize the scoring weights and criteria in the agent configuration.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>How do I integrate with Facebook Messenger?</AccordionTrigger>
                <AccordionContent>
                  To integrate with Facebook Messenger, go to your agent's configuration page and click on the 
                  "Integrate Facebook" button. You'll be redirected to Facebook to authorize the connection. 
                  Once connected, your AI agent will automatically respond to messages on your Facebook page.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Can I customize the AI agent's responses?</AccordionTrigger>
                <AccordionContent>
                  Yes, you can customize your AI agent's behavior by uploading training documents and configuring 
                  the agent's language settings. The agent will use these documents as a knowledge base to provide 
                  more accurate and relevant responses to your customers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>How do I manage and assign leads to team members?</AccordionTrigger>
                <AccordionContent>
                  Navigate to the Leads page to view all your leads. You can filter leads by classification 
                  (cold, warm, hot, priority) and assign them to specific team members. Only administrators 
                  and moderators have permission to assign leads to agents.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>What are the different user roles and permissions?</AccordionTrigger>
                <AccordionContent>
                  The platform has three main roles: Admin (full access to all features), Moderator (can manage 
                  leads and agents but cannot change organization settings), and Member (can view leads and 
                  conversations but cannot make assignments). Your role is displayed in your profile settings.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>How do I export my leads data?</AccordionTrigger>
                <AccordionContent>
                  You can export your leads data from the Leads page by clicking the export button (when available). 
                  The data will be downloaded as a CSV file that you can open in Excel or Google Sheets. 
                  The export includes all lead information, BANT scores, and conversation history.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger>What should I do if my AI agent is not responding?</AccordionTrigger>
                <AccordionContent>
                  If your AI agent is not responding, first check the agent status on the Agents page. 
                  Ensure the status shows "ready". If the issue persists, try refreshing the page or 
                  checking your internet connection. You can also contact support for assistance.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Issue Report Modal */}
      <IssueReportModal 
        open={isIssueModalOpen} 
        onOpenChange={setIsIssueModalOpen} 
      />

      {/* Feature Request Modal */}
      <FeatureRequestModal 
        open={isFeatureModalOpen} 
        onOpenChange={setIsFeatureModalOpen} 
      />
    </div>
  )
}