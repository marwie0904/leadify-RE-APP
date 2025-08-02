"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createAgentSchema, type CreateAgentData } from "@/lib/validation/forms/agent"
import { CSRFInput } from "@/hooks/use-csrf"

interface CreateAgentModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    tone: string
    language: string
    openingMessage: string
    documents: File[]
  }) => Promise<any>
}

export function CreateAgentModal({ open, onClose, onSubmit }: CreateAgentModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  
  // Form with validation
  const form = useForm<CreateAgentData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      tone: "Professional",
      language: "English",
      openingMessage: "Hello! How can I help you today?",
      documents: [],
    },
  })

  const handleSubmit = async (data: CreateAgentData) => {
    console.log("Create Agent form submitted with data:", data)
    console.log("Files to upload:", files)

    setError(null)

    try {
      console.log("Validation passed, calling onSubmit...")

      await onSubmit({
        name: data.name,
        tone: data.tone,
        language: data.language,
        openingMessage: data.openingMessage,
        documents: files,
      })

      console.log("Agent creation successful!")

      // Reset form
      form.reset()
      setFiles([])
      onClose()
    } catch (error) {
      console.error("Failed to create AI agent:", error)
      setError(error instanceof Error ? error.message : "Failed to create AI agent")
    }
  }

  const handleClose = () => {
    if (!form.formState.isSubmitting) {
      form.reset()
      setFiles([])
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New AI Agent</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
          <CSRFInput />
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter agent name (e.g., Francis)"
                disabled={form.formState.isSubmitting}
                aria-invalid={!!form.formState.errors.name}
                aria-describedby={form.formState.errors.name ? "name-error" : undefined}
              />
              {form.formState.errors.name && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="name-error">
                    {form.formState.errors.name.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone *</Label>
              <Controller
                name="tone"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                  >
                    <SelectTrigger
                      aria-invalid={!!form.formState.errors.tone}
                      aria-describedby={form.formState.errors.tone ? "tone-error" : undefined}
                    >
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Friendly">Friendly</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.tone && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="tone-error">
                    {form.formState.errors.tone.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Controller
                name="language"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                  >
                    <SelectTrigger
                      aria-invalid={!!form.formState.errors.language}
                      aria-describedby={form.formState.errors.language ? "language-error" : undefined}
                    >
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Tagalog">Tagalog</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.language && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="language-error">
                    {form.formState.errors.language.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingMessage">Opening Message</Label>
              <Textarea
                id="openingMessage"
                {...form.register("openingMessage")}
                placeholder="e.g., Hello! How can I help you today?"
                rows={2}
                disabled={form.formState.isSubmitting}
                aria-invalid={!!form.formState.errors.openingMessage}
                aria-describedby={form.formState.errors.openingMessage ? "opening-message-error" : undefined}
              />
              {form.formState.errors.openingMessage && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription id="opening-message-error">
                    {form.formState.errors.openingMessage.message}
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-muted-foreground">
                This message will be sent automatically when a new conversation starts.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Knowledge Documents (Optional)</Label>
              <Controller
                name="documents"
                control={form.control}
                render={({ field: { onChange, value, ...field } }) => (
                  <FileUpload 
                    {...field}
                    files={files} 
                    onFilesChange={(newFiles) => {
                      setFiles(newFiles)
                      onChange(newFiles)
                    }} 
                    accept="application/pdf" 
                    multiple 
                    maxFiles={5} 
                  />
                )}
              />
              {form.formState.errors.documents && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.documents.message}
                  </AlertDescription>
                </Alert>
              )}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Upload up to 5 PDF files to provide knowledge for your AI agent. These documents will be used to
                  answer specific questions about your business.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating Agent..." : "Create AI Agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
