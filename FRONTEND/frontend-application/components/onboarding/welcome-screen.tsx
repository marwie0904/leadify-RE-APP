"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Building2, Sparkles, ChevronRight, Zap, Users, Target } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeScreenProps {
  onComplete: () => void
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showButton, setShowButton] = useState(false)

  const features = [
    {
      icon: Zap,
      title: "AI-Powered Conversations",
      description: "Intelligent chat agents that qualify leads automatically",
      bgColor: "bg-blue-100",
      iconBg: "bg-blue-500"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work together with your team in real-time",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-400"
    },
    {
      icon: Target,
      title: "Lead Qualification",
      description: "BANT scoring and intelligent lead management",
      bgColor: "bg-blue-100",
      iconBg: "bg-blue-600"
    }
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep < features.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        setShowButton(true)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [currentStep, features.length])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-blue-200/30"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
            }}
            animate={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl px-6 text-center">
        {/* Logo animation */}
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
            <div className="absolute inset-0 animate-pulse rounded-full bg-blue-400 blur-xl opacity-30" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-blue-500 shadow-2xl">
              <Building2 className="h-12 w-12 text-white" />
            </div>
            <motion.div
              className="absolute -right-2 -top-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <Sparkles className="h-6 w-6 text-blue-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">
            Welcome to Leadify
          </h1>
          <p className="text-xl text-gray-600">
            Your AI-powered real estate conversation platform
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="mb-12 grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{
                opacity: currentStep >= index ? 1 : 0.3,
                scale: currentStep >= index ? 1 : 0.8,
                y: currentStep >= index ? 0 : 20,
              }}
              transition={{
                delay: index * 0.2,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              className="relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-lg"
            >
              <div className={`absolute inset-0 ${feature.bgColor} opacity-30`} />
              <div className="relative z-10">
                <div className={`mb-4 inline-flex rounded-lg ${feature.iconBg} p-3`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
              {currentStep >= index && (
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Get Started button */}
        <AnimatePresence>
          {showButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Button
                onClick={onComplete}
                size="lg"
                className="group relative overflow-hidden bg-blue-500 px-8 py-6 text-lg font-semibold shadow-2xl transition-all hover:bg-blue-600 hover:scale-105 hover:shadow-blue-500/25"
              >
                <span className="relative z-10 flex items-center">
                  Get Started
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 flex justify-center space-x-2"
        >
          {features.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 w-2 rounded-full ${
                currentStep >= index ? "bg-blue-500" : "bg-gray-300"
              }`}
              animate={{
                scale: currentStep === index ? 1.5 : 1,
              }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  )
}