"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Building2, 
  Users, 
  ArrowRight, 
  LogOut, 
  Sparkles, 
  CheckCircle2,
  Link2,
  UserPlus,
  Crown,
  Shield,
  Globe
} from 'lucide-react'
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OrganizationSetupProps {
  onCreateOrganization: (name: string) => void | Promise<void>
  onJoinOrganization: () => void
  onLogout: () => void
  loading?: boolean
}

export function OrganizationSetup({ 
  onCreateOrganization, 
  onJoinOrganization, 
  onLogout,
  loading = false 
}: OrganizationSetupProps) {
  const [organizationName, setOrganizationName] = useState("")
  const [hoveredCard, setHoveredCard] = useState<"create" | "join" | null>(null)
  const [showJoinMessage, setShowJoinMessage] = useState(false)

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationName.trim()) {
      toast.error("Please enter an organization name")
      return
    }
    await onCreateOrganization(organizationName.trim())
  }

  const handleJoinClick = () => {
    setShowJoinMessage(true)
    onJoinOrganization()
  }

  const orgFeatures = [
    { icon: Crown, label: "Admin Controls", color: "text-blue-600" },
    { icon: Shield, label: "Secure Data", color: "text-blue-500" },
    { icon: Globe, label: "Team Collaboration", color: "text-blue-400" }
  ]

  return (
    <AnimatePresence mode="wait">
      {showJoinMessage ? (
        <motion.div
          key="join-message"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-4 relative overflow-hidden"
        >
          {/* Animated background dots */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 bg-blue-400 rounded-full opacity-50"
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                  y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                  opacity: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: -100,
                  opacity: [null, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 2 + 1,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "linear",
                }}
              />
            ))}
          </div>
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <Card className="w-full max-w-md border-2 border-gray-300 shadow-2xl bg-white">
              <CardHeader className="text-center pb-6 relative z-10">
                <motion.div 
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 shadow-lg"
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <Link2 className="h-8 w-8 text-white" />
                </motion.div>
                <CardTitle className="text-2xl font-bold">Join an Organization</CardTitle>
                <CardDescription className="mt-2">
                  Request an invitation link from your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                  <p className="text-sm text-blue-900 mb-3">
                    To join an existing organization:
                  </p>
                  <ol className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold">1.</span>
                      Contact your organization admin or moderator
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold">2.</span>
                      Request an invitation link
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold">3.</span>
                      Click the link to join automatically
                    </li>
                  </ol>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  <span>Invitations are sent via email</span>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setShowJoinMessage(false)}
                >
                  Back to Options
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="main-setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white p-4 relative overflow-hidden"
        >
          {/* Animated background dots */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 bg-blue-400 rounded-full opacity-50"
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                  y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                  opacity: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: -100,
                  opacity: [null, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 2 + 1,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "linear",
                }}
              />
            ))}
          </div>
          <div className="w-full max-w-4xl space-y-8 relative z-10">
            {/* Animated Header */}
            <motion.div 
              className="text-center space-y-4"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div 
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500 shadow-2xl"
                animate={{ 
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <Building2 className="h-10 w-10 text-white" />
              </motion.div>
              
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                  Set Up Your Organization
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Create your workspace or join an existing team
                </p>
              </div>

              {/* Feature pills */}
              <motion.div 
                className="flex justify-center gap-3 pt-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                {orgFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md border-2 border-blue-200"
                  >
                    <feature.icon className={cn("h-4 w-4", feature.color)} />
                    <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Options Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Create Organization Card */}
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                onHoverStart={() => setHoveredCard("create")}
                onHoverEnd={() => setHoveredCard(null)}
              >
                <Card className={cn(
                  "relative overflow-hidden border-2 transition-all duration-300 bg-white",
                  hoveredCard === "create" ? "scale-105 shadow-2xl border-blue-500" : "shadow-xl border-gray-400"
                )}>
                  {/* Light blue background */}
                  <div className="absolute inset-0 bg-blue-50/30 -z-10" />
                  
                  {/* Sparkle animation */}
                  {hoveredCard === "create" && (
                    <motion.div
                      className="absolute top-4 right-4 z-20"
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Sparkles className="h-6 w-6 text-blue-400" />
                    </motion.div>
                  )}

                  <CardHeader className="relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 shadow-md">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">Create Organization</CardTitle>
                        <CardDescription className="text-gray-600">Step 1 of 2: Choose your organization name</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <form onSubmit={handleCreateOrganization} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="orgName" className="text-sm font-medium text-gray-700">
                          Organization Name
                        </Label>
                        <div className="relative">
                          <Input
                            id="orgName"
                            type="text"
                            placeholder="e.g., Acme Real Estate"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            required
                            disabled={loading}
                            className="pr-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                          />
                          {organizationName && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none"
                              style={{ marginTop: '-10px', marginRight: '5px' }}
                            >
                              <CheckCircle2 className="h-5 w-5 text-blue-500" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          You'll be the admin of this organization
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium" 
                        disabled={loading || !organizationName.trim()}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Next
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Join Organization Card */}
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                onHoverStart={() => setHoveredCard("join")}
                onHoverEnd={() => setHoveredCard(null)}
              >
                <Card className={cn(
                  "relative overflow-hidden border-2 transition-all duration-300 bg-white",
                  hoveredCard === "join" ? "scale-105 shadow-2xl border-blue-500" : "shadow-xl border-gray-400"
                )}>
                  {/* Light blue background */}
                  <div className="absolute inset-0 bg-blue-50/30 -z-10" />
                  
                  <CardHeader className="relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-400 shadow-md">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900">Join Organization</CardTitle>
                        <CardDescription className="text-gray-600">Connect with an existing team</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="space-y-4">
                      <div className="rounded-lg bg-blue-50 p-4 border border-blue-300">
                        <h4 className="font-medium text-sm mb-2 text-gray-900">
                          What you'll get:
                        </h4>
                        <ul className="space-y-1 text-sm text-gray-700">
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500" />
                            Access to team resources
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500" />
                            Collaborate with team members
                          </li>
                          <li className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500" />
                            Shared agents and conversations
                          </li>
                        </ul>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full border-2 border-blue-400 text-blue-600 hover:bg-blue-50 hover:border-blue-500 transition-colors font-medium" 
                        onClick={handleJoinClick}
                      >
                        Request Invitation
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Help text */}
            <motion.div 
              className="text-center text-sm text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p>Need help? Contact support or check our documentation for more information.</p>
            </motion.div>
          </div>

          {/* Logout Button */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}