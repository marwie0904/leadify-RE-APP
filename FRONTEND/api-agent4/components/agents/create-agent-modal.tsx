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
import { Info } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    name: "",
    tone: "Professional",
    language: "English",
    openingMessage: "Hello! How can I help you today?",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Create Agent form submitted with data:", formData)
    console.log("Files to upload:", files)

    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error("Agent name is required")
      }

      // Validate files (max 5 PDFs)
      if (files.length > 5) {
        throw new Error("Maximum 5 PDF files allowed")
      }

      for (const file of files) {
        if (file.type !== "application/pdf") {
          throw new Error(`File ${file.name} is not a PDF. Only PDF files are allowed.`)
        }
      }

      console.log("Validation passed, calling onSubmit...")

      await onSubmit({
        name: formData.name,
        tone: formData.tone,
        language: formData.language,
        openingMessage: formData.openingMessage,
        documents: files,
      })

      console.log("Agent creation successful!")

      // Reset form
      setFormData({
        name: "",
        tone: "Professional",
        language: "English",
        openingMessage: "Hello! How can I help you today?",
      })
      setFiles([])
      onClose()
    } catch (error) {
      console.error("Failed to create AI agent:", error)
      setError(error instanceof Error ? error.message : "Failed to create AI agent")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        tone: "Professional",
        language: "English",
        openingMessage: "Hello! How can I help you today?",
      })
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

        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter agent name (e.g., Francis)"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone *</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) => setFormData({ ...formData, tone: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Tagalog">Tagalog</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingMessage">Opening Message</Label>
              <Textarea
                id="openingMessage"
                value={formData.openingMessage}
                onChange={(e) => setFormData({ ...formData, openingMessage: e.target.value })}
                placeholder="e.g., Hello! How can I help you today?"
                rows={2}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent automatically when a new conversation starts.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Knowledge Documents (Optional)</Label>
              <FileUpload files={files} onFilesChange={setFiles} accept="application/pdf" multiple maxFiles={5} />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Upload up to 5 PDF files to provide knowledge for your AI agent. These documents will be used to
                  answer specific questions about your business.
                </AlertDescription>
              </Alert>
            </div>
          </form>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.name.trim()} onClick={handleSubmit}>
            {loading ? "Creating Agent..." : "Create AI Agent"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              console.log("Test button clicked!")
              console.log("Current form data:", formData)
              alert("Modal is responding to clicks!")
            }}
          >
            Test Click
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
