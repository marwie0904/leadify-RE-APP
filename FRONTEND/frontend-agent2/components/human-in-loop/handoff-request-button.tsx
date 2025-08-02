"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { requestHandoff } from "@/lib/api"
import { toast } from "sonner"
import type { HandoffRequestPayload, HandoffPriority } from "@/types/human-in-loop"

interface HandoffRequestButtonProps {
  conversationId: string
  disabled?: boolean
  onHandoffRequested?: () => void
  className?: string
}

export function HandoffRequestButton({
  conversationId,
  disabled = false,
  onHandoffRequested,
  className = ""
}: HandoffRequestButtonProps) {
  const { getAuthHeaders } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requested, setRequested] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [priority, setPriority] = useState<HandoffPriority>(1)
  const [reason, setReason] = useState("")

  const handleSubmit = async () => {
    // Show development message
    toast.info("This is under development")
    setOpen(false)
  }

  const resetForm = () => {
    setPriority(1)
    setReason("")
    setError(null)
    setRequested(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when dialog closes
      setTimeout(resetForm, 300)
    }
  }

  const getPriorityLabel = (priority: HandoffPriority) => {
    switch (priority) {
      case 1: return "Normal"
      case 2: return "High"
      case 3: return "Urgent"
      default: return "Normal"
    }
  }

  const getPriorityColor = (priority: HandoffPriority) => {
    switch (priority) {
      case 1: return "text-green-600"
      case 2: return "text-orange-600"
      case 3: return "text-red-600"
      default: return "text-green-600"
    }
  }

  if (requested) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        disabled 
        className={`${className} border-green-200 bg-green-50 text-green-700 hover:bg-green-50`}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Human Agent Requested
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || loading}
          className={`${className} border-blue-200 hover:bg-blue-50 hover:text-blue-700`}
        >
          <Users className="h-4 w-4 mr-2" />
          Handoff
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Human Agent</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {requested ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">Request Submitted!</h3>
              <p className="text-sm text-gray-600">
                A human agent will join this conversation shortly.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priority.toString()} onValueChange={(value) => setPriority(parseInt(value) as HandoffPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <span className="flex items-center">
                      <span className={`w-2 h-2 rounded-full bg-green-500 mr-2`}></span>
                      Normal - General inquiry
                    </span>
                  </SelectItem>
                  <SelectItem value="2">
                    <span className="flex items-center">
                      <span className={`w-2 h-2 rounded-full bg-orange-500 mr-2`}></span>
                      High - Urgent assistance needed
                    </span>
                  </SelectItem>
                  <SelectItem value="3">
                    <span className="flex items-center">
                      <span className={`w-2 h-2 rounded-full bg-red-500 mr-2`}></span>
                      Urgent - Critical issue
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selected: <span className={getPriorityColor(priority)}>{getPriorityLabel(priority)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Briefly describe why you need human assistance..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {reason.length}/500 characters
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Request Human Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}