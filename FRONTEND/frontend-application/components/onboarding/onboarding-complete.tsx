"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Rocket,
  Building2,
  Bot,
  Users,
  ChartBar
} from "lucide-react"

interface OnboardingCompleteProps {
  organizationName: string
  onContinue: () => void
}

export function OnboardingComplete({ organizationName, onContinue }: OnboardingCompleteProps) {
  const features = [
    { icon: Bot, label: "AI Agent Ready", description: "Start conversations immediately" },
    { icon: Users, label: "Lead Management", description: "Track and qualify prospects" },
    { icon: ChartBar, label: "Analytics", description: "Monitor performance metrics" }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-white relative overflow-hidden">
      {/* Animated background */}
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

      <div className="relative z-10 max-w-4xl px-6 text-center">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 1,
          }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-green-500 blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl">
              <CheckCircle2 className="h-16 w-16 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Congratulations text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">
            Congratulations! 🎉
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            Your organization <span className="font-semibold text-gray-900">{organizationName}</span> is all set up
          </p>
          <p className="text-lg text-gray-600">
            Your AI agent is ready to start qualifying leads
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="mb-12 grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.5 + index * 0.1,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              className="relative overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-lg"
            >
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 p-3">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.label}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
              />
            </motion.div>
          ))}
        </div>

        {/* Action button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 200, damping: 20 }}
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 px-12 py-6 text-lg font-semibold text-white shadow-2xl transition-all hover:scale-105 hover:shadow-blue-500/25"
          >
            <span className="relative z-10 flex items-center">
              Go to Dashboard
              <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700"
              initial={{ x: "100%" }}
              whileHover={{ x: 0 }}
              transition={{ type: "tween", duration: 0.3 }}
            />
          </Button>
        </motion.div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 text-sm text-gray-600"
        >
          <p>You can always add more agents and team members from your dashboard</p>
        </motion.div>
      </div>
    </div>
  )
}