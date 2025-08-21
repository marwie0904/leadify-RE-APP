"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Info,
  Factory,
  Package,
  FileText
} from 'lucide-react'
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CompanyInfoSetupProps {
  organizationName: string
  onNext: (companyInfo: {
    companyOverview: string
    industry: string
    productService: string
  }) => void
  onBack: () => void
  loading?: boolean
}

export function CompanyInfoSetup({ 
  organizationName,
  onNext, 
  onBack,
  loading = false 
}: CompanyInfoSetupProps) {
  const [companyOverview, setCompanyOverview] = useState("")
  const [industry, setIndustry] = useState("")
  const [productService, setProductService] = useState("")
  const [touched, setTouched] = useState({
    companyOverview: false,
    industry: false,
    productService: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched for validation
    setTouched({
      companyOverview: true,
      industry: true,
      productService: true
    })

    // Validate all fields
    if (!companyOverview.trim() || companyOverview.trim().length < 20) {
      toast.error("Please provide a more detailed company overview (at least 20 characters)")
      return
    }
    if (!industry.trim()) {
      toast.error("Please specify your industry")
      return
    }
    if (!productService.trim() || productService.trim().length < 20) {
      toast.error("Please provide a more detailed description of your product/service (at least 20 characters)")
      return
    }

    // Pass data to parent
    onNext({
      companyOverview: companyOverview.trim(),
      industry: industry.trim(),
      productService: productService.trim()
    })
  }

  const handleFieldBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  return (
    <motion.div
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

      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Header */}
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Tell us about {organizationName}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              This information will help train your AI assistant
            </p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        >
          <Card className="border-2 border-gray-300 shadow-2xl bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-xl">Company Information</CardTitle>
                </div>
              </div>
              <CardDescription className="mt-2">
                Provide specific details to enhance your AI assistant's understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Overview Field */}
                <div className="space-y-2">
                  <Label htmlFor="companyOverview" className="flex items-center text-sm font-medium text-gray-700">
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    Company Overview
                  </Label>
                  <Textarea
                    id="companyOverview"
                    placeholder="Describe your company's mission, values, and what makes you unique..."
                    value={companyOverview}
                    onChange={(e) => setCompanyOverview(e.target.value)}
                    onBlur={() => handleFieldBlur('companyOverview')}
                    rows={4}
                    required
                    disabled={loading}
                    className={cn(
                      "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 resize-none",
                      touched.companyOverview && companyOverview.trim().length < 20 && "border-red-500"
                    )}
                  />
                  {touched.companyOverview && companyOverview.trim().length < 20 && (
                    <p className="text-xs text-red-500">Please provide at least 20 characters</p>
                  )}
                </div>

                {/* Industry Field */}
                <div className="space-y-2">
                  <Label htmlFor="industry" className="flex items-center text-sm font-medium text-gray-700">
                    <Factory className="h-4 w-4 mr-2 text-blue-500" />
                    Industry
                  </Label>
                  <Input
                    id="industry"
                    type="text"
                    placeholder="e.g., Real Estate, Technology, Healthcare, Retail..."
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    onBlur={() => handleFieldBlur('industry')}
                    required
                    disabled={loading}
                    className={cn(
                      "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500",
                      touched.industry && !industry.trim() && "border-red-500"
                    )}
                  />
                  {touched.industry && !industry.trim() && (
                    <p className="text-xs text-red-500">Industry is required</p>
                  )}
                </div>

                {/* Product/Service Field */}
                <div className="space-y-2">
                  <Label htmlFor="productService" className="flex items-center text-sm font-medium text-gray-700">
                    <Package className="h-4 w-4 mr-2 text-blue-500" />
                    What product/service do you sell?
                  </Label>
                  <Textarea
                    id="productService"
                    placeholder="Describe your main products or services, target customers, and value proposition..."
                    value={productService}
                    onChange={(e) => setProductService(e.target.value)}
                    onBlur={() => handleFieldBlur('productService')}
                    rows={4}
                    required
                    disabled={loading}
                    className={cn(
                      "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 resize-none",
                      touched.productService && productService.trim().length < 20 && "border-red-500"
                    )}
                  />
                  {touched.productService && productService.trim().length < 20 && (
                    <p className="text-xs text-red-500">Please provide at least 20 characters</p>
                  )}
                </div>

                {/* Important Note */}
                <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                  <div className="flex items-start space-x-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        Why we need this information
                      </p>
                      <p className="text-sm text-blue-700">
                        Please be very specific in filling out the above as this will be used to train your AI Assistant. 
                        The more detailed and accurate your information, the better your AI will understand and represent your business.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    disabled={loading}
                    className="flex items-center"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  
                  <Button 
                    type="submit" 
                    className="bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div 
          className="flex justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="h-2 w-2 rounded-full bg-blue-300" />
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <div className="h-2 w-2 rounded-full bg-blue-300" />
          <div className="h-2 w-2 rounded-full bg-blue-300" />
        </motion.div>
      </div>
    </motion.div>
  )
}